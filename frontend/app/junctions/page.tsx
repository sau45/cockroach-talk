'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Radio, Users, Lock } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { RoomSummary } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { JunctionCardSkeleton } from '@/components/ui/skeleton';
import { AvatarGroup } from '@/components/ui/AvatarGroup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

export default function JunctionsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
    const interval = setInterval(loadRooms, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !newPassword.trim()) {
      setCreateError('Topic and password are required');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await apiClient<{ success: boolean; roomId: string }>('/api/rooms/create-room', {
        method: 'POST',
        body: JSON.stringify({
          topic: newTopic.trim(),
          password: newPassword.trim()
        })
      });

      if (res.success && res.roomId) {
        setCreateModalOpen(false);
        router.push(`/room/${res.roomId}`);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-3 border-border pb-6">
        <div>
          <h1 className="text-3xl font-black font-mono uppercase tracking-tight text-foreground">
            State Voice Junctions
          </h1>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Browse all 28 State & UT cockroach voice rooms or spin up a temporary custom debate room.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Create Custom Room
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search state or custom room..."
            className="pl-10 h-10 bg-card"
          />
        </div>
        <Badge variant="outline" className="hidden sm:inline font-mono">
          {filtered.length} Junctions
        </Badge>
      </div>

      {/* Junctions Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <JunctionCardSkeleton key={idx} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center font-mono text-sm text-muted-foreground border-2 border-dashed border-border rounded-brutal-md">
          No junctions matching &quot;{query}&quot;
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((room) => (
            <Link
              key={room.id}
              href={`/room/${room.id}`}
              className="p-4 rounded-brutal-md border-2 border-primary/30 bg-card shadow-brutal-dark-sm hover:border-primary hover:shadow-brutal transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={room.isCustom ? 'secondary' : 'default'} className="text-[10px]">
                    {room.isCustom ? 'CUSTOM DEBATE' : 'STATE JUNCTION'}
                  </Badge>

                  {room.hasPassword && (
                    <span title="Password Protected" className="text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                <h3 className="font-mono font-bold text-base group-hover:text-primary transition-colors truncate">
                  {room.name}
                </h3>
              </div>

              {/* Bottom Row: Room count on Left, Avatars & LIVE Pill on Right Below */}
              <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {room.totalListeners} in room
                </span>

                <div className="flex items-center gap-2">
                  <AvatarGroup
                    users={room.allUsers || []}
                    totalCount={room.totalListeners}
                    maxDisplay={3}
                    size="xs"
                    showSingleName={false}
                  />

                  {room.activeMembersCount > 0 ? (
                    <span className="flex items-center gap-1 font-bold text-primary bg-primary/20 border border-primary/50 px-2 py-0.5 rounded-full text-[10px] shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      {room.activeMembersCount} LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded border border-border">
                      0 live
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Custom Room Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Room</DialogTitle>
            <DialogDescription>
              Spin up a temporary password-protected debate junction. Automatically deleted when empty for 5 minutes.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-2 text-xs text-destructive bg-destructive/10 border border-destructive rounded-brutal-sm font-mono">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateRoom} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-mono font-bold text-muted-foreground mb-1 uppercase">
                Room Topic (Max 50 chars)
              </label>
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g. AI & Engineering Debate"
                maxLength={50}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-muted-foreground mb-1 uppercase">
                Room Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Required for participants to join"
                maxLength={50}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create & Enter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
