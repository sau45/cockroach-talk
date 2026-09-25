'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Socket } from 'socket.io-client';
import { MessageSquare, X, Send, CornerDownRight, Smile } from 'lucide-react';
import { CommentItem, UserProfile } from '@/types';
import { apiClient } from '@/lib/api';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { useTyping } from '@/hooks/useTyping';
import { useVotes } from '@/hooks/useVotes';
import { ChatMessageSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  socket: Socket | null;
  user: UserProfile | null;
}

const EMOJIS = ['😂', '👀', '💯', '👍', '👎', '✨', '🔥'];

export function ChatWindow({ isOpen, onClose, roomId, socket, user }: ChatWindowProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'best' | 'new' | 'old' | 'controversial'>('best');
  const [inputBody, setInputBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);


  const { onUserTyping, onUserStopTyping, typingMessage } = useTyping({
    socket,
    myTag: user?.tag
  });

  const { userVotes, voteComment } = useVotes(comments, setComments);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const res = await apiClient<{ success: boolean; comments: CommentItem[] }>(
        `/api/comments?roomId=${encodeURIComponent(roomId)}&sort=${sort}`
      );
      if (res.success) {
        setComments(res.comments);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId, sort]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Socket event listeners for real-time threads
  useEffect(() => {
    if (!socket) return;

    const handleNewComment = (comment: CommentItem) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === comment._id)) return prev;
        return [...prev, comment];
      });

      // Auto scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    };

    const handleUpdated = (comment: CommentItem) => {
      setComments((prev) => prev.map((c) => (c._id === comment._id ? comment : c)));
    };

    const handleDeleted = ({ id }: { id: string }) => {
      setComments((prev) => prev.filter((c) => c._id !== id));
    };

    const handleVote = ({ id, score, upvotes, downvotes }: any) => {
      setComments((prev) =>
        prev.map((c) => (c._id === id ? { ...c, score, upvotes, downvotes } : c))
      );
    };

    const handleReplyNotify = ({ parentId }: any) => {
      setHighlightedId(parentId);
      setTimeout(() => setHighlightedId(null), 2500);
    };

    socket.on('thread:new', handleNewComment);
    socket.on('thread:updated', handleUpdated);
    socket.on('thread:deleted', handleDeleted);
    socket.on('thread:vote', handleVote);
    socket.on('thread:reply-notify', handleReplyNotify);

    return () => {
      socket.off('thread:new', handleNewComment);
      socket.off('thread:updated', handleUpdated);
      socket.off('thread:deleted', handleDeleted);
      socket.off('thread:vote', handleVote);
      socket.off('thread:reply-notify', handleReplyNotify);
    };
  }, [socket]);

  // Submit comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = inputBody.trim();
    if (!body || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await apiClient<{ success: boolean; comment: CommentItem }>('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          roomId,
          body,
          parentId: replyingTo?.id || null
        })
      });

      setInputBody('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setReplyingTo(null);
      onUserStopTyping();
    } catch (err: any) {
      console.error('Error posting comment:', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll smoothly to parent comment
  const scrollToParent = (parentId: string) => {
    const el = document.getElementById(`comment-${parentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(parentId);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  };

  const insertEmojiAtCursor = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setInputBody((prev) => prev + emoji);
      return;
    }

    const start = textarea.selectionStart ?? inputBody.length;
    const end = textarea.selectionEnd ?? inputBody.length;
    const newText = inputBody.substring(0, start) + emoji + inputBody.substring(end);
    const newCursorPos = start + emoji.length;

    setInputBody(newText);

    // Refocus, place cursor directly after inserted emoji, and resize
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    });
  };

  if (!mounted) return null;

  return createPortal(
    <aside
      id="chat-drawer"
      className={cn(
        'fixed inset-y-0 right-0 w-full sm:w-[400px] max-w-full h-[100dvh] max-h-[100dvh] bg-card border-l-2 sm:border-l-4 border-border shadow-2xl z-[70] flex flex-col transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
      )}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b-2 border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
          <h2 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wide">
            Talk
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="text-[11px] sm:text-xs bg-secondary border border-border rounded-brutal-sm px-2 py-1 font-mono text-foreground focus:outline-none focus:border-primary"
          >
            <option value="best">Best</option>
            <option value="new">New</option>
            <option value="old">Old</option>
            <option value="controversial">Controversial</option>
          </select>

          <button
            onClick={onClose}
            aria-label="Close chat"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className="h-4 sm:h-5 w-4 sm:w-5" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-3 space-y-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <ChatMessageSkeleton key={idx} />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-sm font-sans p-6">
            <MessageSquare className="h-9 w-9 text-border mb-2" />
            <p className="font-bold text-foreground mb-1 text-xs sm:text-sm">No comments yet</p>
            <p className="text-[11px] sm:text-xs">Be the first to share your thoughts in this junction!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <MessageBubble
              key={comment._id}
              comment={comment}
              comments={comments}
              myTag={user?.tag}
              userVote={userVotes[comment._id]}
              onVote={voteComment}
              onReply={(id, name) => {
                setReplyingTo({ id, name });
                textareaRef.current?.focus();
              }}
              onDelete={async (id) => {
                try {
                  await apiClient(`/api/comments/${id}`, { method: 'DELETE' });
                } catch (e) {
                  console.error(e);
                }
              }}
              onScrollToParent={scrollToParent}
              isHighlighted={highlightedId === comment._id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Replying Banner */}
      {replyingTo && (
        <div className="shrink-0 flex items-center justify-between px-3 py-1 bg-secondary text-xs text-accent-coral border-t border-border">
          <div className="flex items-center gap-1.5 truncate">
            <CornerDownRight className="h-3 w-3 shrink-0" />
            <span className="truncate text-[11px]">
              Replying to <strong className="text-foreground">{replyingTo.name}</strong>
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-muted-foreground hover:text-foreground text-[10px] uppercase font-bold"
          >
            (cancel)
          </button>
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 p-2 sm:p-2.5 border-t-2 border-border bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <TypingIndicator message={typingMessage} />

        {/* Inline Quick Reaction Emojis + Full Emoji Picker Button */}
        <div className="flex items-center justify-between gap-1 mb-1.5 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmojiAtCursor(emoji)}
                className="text-sm sm:text-base hover:scale-125 transition-transform p-0.5"
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Full Emoji Picker Popover Trigger in Bar */}
          <EmojiPickerPopover onSelectEmoji={insertEmojiAtCursor}>
            <button
              type="button"
              aria-label="Browse full emoji picker"
              title="Browse all emojis"
              className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded-brutal-sm hover:bg-secondary shrink-0 border border-transparent hover:border-border cursor-pointer"
            >
              <Smile className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>More</span>
            </button>
          </EmojiPickerPopover>
        </div>

        <div className="flex gap-1.5 sm:gap-2 items-end">
          <div className="relative flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputBody}
              onChange={(e) => {
                setInputBody(e.target.value);
                onUserTyping();
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={user ? "What are your thoughts?" : "Joining session..."}
              disabled={!user}
              maxLength={1000}
              className="w-full bg-background text-foreground text-xs sm:text-sm border-2 border-border rounded-brutal-sm py-1.5 sm:py-2 pl-2.5 pr-8 sm:pr-9 placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none font-sans min-h-[38px] sm:min-h-[42px] max-h-[100px] leading-snug block"
            />

            {/* Dedicated Emoji Picker trigger inside the message input */}
            <div className="absolute right-1.5 sm:right-2 bottom-[5px]">
              <EmojiPickerPopover onSelectEmoji={insertEmojiAtCursor}>
                <button
                  type="button"
                  aria-label="Open emoji picker"
                  title="Choose Emoji"
                  className="p-1 rounded text-muted-foreground hover:text-primary transition-colors hover:bg-secondary focus:outline-none cursor-pointer flex items-center justify-center"
                >
                  <Smile className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </EmojiPickerPopover>
            </div>
          </div>

          <button
            type="submit"
            disabled={!inputBody.trim() || isSubmitting || !user}
            aria-label="Send message"
            title="Send message"
            className={cn(
              'h-[38px] w-[38px] sm:h-[42px] sm:w-[42px] shrink-0 rounded-brutal-sm border-2 flex items-center justify-center transition-all duration-150 active:scale-95',
              inputBody.trim() && user && !isSubmitting
                ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 cursor-pointer shadow-sm'
                : 'bg-secondary/60 text-muted-foreground/40 border-border/60 cursor-not-allowed'
            )}
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </form>
    </aside>,
    document.body
  );
}
