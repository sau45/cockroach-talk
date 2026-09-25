'use client';

import React from 'react';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoteControlsProps {
  score: number;
  userVote?: number;
  onVote: (val: 1 | -1) => void;
  disabled?: boolean;
}

export function VoteControls({ score, userVote = 0, onVote, disabled = false }: VoteControlsProps) {
  return (
    <div className="flex items-center gap-0.5 font-mono text-[10px] sm:text-xs">
      <button
        onClick={() => onVote(1)}
        disabled={disabled}
        aria-label="Upvote"
        className={cn(
          'p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40',
          userVote === 1 && 'text-primary'
        )}
      >
        <ArrowBigUp className={cn('h-3.5 w-3.5', userVote === 1 && 'fill-current')} />
      </button>

      <span
        className={cn(
          'min-w-[1rem] text-center font-bold leading-none',
          score > 0 ? 'text-primary' : score < 0 ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        {score}
      </span>

      <button
        onClick={() => onVote(-1)}
        disabled={disabled}
        aria-label="Downvote"
        className={cn(
          'p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40',
          userVote === -1 && 'text-destructive'
        )}
      >
        <ArrowBigDown className={cn('h-3.5 w-3.5', userVote === -1 && 'fill-current')} />
      </button>
    </div>
  );
}
