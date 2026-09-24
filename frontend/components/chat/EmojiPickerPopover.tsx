'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Theme, EmojiClickData, PickerProps } from 'emoji-picker-react';

// Dynamic import with proper CJS/ESM default export unnesting
const DynamicEmojiPicker = dynamic<PickerProps>(
  () =>
    import('emoji-picker-react').then((mod: any) => {
      const Component = mod.default?.default || mod.default || mod;
      return (typeof Component === 'function' ? Component : mod) as React.ComponentType<PickerProps>;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] w-[310px] sm:w-[340px] bg-card p-4 flex flex-col items-center justify-center gap-2">
        <Skeleton className="h-9 w-full bg-secondary/80 rounded-brutal-sm" />
        <div className="grid grid-cols-6 gap-2 w-full pt-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 bg-secondary/60 rounded" />
          ))}
        </div>
      </div>
    )
  }
);

interface EmojiPickerPopoverProps {
  onSelectEmoji: (emoji: string) => void;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

export function EmojiPickerPopover({
  onSelectEmoji,
  children,
  align = 'end'
}: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (emojiData?.emoji) {
      onSelectEmoji(emojiData.emoji);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className="w-auto p-0 border-2 border-border shadow-brutal-lg rounded-brutal-md overflow-hidden bg-card z-[70] max-w-[calc(100vw-24px)]"
      >
        <DynamicEmojiPicker
          theme={Theme.DARK}
          onEmojiClick={handleEmojiClick}
          lazyLoadEmojis={true}
          autoFocusSearch={false}
          width="100%"
          height={360}
          previewConfig={{
            showPreview: false
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
