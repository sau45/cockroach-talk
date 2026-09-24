'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Dices,
  Palette,
  Volume2,
  VolumeX,
  Check,
  AlertCircle,
  Smile,
  ShieldAlert,
  Sliders,
  Type
} from 'lucide-react';
import { UserProfile, SoundPreferences } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  ACCENT_PALETTES,
  CURATED_EMOJIS,
  CURATED_EMOJI_CATEGORIES,
  STATUS_MOOD_PRESETS,
  BUBBLE_STYLES,
  getAccentPalette
} from '@/lib/palette';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';

interface ProfileCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSaveProfile: (updates: {
    handle?: string;
    avatarType?: 'initials' | 'identicon' | 'emoji';
    avatarValue?: string;
    accentColor?: string;
    bubbleStyle?: 'sharp' | 'rounded' | 'outline';
    statusTag?: string;
  }) => Promise<any>;
  onRerollName: () => Promise<any>;
  socket?: any;
}

export function ProfileCustomizerModal({
  isOpen,
  onClose,
  user,
  onSaveProfile,
  onRerollName,
  socket
}: ProfileCustomizerModalProps) {
  // Form State
  const [handle, setHandle] = useState(user?.handle || '');
  const [avatarType, setAvatarType] = useState<'initials' | 'identicon' | 'emoji'>(
    user?.avatarType || 'initials'
  );
  const [avatarValue, setAvatarValue] = useState(user?.avatarValue || '');
  const [accentColor, setAccentColor] = useState(user?.accentColor || 'cyber-purple');
  const [bubbleStyle, setBubbleStyle] = useState<'sharp' | 'rounded' | 'outline'>(
    user?.bubbleStyle || 'rounded'
  );
  const [statusTag, setStatusTag] = useState(user?.statusTag || '');

  // UI / Async State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'identity' | 'appearance' | 'audio'>('identity');
  const [emojiCategory, setEmojiCategory] = useState<string>('all');

  const displayedEmojis = React.useMemo(() => {
    if (emojiCategory === 'all') return CURATED_EMOJIS;
    const cat = CURATED_EMOJI_CATEGORIES.find((c) => c.id === emojiCategory);
    return cat ? cat.emojis : CURATED_EMOJIS;
  }, [emojiCategory]);

  // Sound effects
  const { preferences, updatePreferences, playSendSound, playReceiveSound, playTypingSound } =
    useSoundEffects();

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setHandle(user.handle || '');
      setAvatarType(user.avatarType || 'initials');
      setAvatarValue(user.avatarValue || '');
      setAccentColor(user.accentColor || 'cyber-purple');
      setBubbleStyle(user.bubbleStyle || 'rounded');
      setStatusTag(user.statusTag || '');
      setErrorMessage(null);
    }
  }, [user, isOpen]);

  const palette = getAccentPalette(accentColor);

  const handleReroll = async () => {
    setIsRerolling(true);
    setErrorMessage(null);
    try {
      const res = await onRerollName();
      if (res?.user?.handle) {
        setHandle(res.user.handle);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to re-roll name.');
    } finally {
      setIsRerolling(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const updates = {
      handle: handle.trim(),
      avatarType,
      avatarValue,
      accentColor,
      bubbleStyle,
      statusTag: statusTag.trim()
    };

    try {
      const res = await onSaveProfile(updates);

      // Real-time propagation over Socket.io
      if (socket && res?.user) {
        socket.emit('update-profile', {
          handle: res.user.handle,
          avatarType: res.user.avatarType,
          avatarValue: res.user.avatarValue,
          accentColor: res.user.accentColor,
          bubbleStyle: res.user.bubbleStyle,
          statusTag: res.user.statusTag
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save customizations.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl h-[92vh] max-h-[720px] flex flex-col border-3 border-border bg-card shadow-brutal-lg p-0 overflow-hidden">
        {/* Fixed Header Container */}
        <div className="shrink-0">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b-2 border-border bg-secondary/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'p-1.5 rounded-brutal-sm border-2 border-border shadow-brutal-dark-sm',
                    palette.bgClass
                  )}
                >
                  <Sparkles className={cn('h-4 w-4', palette.textClass)} />
                </div>
                <div>
                  <DialogTitle className="text-base font-black font-mono tracking-tight text-foreground">
                    Customize Identity
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground font-mono">
                    Anonymous session personalization · No login required
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] mr-7">
                #{user?.tag || 'Guest'}
              </Badge>
            </div>
          </DialogHeader>

        {/* Live Preview Card */}
        <div className="p-5 pb-3 bg-background/50 border-b-2 border-border">
          <p className="text-[11px] font-mono uppercase text-muted-foreground font-bold tracking-wider mb-2 flex items-center justify-between">
            <span>✨ Live Preview</span>
            <span className="text-[10px] text-muted-foreground/80 lowercase">how others see you</span>
          </p>

          <div
            className={cn(
              'p-3.5 bg-card border-2 shadow-brutal-dark-sm transition-all duration-300',
              palette.borderClass,
              bubbleStyle === 'sharp' && 'rounded-none',
              bubbleStyle === 'rounded' && 'rounded-brutal-md',
              bubbleStyle === 'outline' && 'rounded-brutal-sm border-dashed'
            )}
          >
            {/* Header: Avatar, Name, Status */}
            <div className="flex items-center gap-3">
              <UserAvatar
                name={handle || 'Anonymous'}
                tag={user?.tag}
                avatarType={avatarType}
                avatarValue={avatarValue}
                accentColor={accentColor}
                size="md"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('font-bold font-mono text-sm truncate', palette.textClass)}>
                    {handle || 'Choose a name...'}
                  </span>
                  {statusTag && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] py-0 px-1.5 border font-mono truncate max-w-[160px]',
                        palette.borderClass,
                        palette.bgClass
                      )}
                    >
                      {statusTag}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  #{user?.tag || '0000'} · {BUBBLE_STYLES[bubbleStyle]?.name}
                </p>
              </div>
            </div>

            {/* Sample Message Body */}
            <div className="mt-2.5 pt-2.5 border-t border-border/60 text-xs font-sans text-foreground">
              <p>
                &ldquo;Welcome to CockroachTalk! Here is how your message bubble and style appear in chat.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-border bg-secondary/30 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('identity')}
            className={cn(
              'px-3 py-2 text-xs font-mono font-bold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5',
              activeTab === 'identity'
                ? cn('border-primary text-primary', palette.borderClass, palette.textClass)
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Type className="h-3.5 w-3.5" />
            Name & Avatar
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={cn(
              'px-3 py-2 text-xs font-mono font-bold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5',
              activeTab === 'appearance'
                ? cn('border-primary text-primary', palette.borderClass, palette.textClass)
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Palette className="h-3.5 w-3.5" />
            Colors & Style
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={cn(
              'px-3 py-2 text-xs font-mono font-bold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5',
              activeTab === 'audio'
                ? cn('border-primary text-primary', palette.borderClass, palette.textClass)
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Volume2 className="h-3.5 w-3.5" />
            Sound Feedback
          </button>
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-brutal-sm border-2 border-destructive bg-destructive/15 text-destructive text-xs font-mono">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Validation Error</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* TAB 1: IDENTITY (Name & Avatar) */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              {/* Name Options (Option A + Option B) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                    <span>Display Name</span>
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {handle.length}/24 chars
                  </span>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={handle}
                    onChange={(e) => {
                      setHandle(e.target.value.substring(0, 24));
                      playTypingSound();
                    }}
                    placeholder="Enter custom nickname..."
                    maxLength={24}
                    className="font-mono text-sm border-2 bg-background focus:ring-2"
                  />

                  {/* Option A: Re-roll Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReroll}
                    disabled={isRerolling}
                    title="Option A: Re-roll safe regional name"
                    className="gap-1.5 font-mono text-xs border-2 shrink-0 hover:border-primary hover:text-primary shadow-brutal-dark-sm"
                  >
                    <Dices className={cn('h-4 w-4', isRerolling && 'animate-spin')} />
                    <span>Re-roll</span>
                  </Button>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <span>💡 Tip: Click <strong>Re-roll</strong> for instant regional names, or type a custom name (moderated via Perspective API).</span>
                </p>
              </div>

              {/* Status / Mood Tag */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-mono font-bold text-foreground flex items-center justify-between">
                  <span>Status / Mood Tag (Optional)</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{statusTag.length}/30</span>
                </label>
                <Input
                  value={statusTag}
                  onChange={(e) => setStatusTag(e.target.value.substring(0, 30))}
                  placeholder="e.g. 🔥 Debating, 🎧 Listening..."
                  maxLength={30}
                  className="font-mono text-sm border-2 bg-background"
                />

                {/* Preset mood pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {STATUS_MOOD_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStatusTag(preset)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-mono border transition-colors',
                        statusTag === preset
                          ? cn('border-primary text-primary', palette.borderClass, palette.textClass)
                          : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                  {statusTag && (
                    <button
                      type="button"
                      onClick={() => setStatusTag('')}
                      className="px-2 py-0.5 rounded text-[10px] font-mono border border-border text-muted-foreground hover:text-destructive"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Avatar Type Picker */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-mono font-bold text-foreground">
                  Avatar Style (No Photo Uploads)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAvatarType('initials')}
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-brutal-sm border-2 font-mono text-xs transition-all shadow-brutal-dark-sm',
                      avatarType === 'initials'
                        ? cn(palette.borderClass, palette.bgClass, palette.textClass, 'ring-2')
                        : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="font-bold text-base mb-1">
                      {(handle || 'CT').substring(0, 2).toUpperCase()}
                    </span>
                    <span>Initials</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvatarType('identicon')}
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-brutal-sm border-2 font-mono text-xs transition-all shadow-brutal-dark-sm',
                      avatarType === 'identicon'
                        ? cn(palette.borderClass, palette.bgClass, palette.textClass, 'ring-2')
                        : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div className="h-5 w-5 mb-1 flex items-center justify-center font-mono text-sm">
                      👾
                    </div>
                    <span>Identicon</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAvatarType('emoji');
                      if (!avatarValue) setAvatarValue('⚡');
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-brutal-sm border-2 font-mono text-xs transition-all shadow-brutal-dark-sm',
                      avatarType === 'emoji'
                        ? cn(palette.borderClass, palette.bgClass, palette.textClass, 'ring-2')
                        : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="text-base mb-1">{avatarValue || '⚡'}</span>
                    <span>Curated Emoji</span>
                  </button>
                </div>

                {/* Curated Emoji Selector Grid */}
                {avatarType === 'emoji' && (
                  <div className="mt-3 p-3 rounded-brutal-sm border-2 border-border bg-background space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 font-bold">
                        <Smile className="h-3.5 w-3.5 text-primary" />
                        <span>Curated Gen-Z & Character Avatars ({CURATED_EMOJIS.length}+):</span>
                      </p>
                      <span className="text-[10px] font-mono text-primary font-bold">
                        Selected: {avatarValue || '⚡'}
                      </span>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1 pb-1 border-b border-border/60">
                      <button
                        type="button"
                        onClick={() => setEmojiCategory('all')}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-mono border transition-all',
                          emojiCategory === 'all'
                            ? cn(palette.borderClass, palette.bgClass, palette.textClass, 'font-bold')
                            : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                        )}
                      >
                        All ({CURATED_EMOJIS.length})
                      </button>
                      {CURATED_EMOJI_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setEmojiCategory(cat.id)}
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1',
                            emojiCategory === cat.id
                              ? cn(palette.borderClass, palette.bgClass, palette.textClass, 'font-bold')
                              : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                          )}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Scrollable Emoji Grid with Animated Hover & Focus */}
                    <div className="max-h-52 overflow-y-auto pr-1">
                      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-9 gap-1.5 p-1">
                        {displayedEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setAvatarValue(emoji)}
                            title={`Select ${emoji}`}
                            className={cn(
                              'h-9 w-9 rounded-brutal-sm border-2 flex items-center justify-center text-lg transition-all duration-150',
                              'hover:scale-125 hover:z-10 hover:shadow-brutal-dark-sm active:scale-95',
                              avatarValue === emoji
                                ? cn(palette.borderClass, palette.bgClass, 'ring-2 font-bold shadow-brutal-dark-sm scale-110')
                                : 'border-border/60 bg-card/80 hover:border-primary hover:bg-card'
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE (Accent Color & Bubble Style) */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              {/* Preset Color Palette */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-foreground flex items-center justify-between">
                  <span>Accent Color Palette</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Selected: {palette.name}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {Object.values(ACCENT_PALETTES).map((item) => {
                    const isSelected = accentColor === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAccentColor(item.id)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-brutal-sm border-2 text-left transition-all shadow-brutal-dark-sm',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/40 bg-secondary'
                            : 'border-border bg-card hover:border-primary/60'
                        )}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-black/30 shrink-0"
                          style={{ backgroundColor: item.hex }}
                        />
                        <span className="text-xs font-mono font-bold truncate text-foreground">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Bubble Style */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-mono font-bold text-foreground">
                  Message Bubble Style
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {Object.values(BUBBLE_STYLES).map((style) => {
                    const isSelected = bubbleStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setBubbleStyle(style.id)}
                        className={cn(
                          'p-3 rounded-brutal-sm border-2 text-left transition-all shadow-brutal-dark-sm flex flex-col justify-between',
                          isSelected
                            ? cn(palette.borderClass, palette.bgClass, 'ring-2')
                            : 'border-border bg-card hover:border-primary'
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-xs text-foreground">
                              {style.name}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground leading-tight">
                            {style.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO (Sound Preferences) */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div className="p-3 rounded-brutal-sm border border-border/80 bg-secondary/30 text-xs font-mono text-muted-foreground">
                <p>
                  Sound preferences are stored <strong>client-side on your device</strong>. Synthesized in real time with Web Audio API for zero latency.
                </p>
              </div>

              {/* Message Sent Toggle */}
              <div className="flex items-center justify-between p-3 rounded-brutal-sm border-2 border-border bg-card">
                <div>
                  <p className="text-xs font-mono font-bold text-foreground">Message Sent Sound</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Play a crisp high chirp when your message sends
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => playSendSound()}
                    title="Test send sound"
                    className="h-8 px-2 font-mono text-xs"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={preferences.sendSound ? 'default' : 'outline'}
                    onClick={() => updatePreferences({ sendSound: !preferences.sendSound })}
                    className="h-8 font-mono text-xs"
                  >
                    {preferences.sendSound ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              {/* Message Received Toggle */}
              <div className="flex items-center justify-between p-3 rounded-brutal-sm border-2 border-border bg-card">
                <div>
                  <p className="text-xs font-mono font-bold text-foreground">Message Received Sound</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Play a gentle two-tone chime when other participants chat
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => playReceiveSound()}
                    title="Test receive sound"
                    className="h-8 px-2 font-mono text-xs"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={preferences.receiveSound ? 'default' : 'outline'}
                    onClick={() => updatePreferences({ receiveSound: !preferences.receiveSound })}
                    className="h-8 font-mono text-xs"
                  >
                    {preferences.receiveSound ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              {/* Typing Click Toggle */}
              <div className="flex items-center justify-between p-3 rounded-brutal-sm border-2 border-border bg-card">
                <div>
                  <p className="text-xs font-mono font-bold text-foreground">Typing Feedback Sound</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Subtle mechanical key click as you compose messages
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => playTypingSound()}
                    title="Test typing sound"
                    className="h-8 px-2 font-mono text-xs"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={preferences.typingSound ? 'default' : 'outline'}
                    onClick={() => updatePreferences({ typingSound: !preferences.typingSound })}
                    className="h-8 font-mono text-xs"
                  >
                    {preferences.typingSound ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer Actions */}
        <div className="shrink-0 p-4 border-t-2 border-border bg-secondary/40 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="font-mono text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className={cn(
              'font-mono text-xs font-bold gap-2 border-2 text-black shadow-brutal-dark-sm',
              isSubmitting && 'opacity-70'
            )}
            style={{ backgroundColor: palette.hex }}
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Save & Apply</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
