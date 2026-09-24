'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle,
  Lock,
  Activity,
  Sliders,
  Search,
  RotateCcw,
  EyeOff,
  Eye,
  AlertTriangle,
  Flame,
  Zap,
  Clock,
  UserX,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminAuditItemSkeleton } from '@/components/ui/skeleton';

interface AuditItem {
  _id: string;
  action: string;
  triggerReason: string;
  confidenceScore?: number;
  targetTag?: string;
  fingerprint: string;
  details?: string;
  metadata?: any;
  reversed: boolean;
  createdAt: string;
}

interface DeviceProfile {
  fingerprint: string;
  ipHash: string;
  associatedTags: string[];
  rawStrikes: number;
  effectiveStrikes: number;
  currentPenalty: 'none' | 'warning' | 'mute' | 'ban';
  penaltyExpiresAt?: string | null;
  isShadowBanned: boolean;
  isHardBanned: boolean;
  trustScore: number;
  strikeHistory: Array<{
    id: string;
    reason: string;
    score?: number;
    actionTaken: string;
    details?: string;
    timestamp: string;
  }>;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface SecurityConfigData {
  toxicityMuteThreshold: number;
  toxicityFlagThreshold: number;
  strikeDecayDays: number;
  muteDurationStrike2Hours: number;
  muteDurationStrike3Hours: number;
  banStrikeThreshold: number;
  burstMaxMessages: number;
  burstWindowSeconds: number;
  honeypotJoinDelaySeconds: number;
}

interface MetricsData {
  totalDevices: number;
  shadowBannedCount: number;
  hardBannedCount: number;
  activeMutesCount: number;
  dailyActionsCount: number;
  weeklyActionsCount: number;
  triggerBreakdown: Array<{ reason: string; count: number }>;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'review' | 'inspector' | 'config' | 'metrics' | 'legacy'>('feed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [feed, setFeed] = useState<AuditItem[]>([]);
  const [reviewQueue, setReviewQueue] = useState<AuditItem[]>([]);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<DeviceProfile | null>(null);
  const [config, setConfig] = useState<SecurityConfigData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  // Legacy data
  const [reports, setReports] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);

