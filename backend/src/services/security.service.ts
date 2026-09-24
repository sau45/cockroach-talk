import crypto from 'crypto';
import { Server } from 'socket.io';
import { DeviceSecurity, IDeviceSecurity } from '../models/DeviceSecurity.js';
import { SecurityConfig, ISecurityConfig } from '../models/SecurityConfig.js';
import { AuditLog } from '../models/AuditLog.js';
import { Report, ReportCategory } from '../models/Report.js';

export interface EvaluationResult {
  allowed: boolean;
  isShadowBanned: boolean;
  actionTaken?: 'none' | 'warning' | 'mute' | 'shadow_ban' | 'hard_ban' | 'flagged';
  reason?: 'toxicity' | 'burst_flood' | 'duplicate_spam' | 'honeypot_link' | 'admin_manual';
  score?: number;
  message?: string;
  flaggedForReview?: boolean;
}

interface MessageHistoryItem {
  text: string;
  timestamp: number;
  roomId: string;
}

class SecurityService {
  private io: Server | null = null;
  private configCache: ISecurityConfig | null = null;
  private messageBuffer = new Map<string, MessageHistoryItem[]>();

  public setSocketServer(io: Server) {
    this.io = io;
  }

  /**
   * Hashes client IP for privacy preservation.
   */
  public hashIP(ip: string): string {
    return crypto.createHash('sha256').update(ip || '127.0.0.1').digest('hex').substring(0, 32);
  }

  /**
   * Fetch dynamic security configuration with in-memory caching.
   */
  public async getConfig(): Promise<ISecurityConfig> {
    if (this.configCache) {
      return this.configCache;
    }

    let config = await SecurityConfig.findOne({ configKey: 'global' });
    if (!config) {
      config = await SecurityConfig.create({
        configKey: 'global',
        toxicityMuteThreshold: 0.80,
        toxicityFlagThreshold: 0.50,
        strikeDecayDays: 30,
        muteDurationStrike2Hours: 1,
        muteDurationStrike3Hours: 24,
        banStrikeThreshold: 4,
        burstMaxMessages: 3,
        burstWindowSeconds: 2,
        honeypotJoinDelaySeconds: 10
      });
    }

    this.configCache = config;
    return config;
  }

  /**
   * Update security configuration live.
   */
  public async updateConfig(updates: Partial<ISecurityConfig>): Promise<ISecurityConfig> {
    const config = await SecurityConfig.findOneAndUpdate(
      { configKey: 'global' },
      { $set: updates },
      { new: true, upsert: true }
    );
    this.configCache = config;

    // Log threshold update
    await AuditLog.create({
      action: 'threshold_update',
      triggerReason: 'admin_manual',
      fingerprint: 'system',
      details: 'Admin updated moderation sensitivity thresholds',
      metadata: updates
    });

    if (this.io) {
      this.io.to('admin-channel').emit('security-config-updated', config);
    }

    return config;
  }

