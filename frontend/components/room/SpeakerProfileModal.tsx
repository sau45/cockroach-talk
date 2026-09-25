'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Star,
  Mic,
  MicOff,
  UserMinus,
  VolumeX,
  Flag,
  Clock,
  LogOut,
  Info
} from 'lucide-react';
import { ActiveMember } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getAccentPalette } from '@/lib/palette';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportDialog } from '@/components/chat/ReportDialog';
import { cn } from '@/lib/utils';

interface SpeakerProfileModalProps {
  speaker: ActiveMember | null;
  isOpen: boolean;
  onClose: () => void;
  myTag?: string;
  isMeOnStage?: boolean;
  isMyModerator?: boolean;
  isSeniorMod?: boolean;
  seniorModSocketId?: string | null;
  onRemoveUser?: (socketId: string, tag: string) => void;
  onMuteSpeaker?: (socketId: string, tag: string) => void;
}

export function SpeakerProfileModal({
  speaker,
  isOpen,
  onClose,
  myTag,
  isMeOnStage = true,
  isMyModerator = false,
  isSeniorMod = false,
  seniorModSocketId,
  onRemoveUser,
  onMuteSpeaker
}: SpeakerProfileModalProps) {
  const [profileData, setProfileData] = useState<{
    bio?: string;
    profilePicture?: string;
    avatarType?: 'initials' | 'identicon' | 'emoji';
    avatarValue?: string;
    accentColor?: string;
    statusTag?: string;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [reportingOpen, setReportingOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!speaker?.tag) return;
    setLoadingProfile(true);
    setProfileData(null);

    fetch(`/api/auth/profile/${speaker.tag}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setProfileData(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [speaker?.tag]);

  if (!speaker) return null;

  const isSelf = String(speaker.tag) === String(myTag);
  const isSpeakerLead = seniorModSocketId === speaker.socketId || speaker.isLead || speaker.roleOnStage === 'lead';
  const isSpeakerMod = !isSpeakerLead && (speaker.isModerator || speaker.roleOnStage === 'mod');
  const isSpeakerDebater = !isSpeakerLead && !isSpeakerMod;

  // Demote Rule:
  // 1. Lead can demote anyone (mods and debaters) EXCEPT themselves.
  // 2. Mod can ONLY demote debaters (NOT lead, NOT other mods, NOT themselves).
  // 3. Debater cannot demote anyone.
  const canIDemoteThisUser =
    !isSelf &&
    (isSeniorMod
      ? true
      : isMyModerator
      ? isSpeakerDebater
      : false);

  // Mute Rule:
  // Anyone on stage can mute anyone except the Room Lead and themselves.
  const canIMuteThisUser = !isSelf && isMeOnStage && !isSpeakerLead;

  const activeAvatarType = profileData?.avatarType || speaker.avatarType;
  const activeAvatarValue = profileData?.avatarValue !== undefined ? profileData.avatarValue : speaker.avatarValue;
  const activeAccentColor = profileData?.accentColor || speaker.accentColor;
  const activeStatusTag = profileData?.statusTag !== undefined ? profileData.statusTag : speaker.statusTag;

  const formatActiveTime = () => {
    const startTime = speaker.joinedActiveAt || (now - (speaker.activeTimeMs || 0));
    const totalSec = Math.max(0, Math.floor((now - startTime) / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const palette = getAccentPalette(activeAccentColor);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md border-3 border-border bg-card shadow-brutal-lg">
          <DialogHeader className="text-center sm:text-center pb-2">
            <DialogTitle className="sr-only">Speaker Profile</DialogTitle>
            <DialogDescription className="sr-only">
              Details and moderation actions for {speaker.name}
            </DialogDescription>

            {/* Avatar Header */}
            <div className="flex flex-col items-center">
              <div className="relative my-2">
                <UserAvatar
                  name={speaker.name}
                  tag={speaker.tag}
                  avatarType={activeAvatarType}
                  avatarValue={activeAvatarValue}
                  accentColor={activeAccentColor}
                  size="xl"
                  isSpeaking={speaker.isSpeaking}
                />

                {/* Role Badge Overlay */}
                {isSpeakerLead ? (
                  <div
                    title="Room Lead (Most Powerful)"
                    className="absolute -top-1 -left-1 p-1 rounded-full bg-accent-gold text-black shadow-sm border border-accent-gold/40 flex items-center justify-center animate-pulse"
                  >
                    <Star className="h-4 w-4 fill-black" />
                  </div>
                ) : isSpeakerMod ? (
                  <div
                    title="Stage Moderator"
                    className="absolute -top-1 -left-1 p-1 rounded-full bg-accent-gold text-white shadow-sm border border-accent-gold/40 flex items-center justify-center"
                  >
                    <Shield className="h-4 w-4" />
                  </div>
                ) : null}

                {/* Mic Status Badge */}
                <div className="absolute -bottom-1 -right-1 flex gap-1">
                  {speaker.isMuted ? (
                    <span
                      title="Microphone Muted"
                      className="p-1 rounded-full bg-destructive text-white shadow-sm flex items-center justify-center"
                    >
                      <MicOff className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span
                      title="Microphone Active"
                      className="p-1 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center justify-center"
                    >
                      <Mic className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>

              {/* Name & Role */}
              <h2
                className={cn("text-lg font-black font-mono flex items-center gap-1.5 mt-1", palette.textClass)}
                style={{ color: palette.hex }}
              >
                <span>{speaker.name}</span>
                {isSelf && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                    You
                  </Badge>
                )}
                {speaker.statusTag && (
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] py-0 px-1.5 font-mono border", palette.borderClass, palette.bgClass)}
                    style={{
                      borderColor: palette.hex,
                      backgroundColor: `${palette.hex}18`,
                      color: palette.hex
                    }}
                  >
                    {speaker.statusTag}
                  </Badge>
                )}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
                {isSpeakerLead ? (
                  <Badge className="bg-accent-gold text-black font-mono text-[11px] gap-1 font-bold">
                    <Star className="h-3 w-3 fill-black" /> Room Lead
                  </Badge>
                ) : isSpeakerMod ? (
                  <Badge className="bg-accent-gold/20 text-accent-gold border-accent-gold/40 font-mono text-[11px] gap-1 font-bold">
                    <Shield className="h-3 w-3" /> Stage Moderator
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-mono text-[11px] gap-1">
                    <Mic className="h-3 w-3" /> Stage Debater
                  </Badge>
                )}

                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1 font-bold">
                  <Clock className="h-3 w-3" /> {formatActiveTime()}
                </span>
              </div>

              {activeStatusTag && (
                <div className="mt-2">
                  <Badge
                    variant="secondary"
                    className={cn('text-xs font-mono py-0.5 px-2 border', palette.borderClass, palette.bgClass)}
                    style={{
                      borderColor: palette.hex,
                      backgroundColor: `${palette.hex}18`,
                      color: palette.hex
                    }}
                  >
                    {activeStatusTag}
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Bio Section */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            {loadingProfile ? (
              <p className="text-xs text-muted-foreground font-mono italic text-center py-1">
                Loading profile...
              </p>
            ) : profileData?.bio ? (
              <div className="p-2.5 rounded-brutal-sm border-2 border-border bg-card/60">
                <p className="text-xs font-mono text-foreground italic">&quot;{profileData.bio}&quot;</p>
              </div>
            ) : null}

            {/* Stage Rules Callout */}
            <div className="flex items-start gap-2 p-2.5 rounded-brutal-sm border border-border/60 bg-muted/40 text-xs text-muted-foreground font-mono">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <p>
                <strong>Room Lead</strong> is immune to being muted and can demote anyone. <strong>Speakers</strong> can mute anyone except the Lead. <strong>Moderators</strong> can demote debaters.
              </p>
            </div>

            {/* Immunity Notice if viewing the Room Lead */}
            {isSpeakerLead && !isSelf && (
              <div className="flex items-center gap-2 p-2 rounded-brutal-sm border border-accent-gold/40 bg-accent-gold/10 text-xs font-mono text-accent-gold font-bold">
                <Star className="h-3.5 w-3.5 shrink-0 fill-current" />
                <span>The Room Lead is immune to being muted or demoted by anyone.</span>
              </div>
            )}

            {/* Notice if a Moderator is viewing another Moderator */}
            {!isSpeakerLead && isSpeakerMod && !isSelf && isMyModerator && !isSeniorMod && (
              <div className="flex items-center gap-2 p-2 rounded-brutal-sm border border-border bg-muted/30 text-xs font-mono text-muted-foreground">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>Moderators cannot demote other moderators (only Room Lead can). You can still mute this speaker.</span>
              </div>
            )}

            {/* Context Actions (Only visible for other speakers, never on self) */}
            {!isSelf && (canIMuteThisUser || canIDemoteThisUser) ? (
              <div className="space-y-2 pt-2">
                <div className={cn("grid gap-2", canIMuteThisUser && canIDemoteThisUser ? "grid-cols-2" : "grid-cols-1")}>
                  {canIMuteThisUser && (
                    <Button
                      onClick={() => {
                        onMuteSpeaker?.(speaker.socketId, speaker.tag);
                        onClose();
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-mono text-xs border-2 hover:border-accent-coral hover:text-accent-coral"
                    >
                      <VolumeX className="h-3.5 w-3.5" />
                      Mute Speaker
                    </Button>
                  )}

                  {canIDemoteThisUser && (
                    <Button
                      onClick={() => {
                        onRemoveUser?.(speaker.socketId, speaker.tag);
                        onClose();
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-mono text-xs border-2 hover:border-destructive hover:text-destructive"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Demote to Queue
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
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
          reportedTag={speaker.tag}
          reportedName={speaker.name}
          reporterTag={myTag}
        />
      )}
    </>
  );
}