  const socketRef = useRef<any>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchAdminData = useCallback(async (pwd: string) => {
    setLoading(true);
    setError(null);
    try {
      const [feedRes, reviewRes, configRes, metricsRes, reportsRes, bannedRes] = await Promise.all([
        apiClient<{ success: boolean; feed: AuditItem[] }>('/api/admin/security/feed', {
          headers: { 'x-admin-password': pwd }
        }),
        apiClient<{ success: boolean; queue: AuditItem[] }>('/api/admin/security/review-queue', {
          headers: { 'x-admin-password': pwd }
        }),
        apiClient<{ success: boolean; config: SecurityConfigData }>('/api/admin/security/config', {
          headers: { 'x-admin-password': pwd }
        }),
        apiClient<{ success: boolean; metrics: MetricsData }>('/api/admin/security/metrics', {
          headers: { 'x-admin-password': pwd }
        }),
        apiClient<{ success: boolean; reports: any[] }>('/api/admin/reports', {
          headers: { 'x-admin-password': pwd }
        }),
        apiClient<{ success: boolean; bannedUsers: any[] }>('/api/admin/banned', {
          headers: { 'x-admin-password': pwd }
        })
      ]);

      if (feedRes.success) setFeed(feedRes.feed);
      if (reviewRes.success) setReviewQueue(reviewRes.queue);
      if (configRes.success) setConfig(configRes.config);
      if (metricsRes.success) setMetrics(metricsRes.metrics);
      if (reportsRes.success) setReports(reportsRes.reports);
      if (bannedRes.success) setBannedUsers(bannedRes.bannedUsers);

      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect to live admin socket channel
  useEffect(() => {
    if (!isAuthenticated) return;

    const s = getSocket();
    socketRef.current = s;

    s.emit('join-admin-channel', { password });

    const handleSecurityEvent = (event: any) => {
      setFeed((prev) => [
        {
          _id: Math.random().toString(),
          action: event.action,
          triggerReason: event.reason,
          confidenceScore: event.confidenceScore,
          targetTag: event.targetTag,
          fingerprint: event.fingerprint,
          details: event.details,
          reversed: false,
          createdAt: new Date(event.timestamp || Date.now()).toISOString()
        },
        ...prev
      ]);

      if (event.action === 'auto_flag') {
        setReviewQueue((prev) => [
          {
            _id: Math.random().toString(),
            action: 'auto_flag',
            triggerReason: event.reason,
            confidenceScore: event.confidenceScore,
            targetTag: event.targetTag,
            fingerprint: event.fingerprint,
            details: event.details,
            reversed: false,
            createdAt: new Date(event.timestamp || Date.now()).toISOString()
          },
          ...prev
        ]);
      }
    };

    s.on('security-event', handleSecurityEvent);

    return () => {
      s.off('security-event', handleSecurityEvent);
    };
  }, [isAuthenticated, password]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminData(password);
  };

  // 1-Click Action Override
  const handleOverride = async (
    fingerprint: string,
    action: 'unmute' | 'unban' | 'clear_strikes' | 'toggle_shadow_to_hard' | 'manual_ban'
  ) => {
    try {
      await apiClient('/api/admin/security/override', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: JSON.stringify({ fingerprint, action })
      });
      showSuccess(`Override executed: ${action}`);
      fetchAdminData(password);
      if (selectedDevice && selectedDevice.fingerprint === fingerprint) {
        handleInspectDevice(fingerprint);
      }
    } catch (err: any) {
      alert(err.message || 'Override failed');
    }
  };

  // Review Queue Decision
  const handleReviewDecision = async (logId: string, decision: 'dismiss' | 'strike') => {
    try {
      await apiClient('/api/admin/security/review-action', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: JSON.stringify({ logId, decision })
      });
      showSuccess(`Flagged item marked as ${decision}`);
      fetchAdminData(password);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  // Device Risk Lookup
  const handleInspectDevice = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient<{ success: boolean; device: DeviceProfile }>(
        `/api/admin/security/device/${encodeURIComponent(query.trim())}`,
        { headers: { 'x-admin-password': password } }
      );
      if (res.success) {
        setSelectedDevice(res.device);
      }
    } catch (err: any) {
      alert(err.message || 'Device not found');
    } finally {
      setLoading(false);
    }
  };

  // Save Threshold Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      const res = await apiClient<{ success: boolean; config: SecurityConfigData }>(
        '/api/admin/security/config',
        {
          method: 'PUT',
          headers: { 'x-admin-password': password },
          body: JSON.stringify(config)
        }
      );
      if (res.success) {
        setConfig(res.config);
        showSuccess('Thresholds updated live across all rooms');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save configuration');
    }
  };