  /**
   * Look up or register a device, calculating strike decay, penalties, and trust score.
   */
  public async getOrCreateDevice(
    fingerprint: string,
    ip: string,
    tag?: string,
    sessionToken?: string
  ): Promise<IDeviceSecurity> {
    const ipHash = this.hashIP(ip);
    const config = await this.getConfig();
    const now = new Date();

    let device = await DeviceSecurity.findOne({ fingerprint });

    if (!device) {
      device = new DeviceSecurity({
        fingerprint,
        ipHash,
        associatedTags: tag ? [tag] : [],
        associatedSessions: sessionToken ? [sessionToken] : [],
        rawStrikes: 0,
        effectiveStrikes: 0,
        currentPenalty: 'none',
        isShadowBanned: false,
        isHardBanned: false,
        trustScore: 100,
        firstSeenAt: now,
        lastSeenAt: now
      });
    } else {
      device.lastSeenAt = now;
      if (ipHash && !device.ipHash) device.ipHash = ipHash;
      if (tag && !device.associatedTags.includes(tag)) {
        device.associatedTags.push(tag);
      }
      if (sessionToken && !device.associatedSessions.includes(sessionToken)) {
        device.associatedSessions.push(sessionToken);
      }

      // 1. Strike Decay Logic:
      // For every decay window (e.g. 30 days) of clean behavior since last strike, decay 1 strike.
      if (device.rawStrikes > 0 && device.lastStrikeAt) {
        const elapsedDays = (now.getTime() - new Date(device.lastStrikeAt).getTime()) / (1000 * 60 * 60 * 24);
        const decayDays = config.strikeDecayDays || 30;
        const strikesToDecay = Math.floor(elapsedDays / decayDays);
        device.effectiveStrikes = Math.max(0, device.rawStrikes - strikesToDecay);
      } else {
        device.effectiveStrikes = device.rawStrikes;
      }

      // 2. Penalty Expiration Check:
      if (device.penaltyExpiresAt && now.getTime() > new Date(device.penaltyExpiresAt).getTime()) {
        if (!device.isHardBanned) {
          device.currentPenalty = 'none';
          device.penaltyExpiresAt = null;
          device.isShadowBanned = false;
        }
      }
    }

    // 3. Combined Trust & Risk Score (0-100):
    let score = 100;
    // Deduct 25 points per active strike
    score -= device.effectiveStrikes * 25;

    // Deduct for active penalties
    if (device.isHardBanned) score = 0;
    else if (device.isShadowBanned) score = Math.min(score, 20);
    else if (device.currentPenalty === 'mute') score = Math.min(score, 40);
    else if (device.currentPenalty === 'warning') score = Math.min(score, 70);

    // Cookie/session check: tag churn penalty
    if (device.associatedTags.length > 3) {
      score -= (device.associatedTags.length - 3) * 5;
    }

    device.trustScore = Math.max(0, Math.min(100, score));
    await device.save();
    return device;
  }

  private lastPerspectiveCallTime = 0;
  private perspectiveQueueLength = 0;

  /**
   * Hybrid Toxicity Evaluation:
   * Uses Google Perspective API if configured, respecting a strict 1-QPS rate limit
   * with fail-open timeout handling. Falls back to built-in multi-vector linguistic analyzer.
   */
  public async scoreToxicity(text: string): Promise<number> {
    if (!text || text.trim().length === 0) return 0.0;

    const apiKey = process.env.PERSPECTIVE_API_KEY;
    if (apiKey) {
      try {
        const perspectiveScore = await this.enqueuePerspectiveScoring(text, apiKey);
        if (perspectiveScore !== null) {
          return perspectiveScore;
        }
      } catch (err) {
        console.warn('[Perspective API Error, failing open to local scorer]:', err);
      }
    }

    // Built-in Multi-Vector Linguistic Analyzer:
    return this.evaluateLocalToxicity(text);
  }

