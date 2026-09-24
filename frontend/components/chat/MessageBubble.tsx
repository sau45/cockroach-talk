'use client';

import React, { useState } from 'react';
import { Reply, Trash2, AlertCircle, Flag } from 'lucide-react';
import { CommentItem } from '@/types';
import { QuoteBlock } from './QuoteBlock';
import { VoteControls } from './VoteControls';
import { ReportDialog } from './ReportDialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getAccentPalette } from '@/lib/palette';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  comment: CommentItem;
  comments: CommentItem[];
  myTag?: string;
  userVote?: number;
  onVote: (id: string, val: 1 | -1) => void;
  onReply: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onScrollToParent: (id: string) => void;
  isHighlighted?: boolean;
}

export function MessageBubble({
  comment,
  comments,
  myTag,
  userVote,
  onVote,
  onReply,
  onDelete,
  onScrollToParent,
  isHighlighted = false
}: MessageBubbleProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const isMine = comment.authorTag === myTag;
  const time = new Date(comment.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const palette = getAccentPalette(comment.authorAccentColor);
  const bubbleStyle = comment.authorBubbleStyle || 'rounded';

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete(comment._id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  if (comment.isDeleted) {
    return (
      <div
        id={`comment-${comment._id}`}
        className={cn(
          'p-3 rounded-brutal-sm border-2 border-border/50 bg-card/40 my-2 transition-colors duration-300',
          isHighlighted && 'bg-primary/20 border-primary'
        )}
      >
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
          <span>{isMine ? 'You' : comment.authorName}</span>
          <span>· {time}</span>
        </div>
        <QuoteBlock
          parentId={comment.parentId}
          comments={comments}
          myTag={myTag}
          onScrollToParent={onScrollToParent}
        />
        <p className="text-xs italic text-muted-foreground">
          {isMine ? '🚫 You deleted this message' : '🚫 This message was deleted'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        id={`comment-${comment._id}`}
        className={cn(
          'p-3 my-2 border-2 bg-card shadow-brutal-dark-sm transition-all duration-300',
          palette.borderClass,
          bubbleStyle === 'sharp' && 'rounded-none',
          bubbleStyle === 'rounded' && 'rounded-brutal-md',
          bubbleStyle === 'outline' && 'rounded-brutal-sm border-dashed',
          isHighlighted && 'ring-2 ring-primary scale-[1.01]'
        )}
      >
        <div className="flex justify-between items-center text-xs mb-1.5 gap-2">
          <div className="flex items-center gap-2 truncate">
            <UserAvatar
              name={comment.authorName}
              tag={comment.authorTag}
              avatarType={comment.authorAvatarType}
              avatarValue={comment.authorAvatarValue}
              accentColor={comment.authorAccentColor}
              size="xs"
            />

            {!isMine ? (
              <button
                onClick={() => setReportOpen(true)}
                title="Click to report user"
                className={cn(
                  'font-bold font-mono truncate hover:underline transition-colors text-left',
                  palette.textClass
                )}
              >
                {comment.authorName}
              </button>
            ) : (
              <span className={cn('font-bold font-mono truncate', palette.textClass)}>
                {comment.authorName}
              </span>
            )}

            {comment.authorStatus && (
              <span
                className={cn(
                  'text-[9px] font-mono px-1.5 py-0.5 rounded border max-w-[140px] truncate hidden sm:inline-block',
                  palette.borderClass,
                  palette.bgClass
                )}
              >
                {comment.authorStatus}
              </span>
            )}

            <span className="text-muted-foreground shrink-0 font-sans text-[11px]">· {time}</span>
          </div>

          {isMine && (
            <button
              onClick={handleDeleteClick}
              aria-label="Delete comment"
              className={cn(
                'p-1 text-muted-foreground hover:text-destructive transition-colors rounded text-xs flex items-center gap-1',
                confirmDelete && 'text-destructive font-bold'
              )}
            >
              {confirmDelete ? (
                <>
                  <AlertCircle className="h-3 w-3" />
                  <span>Sure?</span>
                </>
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        <QuoteBlock
          parentId={comment.parentId}
          comments={comments}
          myTag={myTag}
          onScrollToParent={onScrollToParent}
        />

        <p className="text-sm text-foreground whitespace-pre-wrap break-words my-1 font-sans">
          {comment.body}
        </p>

        <div className="flex items-center gap-4 mt-2 pt-1 border-t border-border/40 text-xs text-muted-foreground">
          <VoteControls
            score={comment.score}
            userVote={userVote}
            onVote={(val) => onVote(comment._id, val)}
            disabled={isMine}
          />

          <button
            onClick={() => onReply(comment._id, comment.authorName)}
            className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
          >
            <Reply className="h-3.5 w-3.5" />
            <span>Reply</span>
          </button>

          {!isMine && (
            <button
              onClick={() => setReportOpen(true)}
              className="flex items-center gap-1 hover:text-accent-coral transition-colors font-medium ml-auto"
              title="Report this message"
            >
              <Flag className="h-3.5 w-3.5" />
              <span>Report</span>
            </button>
          )}
        </div>
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportedTag={comment.authorTag}
        reportedName={comment.authorName}
        messageId={comment._id}
        messageText={comment.body}
        reporterTag={myTag}
      />
    </>
  );
}
