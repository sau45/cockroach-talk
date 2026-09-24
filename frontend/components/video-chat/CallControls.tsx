'use client';

import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, LayoutGrid, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CallControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onLeaveCall: () => void;
  viewMode?: 'video' | 'stage';
  onToggleViewMode?: () => void;
  className?: string;
}

export function CallControls({
  isMuted,
  isVideoEnabled,
  onToggleMute,
  onToggleVideo,
  onLeaveCall,
  viewMode = 'video',
  onToggleViewMode,
  className
}: CallControlsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-brutal-md border-3 border-border bg-card shadow-brutal-md backdrop-blur',
        className
      )}
    >
      {/* 1. Mic Mute / Unmute */}
      <button
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={cn(
          'p-3 rounded-brutal-sm border-2 border-border transition-all font-bold flex items-center justify-center',
          isMuted
            ? 'bg-destructive text-destructive-foreground shadow-brutal-coral hover:bg-destructive/90'
            : 'bg-primary text-primary-foreground shadow-brutal hover:bg-primary/90'
        )}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>

      {/* 2. Camera Toggle */}
      <button
        onClick={onToggleVideo}
        aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        className={cn(
          'p-3 rounded-brutal-sm border-2 border-border transition-all font-bold flex items-center justify-center',
          isVideoEnabled
            ? 'bg-accent-gold text-black shadow-brutal hover:bg-accent-gold/90'
            : 'bg-secondary text-foreground hover:bg-muted shadow-brutal-sm'
        )}
      >
        {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-muted-foreground" />}
      </button>

      {/* 3. View Switcher (Optional) */}
      {onToggleViewMode && (
        <button
          onClick={onToggleViewMode}
          aria-label="Toggle stage / video layout"
          title={viewMode === 'video' ? 'Switch to Stage Grid layout' : 'Switch to Video Tiles layout'}
          className="p-3 rounded-brutal-sm border-2 border-border bg-secondary hover:bg-muted text-foreground transition-all flex items-center justify-center shadow-brutal-sm"
        >
          {viewMode === 'video' ? <Users className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
        </button>
      )}

      {/* 4. Leave Call Button */}
      <button
        onClick={onLeaveCall}
        aria-label="Leave call"
        title="Leave voice & video call"
        className="p-3 rounded-brutal-sm border-2 border-border bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all flex items-center justify-center shadow-brutal-coral"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  );
}