  /**
   * Enqueues Perspective API calls to strictly respect the 1 QPS default quota.
   * Fails open gracefully if queue is backed up or request times out (>2.5s).
   */
  private async enqueuePerspectiveScoring(text: string, apiKey: string): Promise<number | null> {
    if (this.perspectiveQueueLength >= 5) {
      console.warn('[Perspective API queue busy (>5 pending), failing open to local scorer]');
      return null;
    }

    this.perspectiveQueueLength++;
    try {
      const now = Date.now();
      const elapsedSinceLastCall = now - this.lastPerspectiveCallTime;
      const waitTime = Math.max(0, 1000 - elapsedSinceLastCall);

      if (waitTime > 0) {
        await new Promise((res) => setTimeout(res, waitTime));
      }

      this.lastPerspectiveCallTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            comment: { text },
            languages: ['en'],
            requestedAttributes: {
              TOXICITY: {},
              SEVERE_TOXICITY: {},
              IDENTITY_ATTACK: {},
              INSULT: {},
              THREAT: {}
            }
          })
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();
        const tox = data.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
        const sev = data.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value ?? 0;
        const idAtk = data.attributeScores?.IDENTITY_ATTACK?.summaryScore?.value ?? 0;
        const ins = data.attributeScores?.INSULT?.summaryScore?.value ?? 0;
        const thr = data.attributeScores?.THREAT?.summaryScore?.value ?? 0;
        return Math.max(tox, sev, idAtk, ins, thr);
      } else {
        const errText = await response.text();
        console.warn(`[Perspective API returned HTTP ${response.status}]:`, errText);
        return null;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('[Perspective API call timed out (>2.5s), failing open]');
      } else {
        console.warn('[Perspective API call failed]:', err.message);
      }
      return null;
    } finally {
      this.perspectiveQueueLength = Math.max(0, this.perspectiveQueueLength - 1);
    }
  }

  /**
   * Built-in linguistic toxicity analyzer (evaluates insults, severe slurs, threats, leetspeak, screaming).
   */
  private evaluateLocalToxicity(text: string): number {
    const normalized = text.toLowerCase();
    let score = 0.0;

    // 1. Severe violent threats & self-harm incitement (Score: 0.88 - 0.98)
    const severePatterns = [
      /\b(kill yourself|kys|go die|slit your|die in a fire|hang yourself)\b/i,
      /\b(i will (kill|murder|hunt|shoot|stab) you)\b/i,
      /\b(rape you|bomb|terrorist|gas chamber)\b/i
    ];
    for (const pat of severePatterns) {
      if (pat.test(normalized)) {
        return 0.95;
      }
    }

    // 2. Severe slurs / hate speech (Score: 0.85 - 0.95)
    const hatePatterns = [
      /\b(nigg(er|a)|faggot|kike|chink|gook|paki|spic|tranny)\b/i,
      /\b(subhuman|scum of the earth|worthless piece of shit)\b/i
    ];
    for (const pat of hatePatterns) {
      if (pat.test(normalized)) {
        return 0.90;
      }
    }

    // 3. Insults & abusive harassment (Score: 0.55 - 0.78)
    const insultKeywords = [
      'bitch', 'asshole', 'bastard', 'cunt', 'dickhead', 'motherfucker',
      'whore', 'slut', 'idiot', 'retard', 'moron', 'loser', 'stfu', 'fucker'
    ];
    let insultCount = 0;
    for (const kw of insultKeywords) {
      if (normalized.includes(kw)) insultCount++;
    }

    if (insultCount >= 3) score += 0.82;
    else if (insultCount === 2) score += 0.72;
    else if (insultCount === 1) score += 0.58;

    // 4. Leetspeak / evasive substitution patterns (e.g. b!tch, f*ck, sh!t)
    const obfuscated = /\b(f[\*\.\_\@]ck|sh[\!\*\.\@]t|b[\!\*]tch|a\$\$hole|d[\*\!]ck)\b/i;
    if (obfuscated.test(text)) {
      score = Math.max(score, 0.75);
    }

    // 5. Aggressive uppercase shouting + repetitive punctuation
    if (text.length > 10 && text === text.toUpperCase() && /[A-Z]{5,}/.test(text)) {
      score += 0.15;
    }
    if (/[\!\?]{4,}/.test(text)) {
      score += 0.10;
    }

    return Math.min(1.0, score);
  }

  /**
   * Evaluates spam, flood bursts, and honeypot patterns.
   */
  private checkSpamPatterns(
    fingerprint: string,
    text: string,
    roomId: string,
    joinTimestamp?: number,
    config?: ISecurityConfig
  ): 'burst_flood' | 'duplicate_spam' | 'honeypot_link' | null {
    const now = Date.now();
    const history = this.messageBuffer.get(fingerprint) || [];
    const trimmed = text.trim();

    // 1. Honeypot check: Link posted within X seconds of joining room
    const hasLink = /(https?:\/\/[^\s]+|www\.[^\s]+|\b\w+\.(com|org|net|xyz|me|t\.me)\b)/i.test(trimmed);
    const honeypotDelay = (config?.honeypotJoinDelaySeconds || 10) * 1000;
    if (hasLink && joinTimestamp && now - joinTimestamp < honeypotDelay) {
      return 'honeypot_link';
    }

    // 2. Burst rate limiting: > burstMaxMessages in burstWindowSeconds
    const burstWindow = (config?.burstWindowSeconds || 2) * 1000;
    const burstMax = config?.burstMaxMessages || 3;
    const recentBurst = history.filter((m) => now - m.timestamp < burstWindow);
    if (recentBurst.length >= burstMax) {
      return 'burst_flood';
    }

    // 3. Duplicate spam check: identical message repeated within 30 seconds
    const duplicate = history.find(
      (m) => m.text.toLowerCase() === trimmed.toLowerCase() && now - m.timestamp < 30000
    );
    if (duplicate) {
      return 'duplicate_spam';
    }

    // Append to sliding history buffer (keep last 15 items)
    history.push({ text: trimmed, timestamp: now, roomId });
    if (history.length > 15) history.shift();
    this.messageBuffer.set(fingerprint, history);

    return null;
  }

  /**
   * Main real-time automated evaluation pipeline:
   * Inspects message for penalty status, spam patterns, and toxicity.
   * Auto-enforces warnings, mutes, and shadow-bans.
   */
  public async evaluateMessage(params: {
    fingerprint: string;
    ip: string;
    tag?: string;
    text: string;
    roomId: string;
    joinTimestamp?: number;
  }): Promise<EvaluationResult> {
    const { fingerprint, ip, tag, text, roomId, joinTimestamp } = params;
    const device = await this.getOrCreateDevice(fingerprint, ip, tag);
    const config = await this.getConfig();

    // 1. Existing Active Penalty Enforcement
    if (device.isHardBanned) {
      return {
        allowed: false,
        isShadowBanned: false,
        actionTaken: 'hard_ban',
        message: 'Your device is permanently banned from CockroachTalk.'
      };
    }

    if (device.currentPenalty === 'mute') {
      const remainingMs = device.penaltyExpiresAt ? new Date(device.penaltyExpiresAt).getTime() - Date.now() : 0;
      const remainingMins = Math.max(1, Math.ceil(remainingMs / 60000));
      return {
        allowed: false,
        isShadowBanned: device.isShadowBanned,
        actionTaken: 'mute',
        message: `Your device is temporarily muted for abusive behavior (${remainingMins}m remaining).`
      };
    }

    // 2. Check Spam / Honeypot Patterns
    const spamViolation = this.checkSpamPatterns(fingerprint, text, roomId, joinTimestamp, config);
    if (spamViolation) {
      const penaltyResult = await this.applyAutomaticViolation(device, spamViolation, 1.0, text, tag);
      return {
        allowed: false,
        isShadowBanned: penaltyResult.isShadowBanned,
        actionTaken: penaltyResult.actionTaken,
        reason: spamViolation,
        message: 'Message blocked by automated abuse detection system.'
      };
    }

    // 3. Toxicity Evaluation
    const toxicityScore = await this.scoreToxicity(text);

    // High confidence toxicity -> Auto-enforce strike & mute
    if (toxicityScore >= config.toxicityMuteThreshold) {
      const penaltyResult = await this.applyAutomaticViolation(device, 'toxicity', toxicityScore, text, tag);
      return {
        allowed: false,
        isShadowBanned: penaltyResult.isShadowBanned,
        actionTaken: penaltyResult.actionTaken,
        reason: 'toxicity',
        score: toxicityScore,
        message: 'Message removed for violating harassment and decency standards.'
      };
    }

    // Medium confidence toxicity -> Auto-flag for admin review queue
    if (toxicityScore >= config.toxicityFlagThreshold) {
      await AuditLog.create({
        action: 'auto_flag',
        triggerReason: 'toxicity',
        confidenceScore: toxicityScore,
        targetTag: tag,
        fingerprint,
        ipHash: device.ipHash,
        details: text.substring(0, 300)
      });

      if (this.io) {
        this.io.to('admin-channel').emit('security-event', {
          action: 'auto_flag',
          reason: 'toxicity',
          confidenceScore: toxicityScore,
          targetTag: tag,
          fingerprint: fingerprint.substring(0, 10),
          details: text.substring(0, 100),
          timestamp: Date.now()
        });
      }

      return {
        allowed: true,
        isShadowBanned: device.isShadowBanned,
        flaggedForReview: true,
        score: toxicityScore
      };
    }

    // Clean message
    return {
      allowed: true,
      isShadowBanned: device.isShadowBanned,
      score: toxicityScore
    };
  }

  /**
   * Applies automatic strike escalation:
   * 1st strike = Warning
   * 2nd strike = 1-hour mute
   * 3rd strike = 24-hour mute
   * 4th+ strike = Auto Shadow-Ban
   */
  private async applyAutomaticViolation(
    device: IDeviceSecurity,
    reason: 'toxicity' | 'burst_flood' | 'duplicate_spam' | 'honeypot_link',
    score: number,
    sampleText: string,
    tag?: string
  ): Promise<{ actionTaken: 'warning' | 'mute' | 'shadow_ban'; isShadowBanned: boolean }> {
    const config = await this.getConfig();
    const now = new Date();

    device.rawStrikes += 1;
    device.effectiveStrikes += 1;
    device.lastStrikeAt = now;

    let actionTaken: 'warning' | 'mute' | 'shadow_ban' = 'warning';
    let durationHours = 0;

    if (device.effectiveStrikes >= config.banStrikeThreshold) {
      // 4th+ strike: Auto Shadow-Ban
      device.currentPenalty = 'ban';
      device.isShadowBanned = true;
      actionTaken = 'shadow_ban';
      // Default shadow-ban expiration: 7 days unless extended
      device.penaltyExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (device.effectiveStrikes === 3) {
      // 3rd strike: 24h Mute
      device.currentPenalty = 'mute';
      durationHours = config.muteDurationStrike3Hours || 24;
      device.penaltyExpiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
      actionTaken = 'mute';
    } else if (device.effectiveStrikes === 2) {
      // 2nd strike: 1h Mute
      device.currentPenalty = 'mute';
      durationHours = config.muteDurationStrike2Hours || 1;
      device.penaltyExpiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
      actionTaken = 'mute';
    } else {
      // 1st strike: Warning
      device.currentPenalty = 'warning';
      actionTaken = 'warning';
    }

    const strikeLog = {
      id: crypto.randomUUID(),
      reason,
      score,
      actionTaken,
      details: sampleText.substring(0, 200),
      timestamp: now
    };
    device.strikeHistory.push(strikeLog);

    // Recalculate trust score
    device.trustScore = Math.max(0, 100 - device.effectiveStrikes * 25);
    await device.save();

    // Record immutable audit entry
    const auditAction =
      actionTaken === 'shadow_ban'
        ? 'auto_shadow_ban'
        : actionTaken === 'mute'
        ? 'auto_mute'
        : 'auto_warn';

    await AuditLog.create({
      action: auditAction,
      triggerReason: reason,
      confidenceScore: score,
      targetTag: tag,
      fingerprint: device.fingerprint,
      ipHash: device.ipHash,
      details: sampleText.substring(0, 300),
      metadata: { strikeCount: device.effectiveStrikes, durationHours }
    });

    // Real-time broadcast to admin live activity feed
    if (this.io) {
      this.io.to('admin-channel').emit('security-event', {
        action: auditAction,
        reason,
        confidenceScore: score,
        targetTag: tag,
        fingerprint: device.fingerprint.substring(0, 10),
        strikeCount: device.effectiveStrikes,
        details: sampleText.substring(0, 100),
        timestamp: Date.now()
      });
    }

    return { actionTaken, isShadowBanned: device.isShadowBanned };
  }

  /**
   * Admin Overrides
   */
  public async overrideAction(params: {
    fingerprint: string;
    action: 'unmute' | 'unban' | 'clear_strikes' | 'toggle_shadow_to_hard' | 'manual_ban';
    adminNote?: string;
  }): Promise<IDeviceSecurity | null> {
    const { fingerprint, action, adminNote } = params;
    const device = await DeviceSecurity.findOne({ fingerprint });
    if (!device) return null;

    if (action === 'unmute') {
      device.currentPenalty = 'none';
      device.penaltyExpiresAt = null;
      await AuditLog.create({
        action: 'override_unmute',
        triggerReason: 'admin_manual',
        fingerprint,
        details: adminNote || 'Admin manually unmuted device'
      });
    } else if (action === 'unban') {
      device.currentPenalty = 'none';
      device.isShadowBanned = false;
      device.isHardBanned = false;
      device.penaltyExpiresAt = null;
      await AuditLog.create({
        action: 'override_unban',
        triggerReason: 'admin_manual',
        fingerprint,
        details: adminNote || 'Admin manually removed ban'
      });
    } else if (action === 'clear_strikes') {
      device.rawStrikes = 0;
      device.effectiveStrikes = 0;
      device.currentPenalty = 'none';
      device.penaltyExpiresAt = null;
      device.isShadowBanned = false;
      device.isHardBanned = false;
      device.trustScore = 100;
      await AuditLog.create({
        action: 'override_strike',
        triggerReason: 'admin_manual',
        fingerprint,
        details: adminNote || 'Admin cleared all strikes'
      });
    } else if (action === 'toggle_shadow_to_hard') {
      device.isHardBanned = !device.isHardBanned;
      if (device.isHardBanned) {
        device.currentPenalty = 'ban';
        device.isShadowBanned = false;
      }
      await AuditLog.create({
        action: device.isHardBanned ? 'override_shadow_to_hard' : 'override_unban',
        triggerReason: 'admin_manual',
        fingerprint,
        details: adminNote || `Admin toggled hard ban: ${device.isHardBanned}`
      });
    } else if (action === 'manual_ban') {
      device.currentPenalty = 'ban';
      device.isHardBanned = true;
      device.isShadowBanned = false;
      await AuditLog.create({
        action: 'auto_hard_ban',
        triggerReason: 'admin_manual',
        fingerprint,
        details: adminNote || 'Admin manually applied hard ban'
      });
    }

    await device.save();

    if (this.io) {
      this.io.to('admin-channel').emit('security-event', {
        action: `override_${action}`,
        reason: 'admin_manual',
        fingerprint: fingerprint.substring(0, 10),
        details: adminNote || `Override: ${action}`,
        timestamp: Date.now()
      });
    }

    return device;
  }

  /**
   * Processes user-submitted reports and manages accumulation-based strike escalation.
   */
  public async handleUserReport(params: {
    reporterTag: string;
    reportedTag: string;
    category: ReportCategory;
    reason: string;
    note?: string;
    messageId?: string;
    reporterFingerprint?: string;
  }): Promise<{ report: any; auditLog: any; escalated: boolean; currentStrikes?: number }> {
    const { reporterTag, reportedTag, category, reason, note, messageId, reporterFingerprint } = params;

    // Resolve reported device fingerprint
    let targetDevice = await DeviceSecurity.findOne({ associatedTags: reportedTag });
    let targetFingerprint = targetDevice ? targetDevice.fingerprint : null;

    // 1. Create Report record
    const report = await Report.create({
      reporterTag,
      reportedTag,
      messageId: messageId || null,
      category: category || 'other',
      reason: reason || category,
      note: note || '',
      reporterFingerprint: reporterFingerprint || null,
      reportedFingerprint: targetFingerprint,
      status: 'pending'
    });

    // 2. Create AuditLog entry for unified review queue
    const auditLog = await AuditLog.create({
      action: 'user_report',
      triggerReason: category,
      confidenceScore: 0.75,
      targetTag: reportedTag,
      fingerprint: targetFingerprint || 'unknown-device',
      ipHash: targetDevice?.ipHash,
      details: note ? `[User Report: ${category}] ${note}` : `User reported for ${category}`,
      metadata: {
        reportId: report._id.toString(),
        reporterTag,
        messageId,
        category,
        note: note || ''
      }
    });

    // 3. Real-time broadcast to admin channel
    if (this.io) {
      this.io.to('admin-channel').emit('security-event', {
        action: 'user_report',
        reason: category,
        confidenceScore: 0.75,
        targetTag: reportedTag,
        fingerprint: (targetFingerprint || 'unknown').substring(0, 10),
        details: note ? `${category}: ${note.substring(0, 80)}` : category,
        timestamp: Date.now()
      });
    }

    // 4. Repeated reports escalation check (&ge; 3 distinct reporters within 24h)
    let escalated = false;
    let currentStrikes = targetDevice ? targetDevice.effectiveStrikes : 0;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReports = await Report.find({
      $or: [
        { reportedTag },
        ...(targetFingerprint ? [{ reportedFingerprint: targetFingerprint }] : [])
      ],
      createdAt: { $gte: dayAgo }
    });

    const distinctReporters = new Set(recentReports.map((r) => r.reporterTag));

    if (distinctReporters.size >= 3) {
      if (targetDevice) {
        await this.applyAutomaticViolation(
          targetDevice,
          'toxicity',
          0.85,
          `Accumulated ${distinctReporters.size} user reports across 24h for ${category}`,
          reportedTag
        );
        escalated = true;
        currentStrikes = targetDevice.effectiveStrikes;
      }
    }

    return { report, auditLog, escalated, currentStrikes };
  }
}

export const securityService = new SecurityService();
