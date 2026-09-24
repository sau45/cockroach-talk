'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Hand,
  MessageCircle,
  Clock,
  Flag,
  Info
} from 'lucide-react';
import { QueueMember } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportDialog } from '@/components/chat/ReportDialog';
import { cn } from '@/lib/utils';

interface AdmitUserModalProps {
  queueUser: QueueMember | null;
  isOpen: boolean;
  onClose: () => void;
  myTag?: string;
  isMyModerator?: boolean;
  queuePosition?: number | null;
  onAdmitUser?: (socketId: string, tag: string) => void;
  onToggleHand?: () => void;
}

export function AdmitUserModal({
  queueUser,
  isOpen,
  onClose,
  myTag,
  isMyModerator = false,
  queuePosition,
  onAdmitUser,
  onToggleHand
}: AdmitUserModalProps) {
  const [bio, setBio] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [reportingOpen, setReportingOpen] = useState(false);

  useEffect(() => {
    if (!queueUser?.tag) return;
    setLoadingProfile(true);
    setBio(null);
    setProfilePicture(null);

    fetch(`/api/auth/profile/${queueUser.tag}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.bio) setBio(data.bio);
          if (data.profilePicture) setProfilePicture(data.profilePicture);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [queueUser?.tag]);

  if (!queueUser) return null;

  const isSelf = String(queueUser.tag) === String(myTag);

  const formatWaitTime = (ms?: number) => {
    if (!ms) return '0s';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md border-3 border-border bg-card shadow-brutal-lg">
          <DialogHeader className="text-center sm:text-center pb-2">
            <DialogTitle className="sr-only">Waiting Queue Participant</DialogTitle>
            <DialogDescription className="sr-only">
              Details and stage admission for {queueUser.name}
            </DialogDescription>

            {/* Avatar Header */}
            <div className="flex flex-col items-center">
              <div className="relative my-2">
                <Avatar
                  className={cn(
                    'h-20 w-20 border-3 shadow-brutal-dark-sm',
                    queueUser.raisedHand ? 'border-accent-coral ring-4 ring-accent-coral/30' : 'border-border',
                    queueUser.gender === 'male' && 'border-blue-500',
                    queueUser.gender === 'female' && 'border-pink-500'
                  )}
                >
                  {profilePicture && <AvatarImage src={profilePicture} alt={queueUser.name} />}
                  <AvatarFallback className="text-2xl font-bold bg-secondary font-mono">
                    {queueUser.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {queueUser.raisedHand && (
                  <div
                    title="Hand Raised to Speak"
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-accent-coral text-white shadow-sm flex items-center justify-center animate-bounce"
                  >
                    <Hand className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Name & Queue Position */}
              <h2 className="text-lg font-black font-mono text-foreground flex items-center gap-1.5 mt-1">
                <span>{queueUser.name}</span>
                {isSelf && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                    You
                  </Badge>
                )}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
                <Badge variant="secondary" className="font-mono text-[11px] gap-1">
                  Queue Position {queuePosition ? `#${queuePosition}` : 'In Queue'}
                </Badge>

                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Wait: {formatWaitTime(queueUser.waitTimeMs)}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Body Section */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            {/* Quick Comment if available */}
            {queueUser.quickComment && (
              <div className="p-3 rounded-brutal-sm border-2 border-primary/40 bg-primary/5 space-y-1">
                <span className="text-[11px] font-mono font-bold text-primary flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" /> Quick Comment:
                </span>
                <p className="text-xs font-mono italic text-foreground">
                  &quot;{queueUser.quickComment}&quot;
                </p>
              </div>
            )}

            {/* Hand Raised indicator callout */}
            {queueUser.raisedHand && (
              <div className="flex items-center gap-2 p-2 rounded-brutal-sm border border-accent-coral/40 bg-accent-coral/10 text-xs font-mono font-bold text-accent-coral">
                <Hand className="h-4 w-4 animate-bounce" />
                <span>Hand Raised — prioritised for stage opening</span>
              </div>
            )}

            {/* Bio Section */}
            {loadingProfile ? (
              <p className="text-xs text-muted-foreground font-mono italic text-center py-1">
                Loading profile bio...
              </p>
            ) : bio ? (
              <div className="p-2.5 rounded-brutal-sm border-2 border-border bg-card/60">
                <p className="text-xs font-mono text-foreground italic">&quot;{bio}&quot;</p>
              </div>
            ) : null}

            {/* Action Section */}
            <div className="pt-2">
              {isMyModerator ? (
                <Button
                  onClick={() => {
                    onAdmitUser?.(queueUser.socketId, queueUser.tag);
                    onClose();
                  }}
                  className="w-full gap-2 font-mono text-sm bg-primary text-primary-foreground font-black shadow-brutal hover:translate-y-0.5"
                >
                  <UserCheck className="h-4 w-4" />
                  + Admit {queueUser.name} to Stage (Pop)
                </Button>
              ) : isSelf ? (
                <Button
                  onClick={() => {
                    onToggleHand?.();
                  }}
                  variant="outline"
                  className="w-full gap-2 font-mono text-xs border-2"
                >
                  <Hand className="h-4 w-4" />
                  {queueUser.raisedHand ? 'Lower Hand' : 'Raise Hand for Turn'}
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-brutal-sm border border-border/60 bg-muted/40 text-xs text-muted-foreground font-mono">
                  <Info className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Waiting queue member. Stage Moderators can admit them when a speaking slot opens.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
            {!isSelf ? (
              <Button
                onClick={() => setReportingOpen(true)}
                variant="ghost"
                size="sm"
                className="text-xs font-mono text-muted-foreground hover:text-accent-coral gap-1.5"
              >
                <Flag className="h-3.5 w-3.5" />
                Report
              </Button>
            ) : <div />}

            <Button onClick={onClose} size="sm" variant="secondary" className="font-mono text-xs px-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Report Dialog */}
      {reportingOpen && (
        <ReportDialog
          open={reportingOpen}
          onOpenChange={setReportingOpen}
          reportedTag={queueUser.tag}
          reportedName={queueUser.name}
          reporterTag={myTag}
        />
      )}
    </>
  );
}
