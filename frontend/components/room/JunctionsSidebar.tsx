'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Radio, Users } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { RoomSummary } from '@/types';
import { Input } from '@/components/ui/input';
import { JunctionSidebarItemSkeleton } from '@/components/ui/skeleton';
import { AvatarGroup } from '@/components/ui/AvatarGroup';
import { cn } from '@/lib/utils';

interface JunctionsSidebarProps {
  currentRoomId: string;
}

export function JunctionsSidebar({ currentRoomId }: JunctionsSidebarProps) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRooms() {
      try {
        const data = await apiClient<RoomSummary[]>('/api/rooms');
        setRooms(data);
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRooms();
    const interval = setInterval(loadRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="w-full md:w-80 flex-shrink-0 flex flex-col rounded-brutal-md border-3 border-border bg-card shadow-brutal-dark overflow-hidden h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="p-3 border-b-2 border-border bg-card/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary animate-pulse" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            All State Junctions
          </h3>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground font-bold">
          {rooms.length} Active
        </span>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border/80">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search state..."
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Junctions List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {loading ? (
          <div className="divide-y divide-border/40">
            {Array.from({ length: 6 }).map((_, idx) => (
              <JunctionSidebarItemSkeleton key={idx} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-muted-foreground">
            No junctions found.
          </div>
        ) : (
          filtered.map((room) => {
            const isCurrent = room.id === currentRoomId;

            return (
              <Link
                key={room.id}
                href={`/room/${room.id}`}
                className={cn(
                  'flex items-center justify-between p-3 transition-colors hover:bg-muted/80 border-l-4',
                  isCurrent ? 'bg-primary/10 border-primary' : 'border-transparent'
                )}
              >
                {/* Left Side: Room Name & Listener info */}
                <div className="min-w-0 pr-2 flex-1">
                  <p
                    className={cn(
                      'font-mono text-xs font-bold truncate',
                      isCurrent ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {room.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-mono">
                    <Users className="h-3 w-3 text-primary/70 shrink-0" />
                    <span>{room.totalListeners} in room</span>
                  </div>
                </div>

                {/* Right Side (Right End): Avatars Stack + LIVE Badge */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <AvatarGroup
                    users={room.allUsers || []}
                    totalCount={room.totalListeners}
                    maxDisplay={3}
                    size="xs"
                    showSingleName={false}
                  />

                  {room.activeMembersCount > 0 ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/50 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      {room.activeMembersCount} LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded border border-border">
                      0 live
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
