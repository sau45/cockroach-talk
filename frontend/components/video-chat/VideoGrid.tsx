'use client';

import React from 'react';
import { ActiveMember } from '@/types';
import { VideoTile } from './VideoTile';
import { cn } from '@/lib/utils';

export interface VideoGridProps {
  activeMembers: ActiveMember[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  myTag?: string;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  isSpeaking?: boolean;
  seniorModSocketId?: string | null;
  onSelectSpeaker?: (member: ActiveMember) => void;
  className?: string;
}

export function VideoGrid({
  activeMembers,
  localStream,
  remoteStreams,
  myTag,
  isMuted = true,
  isVideoEnabled = false,
  isSpeaking = false,
  seniorModSocketId,
  onSelectSpeaker,
  className
}: VideoGridProps) {
  if (!activeMembers || activeMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-brutal-md border-3 border-dashed border-border bg-card/40 text-center">
        <p className="font-mono text-sm text-muted-foreground font-bold">No speakers on stage</p>
        <p className="text-xs text-muted-foreground mt-1">Join the stage queue to broadcast your camera and audio.</p>
      </div>
    );
  }

  const count = activeMembers.length;

  // Uniform responsive grid layout matching stage chips (max 8 speakers)
  const getGridCols = () => {
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
  };

  return (
    <div className={cn('grid gap-3 transition-all duration-300', getGridCols(), className)}>
      {activeMembers.map((member) => {
        const isSelf = String(member.tag) === String(myTag);
        const isLead = seniorModSocketId === member.socketId || member.isLead || member.roleOnStage === 'lead';
        const isMod = !isLead && (member.isModerator || member.roleOnStage === 'mod');
        const role = isLead ? 'lead' : isMod ? 'mod' : 'debater';

        // Retrieve proper MediaStream
        const stream = isSelf
          ? localStream
          : (member.socketId ? remoteStreams.get(member.socketId) : null) || null;

        const tileVideoEnabled = isSelf ? isVideoEnabled : !!member.isVideoEnabled;
        const tileMuted = isSelf ? isMuted : !!member.isMuted;
        const tileSpeaking = isSelf ? isSpeaking : !!member.isSpeaking;

        return (
          <div
            key={member.socketId || member.tag}
            onClick={() => onSelectSpeaker?.(member)}
            className="cursor-pointer"
          >
            <VideoTile
              socketId={member.socketId}
              stream={stream}
              name={member.name}
              tag={member.tag}
              isSelf={isSelf}
              isMuted={tileMuted}
              isVideoEnabled={tileVideoEnabled}
              isSpeaking={tileSpeaking}
              role={role}
              avatarType={member.avatarType as any}
              avatarValue={member.avatarValue}
              accentColor={member.accentColor}
            />
          </div>
        );
      })}
    </div>
  );
}
