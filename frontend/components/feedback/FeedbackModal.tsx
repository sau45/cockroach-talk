'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, Check, Sparkles } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState<'suggestion' | 'bug' | 'praise' | 'other'>('suggestion');
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFeedbackText('');
      onClose();
    }, 1800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] border-3 border-border bg-card shadow-brutal-lg rounded-brutal-md p-6 gap-5">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-brutal-sm border border-border bg-primary/20 text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-black font-mono tracking-tight uppercase">
              Send Feedback
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            Help improve CockroachTalk live voice rooms. Zero tracking, completely anonymous.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="p-6 text-center space-y-2 bg-primary/10 rounded-brutal-sm border-2 border-primary animate-in fade-in-50">
            <Check className="h-8 w-8 text-primary mx-auto" />
            <p className="font-mono font-bold text-sm uppercase">Feedback Received!</p>
            <p className="text-xs text-muted-foreground">Thank you for making our junctions better.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              {(['suggestion', 'bug', 'praise', 'other'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex-1 py-1.5 px-2 rounded-brutal-sm border text-[11px] font-mono font-bold capitalize transition-all ${
                    category === cat
                      ? 'border-primary bg-primary text-primary-foreground shadow-brutal-sm'
                      : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What's on your mind? Share your thoughts, feature requests, or report an issue..."
              className="w-full p-3 rounded-brutal-sm border-2 border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:border-primary resize-none placeholder:text-muted-foreground"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="font-mono text-xs uppercase"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="font-mono text-xs uppercase font-bold gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" /> Submit Feedback
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
