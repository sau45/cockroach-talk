'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bug,
  Sparkles,
  User,
  Shield,
  FileText,
  MessageSquare,
  Mail,
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthorTag } from '@/hooks/useAuthorTag';
import { useSocket } from '@/hooks/useSocket';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { isConsentComplete } from '@/components/onboarding/ConsentGate';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { ProfileCustomizerModal } from '@/components/profile/ProfileCustomizerModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { ContactModal } from '@/components/contact/ContactModal';

export function Navbar() {
  const { user, customizeProfile, rerollName } = useAuthorTag();
  const { socket } = useSocket();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const hasName = Boolean(mounted && isConsentComplete() && user?.handle && user.handle.trim().length > 0 && user?.hasChosenGender);

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
                Talk
              </span>
              <span className="text-[10px] font-mono text-primary font-bold hidden sm:inline">
                Live State Voice Junctions
              </span>
            </div>
          </Link>

          {/* Header Actions: Feedback & User Dropdown */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-brutal-sm border-2 border-border bg-card shadow-brutal-dark-sm hover:border-primary hover:text-primary transition-all text-xs font-mono font-bold text-muted-foreground group"
              title="Share feedback or suggestions"
            >
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span>Feedback</span>
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="User navigation & preferences menu"
                    title={hasName ? user.handle : 'Anonymous Guest'}
                    className="flex items-center justify-center h-9 w-9 rounded-brutal-sm border-2 border-border bg-card shadow-brutal-dark-sm hover:border-primary transition-all text-foreground group focus:outline-none focus:ring-2 focus:ring-primary overflow-hidden"
                  >
                    {hasName ? (
                      <UserAvatar
                        name={user.handle}
                        tag={user.tag}
                        avatarType={user.avatarType}
                        avatarValue={user.avatarValue}
                        accentColor={user.accentColor}
                        size="xs"
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 p-2">
                  {/* User Profile Info Header */}
                  <div className="p-2 mb-1 rounded-brutal-sm border border-border bg-secondary/30 flex items-center gap-2.5">
                    {hasName ? (
                      <UserAvatar
                        name={user.handle}
                        tag={user.tag}
                        avatarType={user.avatarType}
                        avatarValue={user.avatarValue}
                        accentColor={user.accentColor}
                        size="sm"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-brutal-sm border border-border bg-secondary flex items-center justify-center text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-xs text-foreground truncate">
                        {hasName ? user.handle : 'Anonymous Guest'}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">
                        #{user.tag || '0000'} · {hasName ? (user.gender ? user.gender.toUpperCase() : 'ANONYMOUS') : 'NO NAME ALLOTTED'}
                      </p>
                    </div>
                  </div>

                  {/* Profile Actions */}
                  {hasName ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => setProfileOpen(true)}
                        className="gap-2.5 text-xs font-mono font-semibold text-foreground group cursor-pointer"
                      >
                        <Sliders className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                        <span className="group-hover:text-primary transition-colors">Customize Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          await rerollName();
                        }}
                        className="gap-2.5 text-xs font-mono font-semibold text-foreground group cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4 text-accent-gold group-hover:rotate-45 transition-transform" />
                        <span className="group-hover:text-accent-gold transition-colors">Re-roll Name</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-consent-gate', { detail: { step: 1 } }));
                      }}
                      className="gap-2.5 text-xs font-mono font-bold text-accent-gold bg-accent-gold/10 border border-accent-gold/30 hover:bg-accent-gold hover:text-black focus:bg-accent-gold focus:text-black transition-all group cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-accent-gold group-hover:text-black group-focus:text-black transition-colors" />
                      <span>Choose Gender &amp; Get Name</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="my-1.5" />

                  {/* Theme Change Option */}
                  <div className="px-2 py-2 my-1 rounded-brutal-sm border border-border bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
                      <span className="flex items-center gap-2">
                        {mounted ? (
                          theme === 'dark' ? (
                            <Moon className="h-3.5 w-3.5 text-primary" />
                          ) : theme === 'light' ? (
                            <Sun className="h-3.5 w-3.5 text-accent-gold" />
                          ) : (
                            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                          )
                        ) : (
                          <Moon className="h-3.5 w-3.5 text-primary" />
                        )}
                        Theme
                      </span>
                      <span className="text-[10px] uppercase font-mono text-primary font-bold">
                        {mounted ? theme : 'dark'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 p-0.5 bg-background rounded-brutal-sm border border-border">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center gap-1 py-1 px-1 rounded-sm text-[11px] font-mono font-bold transition-all ${
                          mounted && theme === 'light'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <Sun className="h-3 w-3" /> Light
                      </button>

                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex items-center justify-center gap-1 py-1 px-1 rounded-sm text-[11px] font-mono font-bold transition-all ${
                          mounted && theme === 'dark'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <Moon className="h-3 w-3" /> Dark
                      </button>

                      <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={`flex items-center justify-center gap-1 py-1 px-1 rounded-sm text-[11px] font-mono font-bold transition-all ${
                          mounted && theme === 'system'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <Monitor className="h-3 w-3" /> Auto
                      </button>
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-1.5" />

                  {/* Shared Image Content: Privacy Policy, Terms, Feedback, Contact */}
                  <DropdownMenuItem asChild>
                    <Link href="/privacy" className="gap-2.5 text-xs font-mono font-semibold text-foreground hover:text-primary focus:text-primary w-full group cursor-pointer">
                      <Shield className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="transition-colors">Privacy Policy</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/terms" className="gap-2.5 text-xs font-mono font-semibold text-foreground hover:text-primary focus:text-primary w-full group cursor-pointer">
                      <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="transition-colors">Terms of Service</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setFeedbackOpen(true)}
                    className="gap-2.5 text-xs font-mono font-semibold text-foreground hover:text-primary focus:text-primary group cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="transition-colors">Feedback</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setContactOpen(true)}
                    className="gap-2.5 text-xs font-mono font-semibold text-foreground hover:text-primary focus:text-primary group cursor-pointer"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="transition-colors">Contact Us</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </>
  );
}
