'use client';

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';

export type ReportCategory =
  | 'harassment'
  | 'spam'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'other';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedTag: string;
  reportedName: string;
  messageId?: string;
  messageText?: string;
  reporterTag?: string;
}

const CATEGORIES: { id: ReportCategory; label: string; description: string }[] = [
  {
    id: 'harassment',
    label: 'Harassment & Bullying',
    description: 'Personal attacks, threats, or targeted hostility'
  },
  {
    id: 'hate_speech',
    label: 'Hate Speech & Slurs',
    description: 'Discriminatory slurs, dehumanizing rhetoric, or identity attacks'
  },
  {
    id: 'spam',
    label: 'Spam & Flood',
    description: 'Repetitive messages, advertisement links, or chat flooding'
  },
  {
    id: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'Explicit, vulgar, or non-consensual material'
  },
  {
    id: 'other',
    label: 'Other Violation',
    description: 'Any other violation of community decency standards'
  }
];

export function ReportDialog({
  open,
  onOpenChange,
  reportedTag,
  reportedName,
  messageId,
  messageText,
  reporterTag
}: ReportDialogProps) {
  const [category, setCategory] = useState<ReportCategory>('harassment');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterTag) {
      setError('You must have an active session to submit a report.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          reporterTag,
          reportedTag,
          category,
          reason: category,
          note: note.trim() || undefined,
          messageId: messageId || undefined
        })
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setNote('');
        onOpenChange(false);
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] sm:w-full max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden bg-card border-3 border-border shadow-brutal-lg">
        {/* Fixed Header */}
        <div className="shrink-0 p-4 sm:p-5 pr-12 border-b-2 border-border bg-card">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-brutal-sm bg-accent-coral/20 border-2 border-accent-coral text-accent-coral shrink-0">
                <Flag className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg sm:text-xl font-black font-mono uppercase tracking-tight">
                Report Abuse
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground font-sans text-left">
              Reports are audited live and factor directly into our automated device strike and escalation system.
            </DialogDescription>
          </DialogHeader>
        </div>

        {submitted ? (
          <div className="py-12 px-6 text-center space-y-3 animate-in fade-in-50 flex flex-col items-center justify-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 border-2 border-primary text-primary flex items-center justify-center">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="font-mono text-base font-bold text-foreground">Report Submitted</h3>
            <p className="text-xs text-muted-foreground font-sans max-w-xs mx-auto">
              Thank you for keeping CockroachTalk clean and respectful. Our security engine has recorded this report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Target Identity Context */}
              <div className="p-2.5 rounded-brutal-sm border-2 border-border bg-secondary/30 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reported User:</span>
                  <span className="font-bold text-primary">{reportedName}</span>
                </div>
                {messageText && (
                  <div className="pt-1 border-t border-border/40 text-[11px] text-muted-foreground truncate italic">
                    &quot;{messageText}&quot;
                  </div>
                )}
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase text-foreground">
                  Violation Category
                </label>
                <div className="space-y-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`w-full text-left p-2.5 rounded-brutal-sm border-2 transition-all flex flex-col ${
                        category === cat.id
                          ? 'border-primary bg-primary/10 shadow-brutal-sm text-foreground'
                          : 'border-border bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold uppercase">{cat.label}</span>
                      <span className="font-sans text-[11px] opacity-80">{cat.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Note */}
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold uppercase text-foreground">
                  Additional Context (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe what occurred or what guidelines were broken..."
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-brutal-sm border-2 border-border bg-background p-2.5 font-sans text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-brutal-sm border-2 border-destructive bg-destructive/10 text-destructive text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="shrink-0 p-3 sm:p-4 border-t-2 border-border bg-card flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="gap-1.5 font-mono uppercase tracking-wider"
              >
                <ShieldAlert className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
