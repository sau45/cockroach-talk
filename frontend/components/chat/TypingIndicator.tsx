'use client';

import React from 'react';

interface TypingIndicatorProps {
  message: string | null;
}

export function TypingIndicator({ message }: TypingIndicatorProps) {
  if (!message) return <div className="h-4" />;

  return (
    <div className="h-4 text-xs italic font-mono text-accent-gold flex items-center gap-1.5 transition-all animate-pulse">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-gold animate-bounce" />
      <span>{message}</span>
    </div>
  );
}
