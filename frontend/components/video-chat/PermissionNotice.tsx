'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PermissionNoticeProps {
  error: string | null;
  onRetry: () => void;
}

export function PermissionNotice({ error, onRetry }: PermissionNoticeProps) {
  if (!error) return null;

  return (
    <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-brutal-md border-2 border-destructive bg-destructive/10 text-destructive shadow-brutal-sm animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="text-xs font-mono font-bold">{error}</span>
      </div>
      <Button
        size="sm"
        variant="destructive"
        onClick={onRetry}
        className="font-mono text-xs font-bold shrink-0 gap-1"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  );
}
