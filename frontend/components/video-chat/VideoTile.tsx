'use client';

import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Star, Shield, VideoOff } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getAccentPalette } from '@/lib/palette';
import { cn } from '@/lib/utils';

export interface VideoTileProps {
  socketId?: string;
  stream: MediaStream | null;
  name: string;
  tag: string;
  isSelf?: boolean;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  isSpeaking?: boolean;
  role?: 'lead' | 'mod' | 'debater' | string;
  avatarType?: 'initials' | 'identicon' | 'emoji';
  avatarValue?: string;
  accentColor?: string;
  className?: string;
}

export function VideoTile({
  stream,
  name,
  tag,
  isSelf = false,
  isMuted = true,
  isVideoEnabled = false,
  isSpeaking = false,
  role = 'debater',
  avatarType = 'initials',
  avatarValue = '',
  accentColor = 'cyber-purple',
  className
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const palette = getAccentPalette(accentColor);

  const hasVideoTrack = !!(
    isVideoEnabled &&
    stream &&
    stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)
  );

  // Sync stream to video element safely
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (hasVideoTrack && stream) {
      const currentSrc = videoEl.srcObject as MediaStream | null;
      const currentTrack = currentSrc?.getVideoTracks()[0];
      const newTrack = stream.getVideoTracks()[0];

      if (!currentSrc || !currentTrack || currentTrack.id !== newTrack?.id) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch((err) => {
        console.warn('[VideoTile] Autoplay failed or pending user interaction:', err);
      });
    } else {
      if (videoEl.srcObject) {
        videoEl.srcObject = null;
      }
    }
  }, [hasVideoTrack, stream]);

  const isLead = role === 'lead';
  const isMod = role === 'mod';

  return (
    <div
      className={cn(
        'relative aspect-video w-full rounded-brutal-md border-3 border-border bg-card overflow-hidden transition-all duration-200 shadow-brutal-sm',
        isSpeaking && 'border-primary ring-2 ring-primary shadow-brutal animate-pulse',
        className
      )}
    >
      {/* 1. Live Video Stream */}
      {hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf} // Self camera MUST always be muted to prevent echo feedback
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isSelf && '-scale-x-100' // Mirror local camera feed for intuitive UX
          )}
        />
      ) : (
        /* 2. Fallback Avatar Canvas when Camera is OFF */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 p-4 select-none">
          <div className="relative">
            <UserAvatar
              name={name}
              tag={tag}
              avatarType={avatarType}
              avatarValue={avatarValue}
              accentColor={accentColor}
              size="lg"
              isSpeaking={isSpeaking}
            />
            {/* Small camera off indicator */}
            <div
              className="absolute -top-1 -right-1 p-1 rounded-full bg-muted/90 border border-border text-muted-foreground shadow-sm"
              title="Camera is off"
            >
              <VideoOff className="h-3 w-3" />
            </div>
          </div>
        </div>
      )}

      {/* Top Left: Role Badge */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
        {isLead ? (
          <span
            title="Room Lead"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-gold text-black font-mono font-bold text-[10px] shadow-sm border border-black/20"
          >
            <Star className="h-3 w-3 fill-black" />
            <span>LEAD</span>
          </span>
        ) : isMod ? (
          <span
            title="Stage Moderator"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-gold/20 text-accent-gold border border-accent-gold/40 font-mono font-bold text-[10px] backdrop-blur-sm"
          >
            <Shield className="h-3 w-3" />
            <span>MOD</span>
          </span>
        ) : null}
      </div>

      {/* Top Right: Mic Status Badge */}
      <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
        {isMuted ? (
          <span
            title="Microphone Muted"
            className="flex items-center justify-center h-6 w-6 rounded-full bg-destructive text-white shadow-sm border border-destructive/50"
          >
            <MicOff className="h-3.5 w-3.5" />
          </span>
        ) : isSpeaking ? (
          <span
            title="Speaking"
            className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-brutal animate-bounce"
          >
            <Mic className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span
            title="Microphone Unmuted"
            className="flex items-center justify-center h-6 w-6 rounded-full bg-card/80 text-foreground border border-border/60 backdrop-blur-sm"
          >
            <Mic className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Bottom Overlay: Handle Tag & Status */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 rounded bg-black/60 backdrop-blur-md text-white text-xs font-mono font-bold z-10 border border-white/10">
        <span className="truncate max-w-[140px] sm:max-w-[180px]">
          {name} {!name.includes('#') && <span className="text-white/60 font-normal">#{tag}</span>}
        </span>
        {isSelf && (
          <span className="text-[10px] px-1 rounded bg-primary text-primary-foreground font-sans font-bold">
            YOU
          </span>
        )}
      </div>
    </div>
  );
}
