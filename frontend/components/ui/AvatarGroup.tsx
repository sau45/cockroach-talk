'use client';

import React from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';

export interface AvatarGroupUser {
  name: string;
  tag?: string;
  avatarType?: 'initials' | 'identicon' | 'emoji';
  avatarValue?: string;
  accentColor?: string;
}

interface AvatarGroupProps {
  users?: AvatarGroupUser[];
  totalCount?: number;
  maxDisplay?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showSingleName?: boolean;
  showLabel?: boolean;
}

export function AvatarGroup({
  users = [],
  totalCount,
  maxDisplay = 3,
  size = 'xs',
  className,
  showSingleName = false,
  showLabel = false
}: AvatarGroupProps) {
  const displayUsers = users.slice(0, maxDisplay);
  const effectiveTotal = totalCount !== undefined ? totalCount : users.length;
  const overflowCount = effectiveTotal > displayUsers.length ? effectiveTotal - displayUsers.length : 0;

  // Case 0: Empty Room
  if (effectiveTotal === 0 && users.length === 0) {
    return null;
  }

  // Case 1: Exactly 1 User in Room with single name enabled
  if (effectiveTotal === 1 && displayUsers.length === 1 && showSingleName) {
    const singleUser = displayUsers[0];
    return (
      <div className={cn('flex items-center gap-1.5 min-w-0', className)}>
        <UserAvatar
          name={singleUser.name}
          tag={singleUser.tag}
          avatarType={singleUser.avatarType}
          avatarValue={singleUser.avatarValue}
          accentColor={singleUser.accentColor}
          size={size}
          className="rounded-full ring-2 ring-background border border-border shadow-sm shrink-0"
        />
        <span
          className="font-mono text-xs font-bold text-foreground truncate max-w-[120px]"
          title={singleUser.name}
        >
          {singleUser.name}
        </span>
      </div>
    );
  }

  // Case 2: Avatar Stack (Max 3) + "+N" Badge on Right
  return (
    <div className={cn('flex items-center gap-1.5 shrink-0', className)}>
      <div className="flex items-center -space-x-2 hover:-space-x-0.5 transition-all duration-300">
        {displayUsers.map((user, index) => (
          <div
            key={user.tag || `${user.name}-${index}`}
            className="relative group/avatar transition-transform duration-200 hover:z-30 hover:-translate-y-0.5"
            style={{ zIndex: displayUsers.length - index }}
            title={user.name}
          >
            <UserAvatar
              name={user.name}
              tag={user.tag}
              avatarType={user.avatarType}
              avatarValue={user.avatarValue}
              accentColor={user.accentColor}
              size={size}
              className="rounded-full ring-2 ring-primary/50 border-2 border-card shadow-md bg-card"
            />
          </div>
        ))}

        {/* Overflow Badge (+N) on Right Side */}
        {overflowCount > 0 && (
          <div
            className={cn(
              'relative flex items-center justify-center rounded-full bg-primary/20 text-primary font-mono font-bold ring-2 ring-primary/50 border border-primary/50 shadow-md shrink-0 transition-transform hover:scale-105 z-0',
              size === 'xs' ? 'h-6 w-6 text-[9px]' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'
            )}
            title={`${overflowCount} more participant${overflowCount > 1 ? 's' : ''}`}
          >
            +{overflowCount}
          </div>
        )}
      </div>

      {showLabel && displayUsers.length > 0 && (
        <span className="font-mono text-[10px] text-muted-foreground truncate hidden sm:inline">
          {displayUsers[0].name}
          {effectiveTotal > 1 ? ` +${effectiveTotal - 1}` : ''}
        </span>
      )}
    </div>
  );
}

