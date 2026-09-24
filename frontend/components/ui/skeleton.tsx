import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Standard Shadcn Skeleton Primitive
 * High contrast light gray pulse for dark theme visibility
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-zinc-700/70 dark:bg-zinc-800/90 border border-white/5',
        className
      )}
      {...props}
    />
  );
}

/**
 * Content Skeleton matching Junction Card (Junctions directory & homepage)
 */
export function JunctionCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-4 rounded-brutal-md border-2 border-border bg-card shadow-brutal-dark-sm flex flex-col justify-between h-[150px] space-y-4 animate-pulse',
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24 rounded-full bg-zinc-600/80" />
          <Skeleton className="h-4 w-4 rounded-sm bg-zinc-600/80" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded-md bg-zinc-600/90" />
      </div>

      <div className="pt-4 border-t border-border/60 flex items-center justify-between">
        {/* Stacked Avatars Placeholder */}
        <div className="flex items-center -space-x-2">
          <Skeleton className="h-7 w-7 rounded-full bg-zinc-600/90 ring-2 ring-background" />
          <Skeleton className="h-7 w-7 rounded-full bg-zinc-700/90 ring-2 ring-background" />
          <Skeleton className="h-7 w-7 rounded-full bg-zinc-700/70 ring-2 ring-background" />
        </div>
        <Skeleton className="h-4 w-12 rounded-md bg-zinc-700/80" />
      </div>
    </div>
  );
}

/**
 * Content Skeleton matching 8-Speaker Stage Grid Chip
 */
export function StageChipSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center p-2 rounded-brutal-md border-2 border-border bg-card shadow-brutal-dark-sm space-y-2 animate-pulse',
        className
      )}
    >
      <div className="relative w-full aspect-[4/3] rounded-brutal-sm border border-border bg-zinc-900 overflow-hidden flex items-center justify-center">
        {/* Micro avatar placeholder */}
        <Skeleton className="h-12 w-12 rounded-full bg-zinc-700/90" />
        {/* Top left badge placeholder */}
        <Skeleton className="absolute top-1.5 left-1.5 h-4 w-12 rounded bg-zinc-700/80" />
        {/* Bottom right icon placeholder */}
        <Skeleton className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-zinc-700/80" />
      </div>

      <div className="w-full flex items-center justify-center pt-0.5">
        <Skeleton className="h-4 w-24 rounded-md bg-zinc-600/90" />
      </div>
    </div>
  );
}

/**
 * Content Skeleton matching Waiting Queue Member Row
 */
export function WaitingQueueItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-2.5 rounded-brutal-sm border-2 border-border bg-card shadow-brutal-dark-sm gap-2 animate-pulse',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Skeleton className="h-3 w-4 bg-zinc-600/80 shrink-0" />
        <Skeleton className="h-8 w-8 rounded-full bg-zinc-700/90 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-28 rounded-md bg-zinc-600/90" />
          <Skeleton className="h-2.5 w-16 rounded-md bg-zinc-700/80" />
        </div>
      </div>
      <Skeleton className="h-7 w-12 rounded-brutal-sm bg-zinc-600/90 shrink-0" />
    </div>
  );
}

/**
 * Content Skeleton matching Junctions Sidebar Row
 */
export function JunctionSidebarItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 border-b border-border bg-card animate-pulse gap-2',
        className
      )}
    >
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-32 bg-zinc-600/90 rounded-md" />
        <Skeleton className="h-2.5 w-20 bg-zinc-700/80 rounded-md" />
      </div>
      <Skeleton className="h-5 w-14 bg-zinc-600/90 rounded-brutal-sm shrink-0" />
    </div>
  );
}

/**
 * Content Skeleton matching Chat Window Message Bubble
 */
export function ChatMessageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 p-2 animate-pulse', className)}>
      <Skeleton className="h-8 w-8 rounded-full bg-zinc-700/90 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-24 bg-zinc-600/90 rounded-md" />
          <Skeleton className="h-2.5 w-14 bg-zinc-700/70 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full bg-zinc-700/70 rounded-brutal-sm border border-border" />
      </div>
    </div>
  );
}

/**
 * Content Skeleton matching Admin Audit Stream Row
 */
export function AdminAuditItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-4 rounded-brutal-md border-2 border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse',
        className
      )}
    >
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 rounded bg-zinc-600/90" />
          <Skeleton className="h-4 w-36 rounded bg-zinc-600/80" />
          <Skeleton className="h-4 w-28 rounded bg-zinc-700/80" />
        </div>
        <Skeleton className="h-8 w-3/4 rounded bg-zinc-700/70" />
      </div>
      <Skeleton className="h-8 w-28 rounded bg-zinc-600/90 shrink-0" />
    </div>
  );
}