  // Legacy manual ban/dismiss
  const handleLegacyBan = async (targetTag: string) => {
    try {
      await apiClient('/api/admin/ban', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: JSON.stringify({ targetTag })
      });
      fetchAdminData(password);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLegacyDismiss = async (reportId: string) => {
    try {
      await apiClient('/api/admin/dismiss', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: JSON.stringify({ reportId })
      });
      fetchAdminData(password);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLegacyUnban = async (targetTag: string) => {
    try {
      await apiClient('/api/admin/unban', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: JSON.stringify({ targetTag })
      });
      fetchAdminData(password);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md p-8 rounded-brutal-md border-4 border-border bg-card shadow-brutal-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-brutal-sm bg-primary/10 border-2 border-primary text-primary mb-1">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black font-mono uppercase tracking-tight">Security Command Center</h1>
            <p className="text-xs text-muted-foreground font-sans">
              Enter master credentials for real-time abuse oversight, overrides, and threshold tuning.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Master Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="font-mono text-sm"
              />
            </div>

            {error && (
              <div className="p-3 rounded-brutal-sm border-2 border-destructive bg-destructive/10 text-destructive text-xs font-mono">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full font-mono font-bold uppercase tracking-wider">
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-3 border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black font-mono uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              Security Command Center
            </h1>
            <Badge variant="live" className="gap-1.5 font-mono text-xs uppercase px-2.5 py-0.5">
              <span className="h-2 w-2 rounded-full bg-accent-coral animate-ping" />
              Live Automated Enforcement
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Real-time abuse detection, device reputation tracking, automated shadow-banning, and live override controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchAdminData(password)}
            variant="outline"
            size="sm"
            className="font-mono text-xs uppercase gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            onClick={() => setIsAuthenticated(false)}
            variant="ghost"
            size="sm"
            className="font-mono text-xs uppercase text-muted-foreground"
          >
            Lock
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-brutal-md border-2 border-primary bg-primary/10 text-primary font-mono text-xs font-bold flex items-center gap-2 animate-in fade-in-50">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b-2 border-border pb-3">
        <button
          onClick={() => setActiveTab('feed')}
          className={`px-3.5 py-1.5 rounded-brutal-sm font-mono text-xs uppercase font-bold transition-all flex items-center gap-2 ${
            activeTab === 'feed'
              ? 'bg-primary text-primary-foreground shadow-brutal-sm'
              : 'border-2 border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="h-3.5 w-3.5" /> Live Stream ({feed.length})
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`px-3.5 py-1.5 rounded-brutal-sm font-mono text-xs uppercase font-bold transition-all flex items-center gap-2 ${
            activeTab === 'review'
              ? 'bg-primary text-primary-foreground shadow-brutal-sm'
              : 'border-2 border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Review Queue
          {reviewQueue.length > 0 && (
            <span className="bg-accent-coral text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {reviewQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inspector')}
          className={`px-3.5 py-1.5 rounded-brutal-sm font-mono text-xs uppercase font-bold transition-all flex items-center gap-2 ${
            activeTab === 'inspector'
              ? 'bg-primary text-primary-foreground shadow-brutal-sm'
              : 'border-2 border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="h-3.5 w-3.5" /> Device Risk Inspector
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-3.5 py-1.5 rounded-brutal-sm font-mono text-xs uppercase font-bold transition-all flex items-center gap-2 ${
            activeTab === 'config'
              ? 'bg-primary text-primary-foreground shadow-brutal-sm'
              : 'border-2 border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" /> Threshold Tuner
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3.5 py-1.5 rounded-brutal-sm font-mono text-xs uppercase font-bold transition-all flex items-center gap-2 ${
            activeTab === 'metrics'
              ? 'bg-primary text-primary-foreground shadow-brutal-sm'
              : 'border-2 border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> Health &amp; Metrics
        </button>

        <button
          onClick={() => setActiveTab('legacy')}
          className={`px-3.5 py-1.5 rounded-brutal-sm font-mono text-xs uppercase font-bold transition-all flex items-center gap-2 ${
            activeTab === 'legacy'
              ? 'bg-primary text-primary-foreground shadow-brutal-sm'
              : 'border-2 border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Manual Reports ({reports.length})
        </button>
      </div>

      {/* TAB 1: LIVE ACTIVITY FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Automated Action Audit Stream
            </h2>
            <span className="text-xs font-mono text-muted-foreground">Showing latest {feed.length} events</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <AdminAuditItemSkeleton key={idx} />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="p-8 text-center rounded-brutal-md border-2 border-border bg-card font-mono text-xs text-muted-foreground">
              Zero automated enforcement events recorded yet. Rooms are currently quiet.
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map((item) => (
                <div
                  key={item._id}
                  className={`p-4 rounded-brutal-md border-2 bg-card transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    item.action === 'auto_shadow_ban' || item.action === 'auto_hard_ban'
                      ? 'border-destructive/80 shadow-brutal-coral'
                      : item.action === 'auto_mute'
                      ? 'border-accent-gold/80 shadow-brutal-sm'
                      : 'border-border'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          item.action.includes('ban')
                            ? 'live'
                            : item.action === 'auto_mute'
                            ? 'warning'
                            : 'outline'
                        }
                        className="font-mono text-[10px] uppercase font-bold"
                      >
                        {item.action.replace('_', ' ')}
                      </Badge>

                      <span className="font-mono text-xs font-bold text-foreground">
                        Trigger: <span className="text-primary">{item.triggerReason}</span>
                      </span>

                      {item.confidenceScore !== undefined && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          (Confidence: {(item.confidenceScore * 100).toFixed(0)}%)
                        </span>
                      )}

                      {item.targetTag && (
                        <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded border border-border">
                          Tag #{item.targetTag}
                        </span>
                      )}

                      <span className="font-mono text-[11px] text-muted-foreground">
                        FP: {item.fingerprint ? item.fingerprint.substring(0, 10) + '...' : 'unknown'}
                      </span>
                    </div>

                    {item.details && (
                      <p className="text-xs text-foreground/90 font-mono bg-secondary/40 p-2 rounded border border-border/50 max-w-3xl">
                        &quot;{item.details}&quot;
                      </p>
                    )}

                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(item.createdAt).toLocaleTimeString()} • {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* 1-Click Override Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => {
                        setDeviceSearchQuery(item.fingerprint);
                        setActiveTab('inspector');
                        handleInspectDevice(item.fingerprint);
                      }}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs uppercase"
                    >
                      Inspect Device
                    </Button>

                    {item.action === 'auto_mute' && (
                      <Button
                        onClick={() => handleOverride(item.fingerprint, 'unmute')}
                        size="sm"
                        className="font-mono text-xs uppercase bg-accent-gold text-black hover:bg-accent-gold/90"
                      >
                        Undo Mute
                      </Button>
                    )}

                    {item.action === 'auto_shadow_ban' && (
                      <Button
                        onClick={() => handleOverride(item.fingerprint, 'unban')}
                        size="sm"
                        className="font-mono text-xs uppercase bg-primary text-black hover:bg-primary/90"
                      >
                        Undo Ban
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REVIEW QUEUE (Borderline Cases & User Reports) */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent-gold" />
                Moderation Review Queue
              </h2>
              <p className="text-xs text-muted-foreground font-sans">
                Unified audit queue for user-submitted abuse reports and automated medium-confidence flags.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{reviewQueue.length} pending reviews</span>
          </div>

          {reviewQueue.length === 0 ? (
            <div className="p-8 text-center rounded-brutal-md border-2 border-border bg-card font-mono text-xs text-muted-foreground space-y-1">
              <CheckCircle className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-bold text-foreground">Review queue is empty.</p>
              <p>No user reports or ambiguous system flags pending review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewQueue.map((item) => {
                const isUserReport = item.action === 'user_report';
                return (
                  <div
                    key={item._id}
                    className={`p-5 rounded-brutal-md border-2 bg-card shadow-brutal-sm space-y-3 ${
                      isUserReport
                        ? 'border-accent-coral/60 shadow-brutal-coral'
                        : 'border-accent-gold/60 shadow-brutal-sm'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {isUserReport ? (
                          <Badge variant="destructive" className="font-mono text-[10px] uppercase font-bold">
                            USER-REPORTED
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="font-mono text-[10px] uppercase font-bold">
                            SYSTEM-FLAGGED
                          </Badge>
                        )}

                        <span className="font-mono text-xs uppercase font-bold text-foreground">
                          Reason: <span className="text-primary">{item.triggerReason.replace('_', ' ')}</span>
                        </span>

                        {!isUserReport && item.confidenceScore && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            Score: {(Number(item.confidenceScore) * 100).toFixed(0)}%
                          </span>
                        )}

                        {item.targetTag && (
                          <span className="font-mono text-xs text-foreground font-bold">
                            Target #{item.targetTag}
                          </span>
                        )}

                        {isUserReport && item.metadata?.reporterTag && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            By #{item.metadata.reporterTag}
                          </span>
                        )}

                        <span className="font-mono text-[11px] text-muted-foreground">
                          FP: {item.fingerprint.substring(0, 10)}...
                        </span>
                      </div>

                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-mono bg-secondary/50 p-3 rounded border border-border text-foreground">
                        {item.details}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <Button
                        onClick={() => {
                          setDeviceSearchQuery(item.fingerprint);
                          setActiveTab('inspector');
                          handleInspectDevice(item.fingerprint);
                        }}
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs uppercase gap-1.5"
                      >
                        <Search className="h-3.5 w-3.5" />
                        Inspect Device History
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleReviewDecision(item._id, 'dismiss')}
                          variant="outline"
                          size="sm"
                          className="font-mono text-xs uppercase"
                        >
                          Dismiss (False Positive)
                        </Button>
                        <Button
                          onClick={() => handleReviewDecision(item._id, 'strike')}
                          size="sm"
                          className="font-mono text-xs uppercase bg-destructive text-white hover:bg-destructive/90"
                        >
                          Enforce Strike &amp; Ban
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEVICE RISK INSPECTOR */}
      {activeTab === 'inspector' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Device Risk &amp; Combined Trust Inspector
            </h2>
            <p className="text-xs text-muted-foreground font-sans">
              Inspect device reputation across multiple sessions, view strike decay, and toggle between shadow and hard bans.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleInspectDevice(deviceSearchQuery);
              }}
              className="flex gap-2 pt-2 max-w-xl"
            >
              <Input
                value={deviceSearchQuery}
                onChange={(e) => setDeviceSearchQuery(e.target.value)}
                placeholder="Enter Device Fingerprint (SHA-256) or User Tag (#1042)..."
                className="font-mono text-xs"
              />
              <Button type="submit" disabled={loading} className="font-mono text-xs uppercase font-bold shrink-0">
                Inspect
              </Button>
            </form>
          </div>

          {selectedDevice && (
            <div className="p-6 rounded-brutal-md border-3 border-border bg-card shadow-brutal-lg space-y-6 animate-in fade-in-50">
              {/* Trust Score & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-border pb-4">
                <div>
                  <h3 className="font-mono font-black text-lg text-foreground flex items-center gap-2">
                    Device Profile
                    {selectedDevice.isHardBanned ? (
                      <Badge variant="destructive" className="font-mono text-[10px] uppercase">
                        Hard Banned
                      </Badge>
                    ) : selectedDevice.isShadowBanned ? (
                      <Badge variant="warning" className="font-mono text-[10px] uppercase">
                        Shadow Banned
                      </Badge>
                    ) : selectedDevice.currentPenalty === 'mute' ? (
                      <Badge variant="warning" className="font-mono text-[10px] uppercase">
                        Muted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono text-[10px] uppercase text-primary">
                        Clean
                      </Badge>
                    )}
                  </h3>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5 break-all">
                    Fingerprint: {selectedDevice.fingerprint}
                  </p>
                </div>

                {/* Combined Trust Meter */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono text-[10px] text-muted-foreground uppercase">Combined Trust Score</p>
                    <p
                      className={`font-mono text-2xl font-black ${
                        selectedDevice.trustScore >= 75
                          ? 'text-primary'
                          : selectedDevice.trustScore >= 40
                          ? 'text-accent-gold'
                          : 'text-destructive'
                      }`}
                    >
                      {selectedDevice.trustScore} / 100
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-border flex items-center justify-center font-mono text-xs font-bold bg-secondary">
                    {selectedDevice.trustScore}%
                  </div>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 rounded border border-border bg-secondary/30 space-y-1">
                  <span className="text-muted-foreground">Effective Strikes:</span>
                  <p className="text-base font-bold text-foreground">
                    {selectedDevice.effectiveStrikes} <span className="text-xs text-muted-foreground font-normal">(Raw: {selectedDevice.rawStrikes})</span>
                  </p>
                </div>

                <div className="p-3 rounded border border-border bg-secondary/30 space-y-1">
                  <span className="text-muted-foreground">Associated Tags:</span>
                  <p className="text-xs font-bold text-foreground truncate">
                    {selectedDevice.associatedTags.length > 0 ? selectedDevice.associatedTags.join(', ') : 'None'}
                  </p>
                </div>

                <div className="p-3 rounded border border-border bg-secondary/30 space-y-1">
                  <span className="text-muted-foreground">Hashed IP:</span>
                  <p className="text-xs font-bold text-foreground truncate">{selectedDevice.ipHash}</p>
                </div>

                <div className="p-3 rounded border border-border bg-secondary/30 space-y-1">
                  <span className="text-muted-foreground">Penalty Expiry:</span>
                  <p className="text-xs font-bold text-foreground truncate">
                    {selectedDevice.penaltyExpiresAt
                      ? new Date(selectedDevice.penaltyExpiresAt).toLocaleString()
                      : 'None / Permanent'}
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t-2 border-border">
                <Button
                  onClick={() =>
                    handleOverride(
                      selectedDevice.fingerprint,
                      selectedDevice.isHardBanned ? 'unban' : 'toggle_shadow_to_hard'
                    )
                  }
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs uppercase gap-1.5"
                >
                  {selectedDevice.isHardBanned ? (
                    <>
                      <Eye className="h-3.5 w-3.5 text-accent-gold" /> Switch to Shadow Ban
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5 text-destructive" /> Convert to Hard Ban
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleOverride(selectedDevice.fingerprint, 'unban')}
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs uppercase text-primary border-primary/50 hover:bg-primary/10"
                >
                  Remove All Bans
                </Button>

                <Button
                  onClick={() => handleOverride(selectedDevice.fingerprint, 'unmute')}
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs uppercase text-accent-gold border-accent-gold/50 hover:bg-accent-gold/10"
                >
                  Unmute Device
                </Button>

                <Button
                  onClick={() => handleOverride(selectedDevice.fingerprint, 'clear_strikes')}
                  size="sm"
                  variant="ghost"
                  className="font-mono text-xs uppercase text-muted-foreground hover:text-foreground"
                >
                  Reset All Strikes
                </Button>
              </div>

              {/* Strike History Log */}
              {selectedDevice.strikeHistory.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-mono font-bold text-xs uppercase text-muted-foreground">Strike &amp; Violation History</h4>
                  <div className="space-y-2">
                    {selectedDevice.strikeHistory.map((s, idx) => (
                      <div key={idx} className="p-3 rounded border border-border bg-secondary/20 text-xs font-mono flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground capitalize">{s.reason.replace('_', ' ')}</span>
                          <span className="text-muted-foreground ml-2">Action: {s.actionTaken}</span>
                          {s.details && <p className="text-[11px] text-muted-foreground mt-0.5">&quot;{s.details}&quot;</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(s.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Honest Limitation Notice */}
              <div className="p-4 rounded border-2 border-border/80 bg-secondary/20 space-y-1 text-xs text-muted-foreground font-sans">
                <p className="font-mono font-bold text-foreground text-[11px] uppercase flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-accent-gold" /> Device Fingerprint Reliability Note
                </p>
                <p className="text-[11px] leading-relaxed">
                  Browser fingerprinting provides high protection against cookie deletion and incognito reconnects on the same machine. However, users switching to a distinct device, alternate browser, or VPN tunnel will present a new signature. Trust scores reflect probabilistic consistency rather than an absolute hardware lock.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: THRESHOLD TUNER PANEL */}
      {activeTab === 'config' && config && (
        <form onSubmit={handleSaveConfig} className="space-y-6 max-w-3xl">
          <div className="space-y-1">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Dynamic Moderation Sensitivity Tuner
            </h2>
            <p className="text-xs text-muted-foreground font-sans">
              Adjust sensitivity thresholds in real time without code deployment. Changes apply instantly to running socket streams.
            </p>
          </div>

          <div className="p-6 rounded-brutal-md border-3 border-border bg-card shadow-brutal-lg space-y-6">
            {/* Toxicity Thresholds */}
            <div className="space-y-4 border-b border-border pb-5">
              <h3 className="font-mono font-bold text-xs uppercase text-foreground">1. Toxicity Scoring (0.0 to 1.0)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">Auto-Mute Threshold (Default: 0.80)</label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={config.toxicityMuteThreshold}
                    onChange={(e) => setConfig({ ...config, toxicityMuteThreshold: parseFloat(e.target.value) })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">Scores $\ge$ this trigger automatic mute/strike</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">Auto-Flag Threshold (Default: 0.50)</label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={config.toxicityFlagThreshold}
                    onChange={(e) => setConfig({ ...config, toxicityFlagThreshold: parseFloat(e.target.value) })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">Scores $\ge$ this queue for manual review</span>
                </div>
              </div>
            </div>

            {/* Strike Escalation & Decay */}
            <div className="space-y-4 border-b border-border pb-5">
              <h3 className="font-mono font-bold text-xs uppercase text-foreground">2. Strike Escalation &amp; Decay Windows</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">Strike Decay (Days)</label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={config.strikeDecayDays}
                    onChange={(e) => setConfig({ ...config, strikeDecayDays: parseInt(e.target.value) })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">Clean days needed to decay 1 strike</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">Strike 2 Mute (Hours)</label>
                  <Input
                    type="number"
                    min="0.5"
                    value={config.muteDurationStrike2Hours}
                    onChange={(e) => setConfig({ ...config, muteDurationStrike2Hours: parseFloat(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">Strike 3 Mute (Hours)</label>
                  <Input
                    type="number"
                    min="1"
                    value={config.muteDurationStrike3Hours}
                    onChange={(e) => setConfig({ ...config, muteDurationStrike3Hours: parseFloat(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Burst & Honeypot Limits */}
            <div className="space-y-4">
              <h3 className="font-mono font-bold text-xs uppercase text-foreground">3. Burst Spam &amp; Honeypot Detection</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">Burst Max Messages</label>
                  <Input
                    type="number"
                    min="1"
                    value={config.burstMaxMessages}
                    onChange={(e) => setConfig({ ...config, burstMaxMessages: parseInt(e.target.value) })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">Max rapid messages before mute</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">Burst Window (Sec)</label>
                  <Input
                    type="number"
                    min="1"
                    value={config.burstWindowSeconds}
                    onChange={(e) => setConfig({ ...config, burstWindowSeconds: parseInt(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">Honeypot Join Delay (Sec)</label>
                  <Input
                    type="number"
                    min="1"
                    value={config.honeypotJoinDelaySeconds}
                    onChange={(e) => setConfig({ ...config, honeypotJoinDelaySeconds: parseInt(e.target.value) })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">Links posted faster trigger mute</span>
                </div>
              </div>
            </div>

            <Button type="submit" className="font-mono font-bold uppercase tracking-wider text-xs gap-2">
              Save Configuration Live
            </Button>
          </div>
        </form>
      )}

      {/* TAB 5: HEALTH & METRICS SUMMARY */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Automated Moderation Health &amp; Activity
            </h2>
            <p className="text-xs text-muted-foreground font-sans">
              Summary statistics of automatic enforcement actions and device reputation distribution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
              <span className="font-mono text-xs uppercase text-muted-foreground">Total Monitored Devices</span>
              <p className="font-mono text-3xl font-black text-foreground mt-2">{metrics.totalDevices}</p>
            </div>

            <div className="p-5 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
              <span className="font-mono text-xs uppercase text-muted-foreground">Active Shadow Bans</span>
              <p className="font-mono text-3xl font-black text-accent-gold mt-2">{metrics.shadowBannedCount}</p>
              <span className="text-[11px] font-mono text-muted-foreground">Silent suppression active</span>
            </div>

            <div className="p-5 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
              <span className="font-mono text-xs uppercase text-muted-foreground">Active Hard Bans</span>
              <p className="font-mono text-3xl font-black text-destructive mt-2">{metrics.hardBannedCount}</p>
              <span className="text-[11px] font-mono text-muted-foreground">Disconnected at socket</span>
            </div>

            <div className="p-5 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
              <span className="font-mono text-xs uppercase text-muted-foreground">Active Device Mutes</span>
              <p className="font-mono text-3xl font-black text-primary mt-2">{metrics.activeMutesCount}</p>
            </div>

            <div className="p-5 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
              <span className="font-mono text-xs uppercase text-muted-foreground">Auto Actions (Last 24h)</span>
              <p className="font-mono text-3xl font-black text-foreground mt-2">{metrics.dailyActionsCount}</p>
            </div>

            <div className="p-5 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark">
              <span className="font-mono text-xs uppercase text-muted-foreground">Auto Actions (Last 7d)</span>
              <p className="font-mono text-3xl font-black text-foreground mt-2">{metrics.weeklyActionsCount}</p>
            </div>
          </div>

          {/* Trigger Breakdown */}
          {metrics.triggerBreakdown.length > 0 && (
            <div className="p-6 rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark space-y-4">
              <h3 className="font-mono font-bold text-xs uppercase text-foreground">Top Trigger Reasons (Last 7 Days)</h3>
              <div className="space-y-3">
                {metrics.triggerBreakdown.map((t) => (
                  <div key={t.reason} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-bold capitalize">{t.reason.replace('_', ' ')}</span>
                      <span>{t.count} incidents</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min(100, (t.count / Math.max(1, metrics.weeklyActionsCount)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: LEGACY MANUAL REPORTS & BANS */}
      {activeTab === 'legacy' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Manual Community User Reports ({reports.length})
            </h2>

            {reports.length === 0 ? (
              <div className="p-6 text-center rounded-brutal-md border-2 border-border bg-card font-mono text-xs text-muted-foreground">
                No pending manual reports.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div
                    key={rep._id}
                    className="p-4 rounded-brutal-md border-2 border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 font-mono text-xs">
                      <p className="font-bold text-foreground">
                        Reported: <span className="text-destructive font-black">Tag #{rep.reportedTag}</span>
                      </p>
                      <p className="text-muted-foreground">Reporter: Tag #{rep.reporterTag}</p>
                      <p className="text-foreground/90 bg-secondary/40 p-2 rounded">&quot;{rep.reason}&quot;</p>
                      <span className="text-[10px] text-muted-foreground">{new Date(rep.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => handleLegacyBan(rep.reportedTag)}
                        size="sm"
                        className="font-mono text-xs uppercase bg-destructive text-white hover:bg-destructive/90"
                      >
                        Ban Tag
                      </Button>
                      <Button
                        onClick={() => handleLegacyDismiss(rep._id)}
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs uppercase"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t-2 border-border">
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              Banned User Accounts ({bannedUsers.length})
            </h2>

            {bannedUsers.length === 0 ? (
              <div className="p-6 text-center rounded-brutal-md border-2 border-border bg-card font-mono text-xs text-muted-foreground">
                No banned tags in database.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {bannedUsers.map((u) => (
                  <div
                    key={u.tag}
                    className="p-3.5 rounded-brutal-sm border-2 border-destructive/60 bg-card flex items-center justify-between"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-foreground">Tag #{u.tag}</p>
                      <p className="font-sans text-[11px] text-muted-foreground">{u.handle}</p>
                    </div>
                    <Button
                      onClick={() => handleLegacyUnban(u.tag)}
                      variant="outline"
                      size="sm"
                      className="font-mono text-[10px] uppercase text-primary border-primary/50"
                    >
                      Unban
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
