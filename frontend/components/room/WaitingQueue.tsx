'use client';

import React, { useState } from 'react';
import { Hand, UserCheck, MessageCircle, Clock } from 'lucide-react';
import { QueueMember } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WaitingQueueItemSkeleton } from '@/components/ui/skeleton';
import { AdmitUserModal } from '@/components/room/AdmitUserModal';
import { cn } from '@/lib/utils';

interface WaitingQueueProps {
  waitingQueue: QueueMember[];
  myTag?: string;
  isMyModerator?: boolean;
  onAdmitUser?: (socketId: string, tag: string) => void;
  onToggleHand?: () => void;
  isLoading?: boolean;
}

export function WaitingQueue({
  waitingQueue,
  myTag,
  isMyModerator = false,
  onAdmitUser,
  onToggleHand,
  isLoading = false
}: WaitingQueueProps) {
  const [selectedQueueUser, setSelectedQueueUser] = useState<QueueMember | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, idx) => (
          <WaitingQueueItemSkeleton key={idx} />
        ))}
      </div>
    );
  }

  if (waitingQueue.length === 0) {
    return (
      <div className="p-4 rounded-brutal-md border-2 border-border/60 bg-card/20 text-center text-xs text-muted-foreground font-mono">
        Waiting queue is empty. Anyone in the audience can raise hand to speak!
      </div>
    );
  }

  const selectedIndex = selectedQueueUser
    ? waitingQueue.findIndex((q) => q.tag === selectedQueueUser.tag)
    : -1;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {waitingQueue.map((item, index) => {
          const isMe = item.tag === myTag;

          return (
            <div
              key={item.socketId || item.tag}
              onClick={() => setSelectedQueueUser(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedQueueUser(item)}
              title="Click to view participant details & stage options"
              className={cn(
                'group flex items-center justify-between p-2.5 rounded-brutal-sm border-2 border-border bg-card shadow-brutal-dark-sm gap-2 transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-brutal hover:border-primary',
                item.raisedHand && 'border-accent-coral bg-accent-coral/5',
                isMe && 'ring-2 ring-primary/40 bg-primary/5'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-muted-foreground w-4 shrink-0">
                  #{index + 1}
                </span>

                <Avatar className="h-8 w-8 border shrink-0">
                  <AvatarFallback className="text-xs bg-secondary font-mono font-bold">
                    {item.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-xs truncate text-foreground font-mono">
                      {item.name}
                    </p>
                    {isMe && (
                      <span className="text-[10px] text-primary font-mono font-bold shrink-0">
                        (You)
                      </span>
                    )}
                    {item.raisedHand && (
                      <Hand className="h-3.5 w-3.5 text-accent-coral shrink-0 animate-bounce" />
                    )}
                  </div>

                  {item.quickComment ? (
                    <div className="flex items-center gap-1 text-[10px] text-primary truncate italic">
                      <MessageCircle className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">&quot;{item.quickComment}&quot;</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {Math.floor((item.waitTimeMs || 0) / 60000)}m wait
                    </span>
                  )}
                </div>
              </div>

              {/* 1-Click Admit Button (Directly visible to active stage moderators) */}
              {isMyModerator && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdmitUser && onAdmitUser(item.socketId, item.tag);
                  }}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px] font-mono shrink-0 gap-1 bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:scale-105"
                >
                  <UserCheck className="h-3 w-3" />
                  Pop
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Participant Details & Admit Modal */}
      {selectedQueueUser && (
        <AdmitUserModal
          queueUser={selectedQueueUser}
          isOpen={!!selectedQueueUser}
          onClose={() => setSelectedQueueUser(null)}
          myTag={myTag}
          isMyModerator={isMyModerator}
          queuePosition={selectedIndex !== -1 ? selectedIndex + 1 : null}
          onAdmitUser={onAdmitUser}
          onToggleHand={onToggleHand}
        />
      )}
    </>
  );
}
