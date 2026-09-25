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
          'px-2 py-1.5 sm:px-2.5 sm:py-2 my-0.5 sm:my-1 border sm:border-2 bg-card shadow-sm transition-all duration-200',
          bubbleStyle === 'sharp' && 'rounded-none',
          bubbleStyle === 'rounded' && 'rounded-brutal-sm',
          bubbleStyle === 'outline' && 'rounded-brutal-sm border-dashed',
          isHighlighted && 'ring-2 ring-primary scale-[1.01]'
        )}
        style={{ borderColor: palette.hex }}
      >
        <div className="flex justify-between items-center text-[11px] sm:text-xs mb-0.5 gap-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <UserAvatar
              name={comment.authorName}
              tag={comment.authorTag}
              avatarType={comment.authorAvatarType}
              avatarValue={comment.authorAvatarValue}
              accentColor={comment.authorAccentColor}
              size="xs"
              className="h-5 w-5 sm:h-6 sm:w-6 text-[9px] sm:text-[10px]"
            />

            {!isMine ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReportOpen(true);
                }}
                title="Click to report user"
                className="font-bold font-mono text-[11px] sm:text-xs truncate hover:underline transition-colors text-left cursor-pointer"
                style={{ color: palette.hex }}
              >
                {comment.authorName}
              </button>
            ) : (
              <span
                className="font-bold font-mono text-[11px] sm:text-xs truncate"
                style={{ color: palette.hex }}
              >
                {comment.authorName}
              </span>
            )}

            {comment.authorStatus && (
              <span
                className="text-[8.5px] font-mono px-1 py-0.5 rounded border max-w-[120px] truncate hidden sm:inline-block leading-none"
                style={{
                  borderColor: palette.hex,
                  backgroundColor: `${palette.hex}18`,
                  color: palette.hex
                }}
              >
                {comment.authorStatus}
              </span>
            )}

            <span className="text-muted-foreground shrink-0 font-sans text-[9.5px] sm:text-[10px]">· {time}</span>
          </div>

          {isMine && (
            <button
              type="button"
              onClick={handleDeleteClick}
              aria-label="Delete comment"
              className={cn(
                'p-0.5 text-muted-foreground hover:text-destructive transition-colors rounded text-xs flex items-center gap-1 cursor-pointer',
                confirmDelete && 'text-destructive font-bold'
              )}
            >
              {confirmDelete ? (
                <>
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-[10px]">Sure?</span>
                </>
              ) : (
                <Trash2 className="h-3 w-3" />
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

        <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap break-words my-0.5 font-sans leading-tight sm:leading-snug">
          {comment.body}
        </p>

        <div className="flex items-center gap-2.5 sm:gap-3 mt-1 pt-0.5 text-[10px] sm:text-[11px] text-muted-foreground/80">
          <VoteControls
            score={comment.score}
            userVote={userVote}
            onVote={(val) => onVote(comment._id, val)}
            disabled={isMine}
          />

          <button
            type="button"
            onClick={() => onReply(comment._id, comment.authorName)}
            className="flex items-center gap-1 hover:text-foreground transition-colors font-medium text-[10px] sm:text-[11px] cursor-pointer"
          >
            <Reply className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span>Reply</span>
          </button>

          {!isMine && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReportOpen(true);
              }}
              className="flex items-center gap-1 hover:text-accent-coral transition-colors font-medium ml-auto text-[10px] sm:text-[11px] cursor-pointer"
              title="Report this message"
            >
              <Flag className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
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
