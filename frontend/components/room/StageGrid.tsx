import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Shield, Star, Monitor, UserMinus, VolumeX, Flag, Video } from 'lucide-react';
import { ActiveMember } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Skeleton, StageChipSkeleton } from '@/components/ui/skeleton';
import { getAccentPalette } from '@/lib/palette';
import { SpeakerProfileModal } from '@/components/room/SpeakerProfileModal';
import { ReportDialog } from '@/components/chat/ReportDialog';
import { cn } from '@/lib/utils';

// Hardware-accelerated video media renderer for chip-sized stage view
function VideoChipMedia({ stream, isSelf }: { stream: MediaStream; isSelf: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) return;

    const currentSrc = videoEl.srcObject as MediaStream | null;
    const currentVideoTrack = currentSrc?.getVideoTracks()[0];
    const newVideoTrack = stream.getVideoTracks()[0];

    // If the video element is already rendering this exact track ID and it is live,
    // NEVER reassign srcObject! Reassigning srcObject causes browser decoder resets (black flashes).
    if (
      currentSrc &&
      currentVideoTrack &&
      newVideoTrack &&
      currentVideoTrack.id === newVideoTrack.id &&
      currentVideoTrack.readyState === 'live'
    ) {
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      }
      setIsVideoReady(true);
      return;
    }

    setIsVideoReady(false);
    videoEl.srcObject = stream;
    videoEl.play().catch(() => {});
  }, [stream]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {!isVideoReady && (
        <Skeleton className="absolute inset-0 w-full h-full bg-card/90 z-10 flex flex-col items-center justify-center gap-1 border-0">
          <Video className="h-4 w-4 text-primary animate-bounce" />
          <span className="text-[9px] font-mono font-bold text-muted-foreground">Connecting feed...</span>
        </Skeleton>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={true} // Audio is handled via background WebRTC audio elements; mute video element to avoid echo
        onLoadedData={() => setIsVideoReady(true)}
        onPlaying={() => setIsVideoReady(true)}
        className={cn(
          'w-full h-full object-cover transform-gpu transition-opacity duration-300',
          isVideoReady ? 'opacity-100' : 'opacity-0',
          isSelf && '-scale-x-100'
        )}
        style={{ transform: isSelf ? 'scaleX(-1) translateZ(0)' : 'translateZ(0)' }}
      />
    </div>
  );
}

interface StageGridProps {
  activeMembers: ActiveMember[];
  myTag?: string;
  isMyModerator?: boolean;
  isSeniorMod?: boolean;
  seniorModSocketId?: string | null;
  onRemoveUser?: (socketId: string, tag: string) => void;
  onMuteSpeaker?: (socketId: string, tag: string) => void;
  localStream?: MediaStream | null;
  remoteStreams?: Map<string, MediaStream>;
  isVideoEnabled?: boolean;
  isSelfSpeaking?: boolean;
  isLoading?: boolean;
}

