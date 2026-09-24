'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bug, Sparkles } from 'lucide-react';
import { useAuthorTag } from '@/hooks/useAuthorTag';
import { useSocket } from '@/hooks/useSocket';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ProfileCustomizerModal } from '@/components/profile/ProfileCustomizerModal';

export function Navbar() {
  const { user, customizeProfile, rerollName } = useAuthorTag();
  const { socket } = useSocket();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b-3 border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-brutal-sm border-2 border-border bg-primary text-primary-foreground shadow-brutal-sm group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform">
              <Bug className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold text-base tracking-wider uppercase text-foreground">
                CockroachTalk
              </span>
              <span className="text-[10px] font-mono text-primary font-bold hidden sm:inline">
                Live State Voice Junctions
              </span>
            </div>
          </Link>

          {/* Links & User Tag */}
          <div className="flex items-center gap-3">
            <Link
              href="/junctions"
              className="text-xs font-mono font-bold uppercase text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
            >
              Junctions Directory
            </Link>

            {user ? (
              <button
                onClick={() => setProfileOpen(true)}
                title="Click to customize your anonymous avatar, colors, and name"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-brutal-sm border-2 border-border bg-card shadow-brutal-dark-sm hover:border-primary transition-all text-xs font-mono font-bold group"
              >
                <UserAvatar
                  name={user.handle}
                  tag={user.tag}
                  avatarType={user.avatarType}
                  avatarValue={user.avatarValue}
                  accentColor={user.accentColor}
                  size="xs"
                />
                <span className="text-foreground group-hover:text-primary transition-colors">
                  {user.handle}
                </span>
                <Sparkles className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ) : (
              <Badge variant="outline" className="animate-pulse font-mono text-xs">
                Connecting...
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Profile Customizer Modal */}
      <ProfileCustomizerModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onSaveProfile={customizeProfile}
        onRerollName={rerollName}
        socket={socket}
      />
    </>
  );
}
