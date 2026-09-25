'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Mic,
  MicOff,
  Monitor,
  MessageSquare,
  Hand,
  LogOut,
  Shield,
  Clock,
  Sliders,
  Star,
  Video,
  VideoOff,
  Disc,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RoomDockProps {
  role: 'active' | 'queue' | null;
  isMuted: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  hasUnreadChat?: boolean;
  isHandRaised?: boolean;
  queuePosition?: number | null;
  isMyModerator?: boolean;
  isSeniorMod?: boolean;
  onToggleMute: () => void;
  isVideoEnabled?: boolean;
  onToggleVideo?: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleHand: () => void;
  onSubmitQuickComment?: (comment: string) => void;
  onSendEmoji: (emoji: string) => void;
  onLeaveRoom: () => void;
  onOpenProfile?: () => void;
  isRecording?: boolean;
  onToggleRecording?: () => void;
}

const DOCK_EMOJIS = ['❤️', '👏', '😂', '👎', '💯'];

export function RoomDock({
  role,
  isMuted,
  isVideoEnabled = false,
  isScreenSharing,
  isChatOpen,
  hasUnreadChat = false,
  isHandRaised = false,
  queuePosition,
  isMyModerator = false,
  isSeniorMod = false,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleHand,
  onSendEmoji,
  onLeaveRoom,
  onOpenProfile,
  isRecording = false,
  onToggleRecording
}: RoomDockProps) {
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Fixed Viewport Bottom Dock Portal: 100% immune to page scrolling */}
      {createPortal(
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto z-50 flex flex-col items-center pointer-events-none transition-all duration-200',
            isChatOpen && 'hidden sm:flex'
          )}
        >
          <div className="w-full sm:w-auto flex flex-col items-center px-4 py-2 sm:p-2.5 bg-card/98 border-t-2 sm:border-2 border-border sm:rounded-brutal-md shadow-[0_-4px_24px_rgba(0,0,0,0.4)] sm:shadow-brutal-lg backdrop-blur-lg pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-auto">
          {/* Top Emoji Quick Row & Role Status Tag */}
          <div className="flex items-center justify-between w-full max-w-[340px] sm:max-w-none sm:min-w-[280px] pb-1.5 mb-1.5 border-b border-border/50 gap-2">
            {/* Status indicator */}
            <div className="flex items-center gap-1 shrink-0">
              {role === 'active' ? (
                isSeniorMod ? (
                  <Badge className="bg-accent-gold text-black font-mono text-[10px] py-0 px-1.5 font-bold gap-1 shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-black" /> Lead
                  </Badge>
                ) : isMyModerator ? (
                  <Badge className="bg-accent-gold/20 text-accent-gold border-accent-gold/40 font-mono text-[10px] py-0 px-1.5 font-bold gap-1">
                    <Shield className="h-2.5 w-2.5" /> Mod
                  </Badge>
                ) : (
                  <Badge variant="default" className="font-mono text-[10px] py-0 px-1.5 gap-1">
                    <Mic className="h-2.5 w-2.5" /> Debater
                  </Badge>
                )
              ) : role === 'queue' ? (
                <Badge
                  variant={isHandRaised ? 'default' : 'secondary'}
                  className={cn(
                    'font-mono text-[10px] py-0 px-1.5 gap-1',
                    isHandRaised && 'bg-accent-coral text-white animate-pulse'
                  )}
                >
                  <Clock className="h-2.5 w-2.5" />
                  {queuePosition ? `#${queuePosition}` : 'Queue'}
                </Badge>
              ) : (
                <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 text-muted-foreground border-border">
                  Audience
                </Badge>
              )}
            </div>

            {/* Emojis */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {DOCK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSendEmoji(emoji)}
                  className="text-base sm:text-lg hover:scale-125 active:scale-95 transition-transform p-0.5 shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Clean 4-Button Controls Row */}
          <div className="flex items-center justify-center gap-3 sm:gap-2.5 w-full max-w-[340px] sm:max-w-none">
            {/* 1. Chat Toggle */}
            <button
              onClick={onToggleChat}
              aria-label="Toggle chat"
              title="Toggle Room Chat"
              className={cn(
                'relative flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-brutal-sm border-2 transition-all duration-150 active:scale-95',
                isChatOpen
                  ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                  : 'bg-secondary text-foreground border-border hover:bg-muted hover:border-primary/60 hover:text-primary'
              )}
            >
              <MessageSquare className="h-4 sm:h-5 w-4 sm:w-5" />
              {hasUnreadChat && !isChatOpen && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                </span>
              )}
            </button>

            {/* 2. Primary Role Action: Mic Mute (Stage Speakers) OR Raise Hand (Audience/Queue) */}
            {role === 'active' ? (
              <button
                onClick={onToggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                className={cn(
                  'flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-brutal-sm border-2 transition-all duration-150 active:scale-95 font-bold',
                  isMuted
                    ? 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90'
                    : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                )}
              >
                {isMuted ? <MicOff className="h-4 sm:h-5 w-4 sm:w-5" /> : <Mic className="h-4 sm:h-5 w-4 sm:w-5" />}
              </button>
            ) : role === 'queue' ? (
              <button
                onClick={onToggleHand}
                aria-label={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                title={isHandRaised ? 'Hand Raised (Click to lower)' : 'Raise Hand to speak on stage'}
                className={cn(
                  'flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-brutal-sm border-2 transition-all duration-150 active:scale-95',
                  isHandRaised
                    ? 'bg-accent-coral text-white border-accent-coral hover:bg-accent-coral/90 animate-bounce'
                    : 'bg-secondary hover:bg-muted hover:border-accent-coral/60 text-foreground border-border'
                )}
              >
                <Hand className="h-4 sm:h-5 w-4 sm:w-5" />
              </button>
            ) : (
              <div
                className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-brutal-sm border-2 border-border/40 bg-secondary/40 animate-pulse"
                title="Connecting to room..."
              >
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              </div>
            )}

            {/* 3. More Options Dropdown Menu (Contains Record, Profile, Video, Screen Share) */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="More options"
                  title="More Options"
                  className={cn(
                    'relative flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-brutal-sm border-2 transition-all duration-150 active:scale-95 focus:outline-none',
                    isRecording
                      ? 'border-destructive ring-2 ring-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25'
                      : 'bg-secondary hover:bg-muted text-foreground border-border hover:border-primary/60 hover:text-primary'
                  )}
                >
                  <MoreVertical className="h-4 sm:h-5 w-4 sm:w-5" />
                  {isRecording && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="center" sideOffset={12} className="w-56 mb-1">
                <DropdownMenuLabel>Room Options</DropdownMenuLabel>
                
                {/* Record Call Audio Option in Dropdown */}
                {onToggleRecording && (
                  <DropdownMenuItem
                    onClick={onToggleRecording}
                    className={cn(isRecording && 'text-destructive font-bold bg-destructive/10')}
                  >
                    <Disc className={cn('h-4 w-4 mr-2 shrink-0', isRecording ? 'text-destructive animate-spin' : 'text-foreground')} />
                    <span>{isRecording ? 'Stop Call Recording' : 'Record Call Audio'}</span>
                  </DropdownMenuItem>
                )}

                {onOpenProfile && (
                  <DropdownMenuItem onClick={onOpenProfile}>
                    <Sliders className="h-4 w-4 mr-2 text-primary shrink-0" />
                    <span>Profile & Sounds</span>
                  </DropdownMenuItem>
                )}

                {/* Active Speaker Specific Media Options */}
                {role === 'active' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Stage Media</DropdownMenuLabel>

                    {onToggleVideo && (
                      <DropdownMenuItem onClick={onToggleVideo}>
                        {isVideoEnabled ? (
                          <>
                            <VideoOff className="h-4 w-4 mr-2 text-destructive shrink-0" />
                            <span>Turn Off Camera</span>
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4 mr-2 text-accent-gold shrink-0" />
                            <span>Turn On Camera</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem onClick={onToggleScreenShare}>
                      {isScreenSharing ? (
                        <>
                          <Monitor className="h-4 w-4 mr-2 text-accent-coral animate-pulse shrink-0" />
                          <span>Stop Screen Share</span>
                        </>
                      ) : (
                        <>
                          <Monitor className="h-4 w-4 mr-2 text-foreground shrink-0" />
                          <span>Share Screen</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 4. Leave Room Button */}
            <button
              onClick={() => setLeaveModalOpen(true)}
              aria-label="Leave Room"
              title="Leave Room"
              className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-brutal-sm border-2 border-destructive/60 bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-150 active:scale-95"
            >
              <LogOut className="h-4 sm:h-5 w-4 sm:w-5" />
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

      {/* Leave Room Confirmation Dialog */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Voice Room?</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect from this junction? You will leave the stage and waiting queue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setLeaveModalOpen(false)}>
              Stay
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setLeaveModalOpen(false);
                onLeaveRoom();
              }}
            >
              Confirm Exit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