export function StageGrid({
  activeMembers,
  myTag,
  isMyModerator = false,
  isSeniorMod = false,
  seniorModSocketId,
  onRemoveUser,
  onMuteSpeaker,
  localStream,
  remoteStreams,
  isVideoEnabled = false,
  isSelfSpeaking = false,
  isLoading = false
}: StageGridProps) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<ActiveMember | null>(null);
  const [reportingMember, setReportingMember] = useState<ActiveMember | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <StageChipSkeleton key={idx} />
        ))}
      </div>
    );
  }

  if (activeMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-brutal-md border-2 border-dashed border-border bg-card/40 text-center">
        <p className="font-mono text-sm text-muted-foreground font-bold">Stage is quiet</p>
        <p className="text-xs text-muted-foreground mt-1">Jump onto the mic or wait in queue to speak.</p>
      </div>
    );
  }

  const isMeOnStage = activeMembers.some((m) => String(m.tag) === String(myTag));

  return (
    <>
      <div className="grid grid-cols-2 min-[460px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
        {activeMembers.map((member) => {
          const isMe = String(member.tag) === String(myTag);
          const isTargetLead = seniorModSocketId === member.socketId || member.isLead || member.roleOnStage === 'lead';
          const isTargetMod = !isTargetLead && (member.isModerator || member.roleOnStage === 'mod');
          const isTargetDebater = !isTargetLead && !isTargetMod;
          const memberPalette = getAccentPalette(member.accentColor);
          const isSpeakingNow = isMe ? (isSelfSpeaking || member.isSpeaking) : member.isSpeaking;

          // Retrieve proper MediaStream
          const stream = isMe
            ? localStream
            : (member.socketId ? remoteStreams?.get(member.socketId) : null) || null;

          const memberVideoEnabled = isMe ? isVideoEnabled : !!member.isVideoEnabled;
          const hasLiveVideoTrack = !!(
            memberVideoEnabled &&
            stream &&
            stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)
          );

          // Demote Rule: Lead can demote anyone; Mod can ONLY demote debaters; Debater cannot demote. Self CANNOT demote self.
          const canDemoteThisMember = !isMe && (isSeniorMod ? true : isMyModerator ? isTargetDebater : false);

          // Mute Rule: Anyone on stage can mute anyone EXCEPT Room Lead and self. No one can mute Lead.
          const canMuteThisMember = !isMe && isMeOnStage && !isTargetLead;

          return (
            <div
              key={member.socketId || member.tag}
              onClick={() => setSelectedSpeaker(member)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedSpeaker(member)}
              title={`Click to view ${member.name}'s profile & options`}
              className={cn(
                'group relative flex flex-col items-center p-1.5 rounded-brutal-sm border-2 border-border bg-card shadow-brutal-dark-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-brutal hover:border-primary w-full max-w-[190px]',
                isSpeakingNow && 'border-primary ring-2 ring-primary shadow-brutal',
                member.isMuted && 'bg-card/70 border-destructive/40 opacity-90 shadow-none',
                member.isScreenSharing && 'border-accent-coral'
              )}
            >
              {/* Media Viewport: Encloses video/avatar and all corner badges cleanly */}
              <div className="relative w-full aspect-video rounded-brutal-sm border border-border bg-black/95 overflow-hidden shadow-inner flex items-center justify-center">
                {memberVideoEnabled ? (
                  hasLiveVideoTrack && stream ? (
                    <VideoChipMedia stream={stream} isSelf={isMe} />
                  ) : (
                    <Skeleton className="absolute inset-0 w-full h-full bg-card/90 flex flex-col items-center justify-center gap-1 border-0 z-10">
                      <Video className="h-3.5 w-3.5 text-primary animate-bounce" />
                      <span className="text-[8px] font-mono font-bold text-muted-foreground">Connecting...</span>
                    </Skeleton>
                  )
                ) : (
                  <UserAvatar
                    name={member.name}
                    tag={member.tag}
                    avatarType={member.avatarType}
                    avatarValue={member.avatarValue}
                    accentColor={member.accentColor}
                    size="md"
                    isSpeaking={isSpeakingNow}
                  />
                )}

                {/* Top-Left: Clean enclosed Role Badge (LEAD / MOD) */}
                {isTargetLead ? (
                  <div
                    title="Room Lead"
                    className="absolute top-1 left-1 flex items-center gap-0.5 text-[8.5px] font-mono font-bold text-accent-gold bg-black/85 border border-accent-gold/60 px-1 py-0.5 rounded shadow-sm z-10 pointer-events-none leading-none"
                  >
                    <Star className="h-2 w-2 fill-accent-gold text-accent-gold" />
                    <span>LEAD</span>
                  </div>
                ) : isTargetMod ? (
                  <div
                    title="Stage Moderator"
                    className="absolute top-1 left-1 flex items-center gap-0.5 text-[8.5px] font-mono font-bold text-accent-gold bg-black/85 border border-accent-gold/40 px-1 py-0.5 rounded shadow-sm z-10 pointer-events-none leading-none"
                  >
                    <Shield className="h-2 w-2 text-accent-gold" />
                    <span>MOD</span>
                  </div>
                ) : null}

                {/* Top-Right: Quick Action Controls (Mute, Demote, Report) */}
                <div
                  className="absolute top-1 right-1 flex items-center gap-0.5 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canMuteThisMember && (
                    <button
                      onClick={() => onMuteSpeaker && onMuteSpeaker(member.socketId, member.tag)}
                      title="Mute speaker"
                      className="p-0.5 rounded bg-black/80 border border-white/20 text-muted-foreground hover:text-accent-coral transition-colors hover:bg-black"
                    >
                      <VolumeX className="h-2.5 w-2.5" />
                    </button>
                  )}
                  {canDemoteThisMember && (
                    <button
                      onClick={() => onRemoveUser && onRemoveUser(member.socketId, member.tag)}
                      title="Demote speaker to queue"
                      className="p-0.5 rounded bg-black/80 border border-white/20 text-muted-foreground hover:text-destructive transition-colors hover:bg-black"
                    >
                      <UserMinus className="h-2.5 w-2.5" />
                    </button>
                  )}
                  {!isMe && (
                    <button
                      onClick={() => setReportingMember(member)}
                      title={`Report ${member.name}`}
                      className="p-0.5 rounded bg-black/80 border border-white/20 text-muted-foreground hover:text-destructive transition-colors hover:bg-black"
                    >
                      <Flag className="h-2 w-2" />
                    </button>
                  )}
                </div>

                {/* Bottom-Right: Status Icons (Mic Open, Muted Mic, Screen Sharing) */}
                <div className="absolute bottom-1 right-1 flex items-center gap-0.5 z-10 pointer-events-none">
                  {!member.isMuted ? (
                    <span
                      title="Microphone Open"
                      className="p-0.5 rounded-full bg-emerald-600 text-white shadow-sm flex items-center justify-center border border-emerald-400/80 ring-1 ring-emerald-500/40 animate-pulse"
                    >
                      <Mic className="h-2.5 w-2.5" />
                    </span>
                  ) : (
                    <span
                      title="Muted"
                      className="p-0.5 rounded-full bg-destructive text-white shadow-sm flex items-center justify-center border border-black/50"
                    >
                      <MicOff className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {member.isScreenSharing && (
                    <span
                      title="Sharing Screen"
                      className="p-0.5 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center justify-center animate-pulse border border-black/50"
                    >
                      <Monitor className="h-2 w-2" />
                    </span>
                  )}
                </div>
              </div>

              {/* Clean Single-Line Name Strip (No redundant Lead/You line, No clock ticker) */}
              <div className="w-full text-center mt-1 px-0.5 truncate flex items-center justify-center gap-1">
                <p
                  className={cn("font-bold text-[11px] truncate font-mono leading-tight", memberPalette.textClass)}
                  style={{ color: memberPalette.hex }}
                >
                  {member.name}
                </p>
                {isMe && (
                  <span className="text-[8.5px] font-mono font-bold px-1 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 shrink-0 leading-none">
                    YOU
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Speaker Details & Moderation Modal */}
      {selectedSpeaker && (
        <SpeakerProfileModal
          speaker={selectedSpeaker}
          isOpen={!!selectedSpeaker}
          onClose={() => setSelectedSpeaker(null)}
          myTag={myTag}
          isMeOnStage={isMeOnStage}
          isMyModerator={isMyModerator}
          isSeniorMod={isSeniorMod}
          seniorModSocketId={seniorModSocketId}
          onRemoveUser={onRemoveUser}
          onMuteSpeaker={onMuteSpeaker}
        />
      )}

      {/* Standalone Report Dialog */}
      {reportingMember && (
        <ReportDialog
          open={!!reportingMember}
          onOpenChange={(open) => !open && setReportingMember(null)}
          reportedTag={reportingMember.tag}
          reportedName={reportingMember.name}
          reporterTag={myTag}
        />
      )}
    </>
  );
}
