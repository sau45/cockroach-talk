'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Dices,
  Palette,
  Check,
  Smile,
  ShieldAlert,
  Type,
  Pipette,
  Copy
} from 'lucide-react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { UserProfile } from '@/types';
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
  SWATCH_COLORS,
  CURATED_EMOJIS,
  CURATED_EMOJI_CATEGORIES,
  STATUS_MOOD_PRESETS,
  BUBBLE_STYLES,
  getAccentPalette
} from '@/lib/palette';
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
  const [accentColor, setAccentColor] = useState(user?.accentColor || '#9F75FF');
  const [bubbleStyle, setBubbleStyle] = useState<'sharp' | 'rounded' | 'outline'>(
    user?.bubbleStyle || 'rounded'
  );
  const [statusTag, setStatusTag] = useState(user?.statusTag || '');

  // UI / Async State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'identity' | 'appearance'>('identity');
  const [emojiCategory, setEmojiCategory] = useState<string>('all');
  const [copiedHex, setCopiedHex] = useState(false);

  const displayedEmojis = React.useMemo(() => {
    if (emojiCategory === 'all') return CURATED_EMOJIS;
    const cat = CURATED_EMOJI_CATEGORIES.find((c) => c.id === emojiCategory);
    return cat ? cat.emojis : CURATED_EMOJIS;
  }, [emojiCategory]);

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setHandle(user.handle || '');
      setAvatarType(user.avatarType || 'initials');
      setAvatarValue(user.avatarValue || '');
      setAccentColor(user.accentColor || '#9F75FF');
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

  const handleEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          setAccentColor(result.sRGBHex);
        }
      } catch (err) {
        // User cancelled or not supported
      }
    }
  };

  const handleCopyHex = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(palette.hex);
      setCopiedHex(true);
      setTimeout(() => setCopiedHex(false), 2000);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const updates = {
      handle: handle.trim(),
      avatarType,
      avatarValue,
      accentColor: palette.hex,
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
                  className="p-1.5 rounded-brutal-sm border-2 border-border shadow-brutal-dark-sm transition-colors"
                  style={{
                    backgroundColor: `${palette.hex}22`,
                    borderColor: palette.hex
                  }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: palette.hex }} />
                </div>
                <div>
                  <DialogTitle className="text-base font-black font-mono tracking-tight text-foreground">
                    Customize Identity
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground font-mono">
                    Session personalization &amp; custom styling · No login required
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] mr-7">
                #{user?.tag || 'Guest'}
              </Badge>
            </div>
          </DialogHeader>

          {/* Live Preview Card with Dynamic Border Color */}
          <div className="p-4 sm:p-5 pb-3 bg-background/50 border-b-2 border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-mono uppercase text-muted-foreground font-bold tracking-wider">
                <span>✨ Live Preview</span>
              </p>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-muted-foreground">Border color:</span>
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-black/40 shadow-sm"
                  style={{ backgroundColor: palette.hex }}
                />
                <span className="font-bold uppercase" style={{ color: palette.hex }}>
                  {palette.hex}
                </span>
              </div>
            </div>

            <div
              className={cn(
                'p-3.5 bg-card border-2 shadow-brutal-dark-sm transition-all duration-200',
                bubbleStyle === 'sharp' && 'rounded-none',
                bubbleStyle === 'rounded' && 'rounded-brutal-md',
                bubbleStyle === 'outline' && 'rounded-brutal-sm border-dashed'
              )}
              style={{
                borderColor: palette.hex,
                boxShadow: `3px 3px 0px ${palette.hex}33`
              }}
            >
              {/* Header: Avatar, Name, Status */}
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={handle || 'Anonymous'}
                  tag={user?.tag}
                  avatarType={avatarType}
                  avatarValue={avatarValue}
                  accentColor={palette.hex}
                  size="md"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-bold font-mono text-sm truncate"
                      style={{ color: palette.hex }}
                    >
                      {handle || 'Choose a name...'}
                    </span>
                    {statusTag && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 border font-mono truncate max-w-[160px]"
                        style={{
                          borderColor: palette.hex,
                          backgroundColor: `${palette.hex}18`,
                          color: palette.hex
                        }}
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
                  &ldquo;Welcome to CockroachTalk! This is how your message bubble and border style appear to everyone.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b-2 border-border bg-secondary/30 px-4 sm:px-5 pt-2 gap-2">
            <button
              onClick={() => setActiveTab('identity')}
              className={cn(
                'px-3 py-2 text-xs font-mono font-bold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5',
                activeTab === 'identity'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              style={
                activeTab === 'identity'
                  ? { borderColor: palette.hex, color: palette.hex }
                  : undefined
              }
            >
              <Type className="h-3.5 w-3.5" />
              Name &amp; Avatar
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={cn(
                'px-3 py-2 text-xs font-mono font-bold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5',
                activeTab === 'appearance'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              style={
                activeTab === 'appearance'
                  ? { borderColor: palette.hex, color: palette.hex }
                  : undefined
              }
            >
              <Palette className="h-3.5 w-3.5" />
              Border &amp; Colors
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
              {/* Name Options */}
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
                    }}
                    placeholder="Enter custom nickname..."
                    maxLength={24}
                    className="font-mono text-sm border-2 bg-background focus:ring-2"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReroll}
                    disabled={isRerolling}
                    title="Re-roll safe regional name"
                    className="gap-1.5 font-mono text-xs border-2 shrink-0 hover:border-primary hover:text-primary shadow-brutal-dark-sm"
                  >
                    <Dices className={cn('h-4 w-4', isRerolling && 'animate-spin')} />
                    <span>Re-roll</span>
                  </Button>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground">
                  💡 Tip: Click <strong>Re-roll</strong> for instant regional names, or type a custom name.
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
                          ? 'border-primary text-primary font-bold'
                          : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
                      )}
                      style={
                        statusTag === preset
                          ? {
                              borderColor: palette.hex,
                              color: palette.hex,
                              backgroundColor: `${palette.hex}18`
                            }
                          : undefined
                      }
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
                        ? 'ring-2 border-primary bg-secondary'
                        : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                    )}
                    style={
                      avatarType === 'initials'
                        ? {
                            borderColor: palette.hex,
                            backgroundColor: `${palette.hex}15`,
                            color: palette.hex
                          }
                        : undefined
                    }
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
                        ? 'ring-2 border-primary bg-secondary'
                        : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                    )}
                    style={
                      avatarType === 'identicon'
                        ? {
                            borderColor: palette.hex,
                            backgroundColor: `${palette.hex}15`,
                            color: palette.hex
                          }
                        : undefined
                    }
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
                        ? 'ring-2 border-primary bg-secondary'
                        : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                    )}
                    style={
                      avatarType === 'emoji'
                        ? {
                            borderColor: palette.hex,
                            backgroundColor: `${palette.hex}15`,
                            color: palette.hex
                          }
                        : undefined
                    }
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
                        <span>Curated Character Avatars ({CURATED_EMOJIS.length}+):</span>
                      </p>
                      <span className="text-[10px] font-mono font-bold" style={{ color: palette.hex }}>
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
                            ? 'font-bold bg-secondary border-primary text-foreground'
                            : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                        )}
                        style={
                          emojiCategory === 'all'
                            ? { borderColor: palette.hex, color: palette.hex }
                            : undefined
                        }
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
                              ? 'font-bold bg-secondary border-primary text-foreground'
                              : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                          )}
                          style={
                            emojiCategory === cat.id
                              ? { borderColor: palette.hex, color: palette.hex }
                              : undefined
                          }
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
                                ? 'ring-2 font-bold shadow-brutal-dark-sm scale-110 bg-secondary'
                                : 'border-border/60 bg-card/80 hover:border-primary hover:bg-card'
                            )}
                            style={
                              avatarValue === emoji
                                ? {
                                    borderColor: palette.hex,
                                    backgroundColor: `${palette.hex}22`
                                  }
                                : undefined
                            }
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

          {/* TAB 2: APPEARANCE (Custom Color Picker, Border Color, Quick Swatches, Bubble Style) */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Color Picker Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                      <Palette className="h-4 w-4" style={{ color: palette.hex }} />
                      <span>Border &amp; Identity Color Picker</span>
                    </label>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      Pick any custom color across the spectrum. Sets your live border color.
                    </p>
                  </div>
                </div>

                {/* React-Colorful Interactive Color Picker Container */}
                <div className="p-3.5 rounded-brutal-sm border-2 border-border bg-card shadow-brutal-dark-sm space-y-3.5">
                  <div className="custom-color-picker flex justify-center">
                    <HexColorPicker
                      color={palette.hex}
                      onChange={(newColor) => setAccentColor(newColor)}
                      className="!w-full !max-w-md"
                    />
                  </div>

                  {/* Hex Color Input, Swatch, EyeDropper, Copy Controls */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/70">
                    {/* Visual Color Swatch */}
                    <div
                      className="h-10 w-10 rounded-brutal-sm border-2 border-border shadow-sm shrink-0 flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: palette.hex,
                        borderColor: palette.hex
                      }}
                      title={`Current color: ${palette.hex}`}
                    />

                    {/* Hex Input with prefix */}
                    <div className="relative flex-1 flex items-center">
                      <span className="absolute left-3 font-mono font-bold text-sm text-muted-foreground select-none">
                        #
                      </span>
                      <HexColorInput
                        color={palette.hex}
                        onChange={(newColor) => setAccentColor(newColor)}
                        prefixed={false}
                        className="w-full bg-background border-2 border-border rounded-brutal-sm pl-7 pr-3 py-2 font-mono text-sm uppercase font-bold text-foreground focus:outline-none focus:ring-2 focus:border-primary transition-all"
                        placeholder="9F75FF"
                      />
                    </div>

                    {/* EyeDropper Button (if supported) */}
                    {typeof window !== 'undefined' && 'EyeDropper' in window && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleEyeDropper}
                        title="Pick color from screen (Eyedropper)"
                        className="h-10 w-10 border-2 rounded-brutal-sm hover:border-primary shrink-0"
                      >
                        <Pipette className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Copy Hex Code Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyHex}
                      title="Copy hex color code"
                      className="h-10 w-10 border-2 rounded-brutal-sm hover:border-primary shrink-0"
                    >
                      {copiedHex ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick-Pick Popular Swatches */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-mono font-bold text-foreground flex items-center justify-between">
                  <span>Quick-Pick Popular Swatches</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    16 Curated Shades
                  </span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {SWATCH_COLORS.map((item) => {
                    const isSelected =
                      palette.hex.toLowerCase() === item.hex.toLowerCase();
                    return (
                      <button
                        key={item.hex}
                        type="button"
                        onClick={() => setAccentColor(item.hex)}
                        title={`${item.name} (${item.hex})`}
                        className={cn(
                          'group relative flex flex-col items-center justify-center p-2 rounded-brutal-sm border-2 transition-all shadow-sm',
                          isSelected
                            ? 'ring-2 ring-primary border-primary bg-secondary scale-105'
                            : 'border-border bg-card hover:border-primary/70 hover:scale-105'
                        )}
                        style={
                          isSelected
                            ? { borderColor: item.hex, backgroundColor: `${item.hex}18` }
                            : undefined
                        }
                      >
                        <span
                          className="h-5 w-5 rounded-full border border-black/30 shadow-sm shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: item.hex }}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white drop-shadow" />}
                        </span>
                        <span className="text-[9px] font-mono mt-1 truncate max-w-full text-muted-foreground group-hover:text-foreground">
                          {item.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Bubble Style */}
              <div className="space-y-2 pt-3 border-t border-border">
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
                            ? 'ring-2 bg-secondary'
                            : 'border-border bg-card hover:border-primary'
                        )}
                        style={
                          isSelected
                            ? {
                                borderColor: palette.hex,
                                backgroundColor: `${palette.hex}15`
                              }
                            : undefined
                        }
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-xs text-foreground">
                              {style.name}
                            </span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5" style={{ color: palette.hex }} />
                            )}
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
              'font-mono text-xs font-bold gap-2 border-2 text-black shadow-brutal-dark-sm transition-all',
              isSubmitting && 'opacity-70'
            )}
            style={{
              backgroundColor: palette.hex,
              borderColor: palette.hex
            }}
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Save &amp; Apply</span>
              </>
            )}
          </Button>
        </div>

        {/* Scoped Styling for React-Colorful to match neobrutalist theme */}
        <style>{`
          .custom-color-picker .react-colorful {
            width: 100% !important;
            height: 180px !important;
            border-radius: 6px !important;
            border: 2px solid var(--border, #27272a) !important;
            box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.25) !important;
          }
          .custom-color-picker .react-colorful__saturation {
            border-radius: 4px 4px 0 0 !important;
            border-bottom: 2px solid var(--border, #27272a) !important;
          }
          .custom-color-picker .react-colorful__hue {
            height: 24px !important;
            border-radius: 0 0 4px 4px !important;
          }
          .custom-color-picker .react-colorful__pointer {
            width: 20px !important;
            height: 20px !important;
            border: 2px solid #000 !important;
            box-shadow: 0 0 0 2px #fff, 0 2px 4px rgba(0,0,0,0.4) !important;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
