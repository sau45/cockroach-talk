'use client';

import React from 'react';
import { getAccentPalette, generateIdenticonSvg } from '@/lib/palette';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name: string;
  tag?: string;
  avatarType?: 'initials' | 'identicon' | 'emoji';
  avatarValue?: string;
  accentColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isSpeaking?: boolean;
}

const SIZE_CONFIGS = {
  xs: {
    container: 'h-6 w-6 text-[10px]',
    identiconSize: 24,
    emoji: 'text-xs'
  },
  sm: {
    container: 'h-8 w-8 text-xs',
    identiconSize: 32,
    emoji: 'text-sm'
  },
  md: {
    container: 'h-10 w-10 text-sm',
    identiconSize: 40,
    emoji: 'text-lg'
  },
  lg: {
    container: 'h-14 w-14 text-lg',
    identiconSize: 56,
    emoji: 'text-2xl'
  },
  xl: {
    container: 'h-20 w-20 text-2xl',
    identiconSize: 80,
    emoji: 'text-4xl'
  }
};

export function UserAvatar({
  name,
  tag,
  avatarType = 'initials',
  avatarValue,
  accentColor,
  size = 'md',
  className,
  isSpeaking = false
}: UserAvatarProps) {
  const palette = getAccentPalette(accentColor);
  const sizeConfig = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  const initials = (name || 'CT')
    .trim()
    .substring(0, 2)
    .toUpperCase();

  const isCircle = className?.includes('rounded-full');
  const roundedClass = isCircle ? 'rounded-full' : 'rounded-brutal-sm';

  // If emoji type with a value
  if (avatarType === 'emoji' && avatarValue) {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center border-2 bg-card shadow-sm select-none transition-transform',
          roundedClass,
          palette.borderClass,
          sizeConfig.container,
          isSpeaking && 'ring-2 ring-primary scale-105',
          className
        )}
        style={{ borderColor: palette.hex }}
      >
        <span className={cn('leading-none', sizeConfig.emoji)}>{avatarValue}</span>
      </div>
    );
  }

  // If identicon type
  if (avatarType === 'identicon') {
    const identiconSeed = avatarValue || tag || name || 'default';
    const svgString = generateIdenticonSvg(identiconSeed, palette.hex, sizeConfig.identiconSize);

    return (
      <div
        className={cn(
          'relative flex items-center justify-center border-2 overflow-hidden shadow-sm bg-card transition-transform',
          roundedClass,
          palette.borderClass,
          sizeConfig.container,
          isSpeaking && 'ring-2 ring-primary scale-105',
          className
        )}
        style={{ borderColor: palette.hex }}
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    );
  }

  // Default: Initials-based avatar
  return (
    <div
      className={cn(
        'relative flex items-center justify-center border-2 font-mono font-bold shadow-sm select-none transition-transform',
        roundedClass,
        palette.borderClass,
        palette.bgClass,
        palette.textClass,
        sizeConfig.container,
        isSpeaking && 'ring-2 ring-primary scale-105',
        className
      )}
      style={{
        borderColor: palette.hex,
        backgroundColor: `${palette.hex}18`,
        color: palette.hex
      }}
    >
      <span>{initials}</span>
    </div>
  );
}
