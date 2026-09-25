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
import { Mail, ShieldCheck, Copy, Check } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [copied, setCopied] = useState(false);
  const contactEmail = 'support@cockroachtalk.com';

  const handleCopy = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] border-3 border-border bg-card shadow-brutal-lg rounded-brutal-md p-6 gap-5">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-brutal-sm border border-border bg-primary/20 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-black font-mono tracking-tight uppercase">
              Contact Us
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            Direct communication channel for moderation inquiries, legal compliance, and support.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="p-4 rounded-brutal-sm border-2 border-border bg-secondary/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground uppercase font-bold">Official Support Email</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-mono text-primary hover:underline"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-sm font-bold text-foreground selection:bg-primary">
              {contactEmail}
            </p>
          </div>

          <div className="p-3.5 rounded-brutal-sm border border-border bg-background space-y-1.5 text-xs text-muted-foreground font-sans">
            <div className="flex items-center gap-1.5 text-foreground font-mono font-bold text-[11px] uppercase">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Grievance &amp; Compliance</span>
            </div>
            <p className="leading-relaxed">
              For DMCA notices, content moderation appeals, or law enforcement queries, please include your participant session tag in the email body.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="font-mono text-xs uppercase"
          >
            Close
          </Button>
          <Button
            asChild
            size="sm"
            className="font-mono text-xs uppercase font-bold gap-1.5"
          >
            <a href={`mailto:${contactEmail}`}>
              <Mail className="h-3.5 w-3.5" /> Open Email Client
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
