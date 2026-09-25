'use client';

import React from 'react';
import { CommentItem } from '@/types';
import { cn } from '@/lib/utils';

interface QuoteBlockProps {
  parentId?: string | null;
  comments: CommentItem[];
  myTag?: string;
  onScrollToParent?: (parentId: string) => void;
}

export function QuoteBlock({ parentId, comments, myTag, onScrollToParent }: QuoteBlockProps) {
  if (!parentId) return null;

  const parent = comments.find((c) => c._id === parentId);

  if (!parent) {
    return (
      <div className="mb-1 rounded-brutal-sm border-l-2 sm:border-l-4 border-border bg-card/60 p-1.5 sm:p-2 text-[11px] sm:text-xs italic text-muted-foreground line-clamp-2">
        🚫 This message was deleted
      </div>
    );
  }

  const isMine = parent.authorTag === myTag;
  const previewText = parent.isDeleted
    ? isMine
      ? '🚫 You deleted this message'
      : '🚫 This message was deleted'
    : parent.body.length > 80
    ? `${parent.body.substring(0, 80)}...`
    : parent.body;

  return (
    <div
      onClick={() => onScrollToParent && onScrollToParent(parentId)}
      className={cn(
        'mb-1 cursor-pointer rounded-brutal-sm border-l-2 sm:border-l-4 border-primary bg-card/80 p-1.5 sm:p-2 text-[11px] sm:text-xs transition-colors hover:bg-card',
        parent.isDeleted && 'border-border opacity-70'
      )}
    >
      <div className="font-bold text-foreground truncate">{parent.authorName}</div>
      <div className={cn('text-muted-foreground line-clamp-2', parent.isDeleted && 'italic')}>
        {previewText}
      </div>
    </div>
  );
}
