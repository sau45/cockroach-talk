export interface AccentPaletteItem {
  id: string;
  name: string;
  hex: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  ringClass: string;
  shadowClass: string;
}

export const ACCENT_PALETTES: Record<string, AccentPaletteItem> = {
  'coral': {
    id: 'coral',
    name: 'Neon Coral',
    hex: '#FF6B6B',
    borderClass: 'border-[#FF6B6B]',
    textClass: 'text-[#FF6B6B]',
    bgClass: 'bg-[#FF6B6B]/15',
    ringClass: 'ring-[#FF6B6B]',
    shadowClass: 'shadow-[3px_3px_0px_#FF6B6B]'
  },
  'electric-blue': {
    id: 'electric-blue',
    name: 'Electric Blue',
    hex: '#38BDF8',
    borderClass: 'border-[#38BDF8]',
    textClass: 'text-[#38BDF8]',
    bgClass: 'bg-[#38BDF8]/15',
    ringClass: 'ring-[#38BDF8]',
    shadowClass: 'shadow-[3px_3px_0px_#38BDF8]'
  },
  'cyber-purple': {
    id: 'cyber-purple',
    name: 'Cyber Purple',
    hex: '#9F75FF',
    borderClass: 'border-[#9F75FF]',
    textClass: 'text-[#9F75FF]',
    bgClass: 'bg-[#9F75FF]/15',
    ringClass: 'ring-[#9F75FF]',
    shadowClass: 'shadow-[3px_3px_0px_#9F75FF]'
  },
  'neon-amber': {
    id: 'neon-amber',
    name: 'Neon Amber',
    hex: '#F59E0B',
    borderClass: 'border-[#F59E0B]',
    textClass: 'text-[#F59E0B]',
    bgClass: 'bg-[#F59E0B]/15',
    ringClass: 'ring-[#F59E0B]',
    shadowClass: 'shadow-[3px_3px_0px_#F59E0B]'
  },
  'lime-punk': {
    id: 'lime-punk',
    name: 'Lime Punk',
    hex: '#84CC16',
    borderClass: 'border-[#84CC16]',
    textClass: 'text-[#84CC16]',
    bgClass: 'bg-[#84CC16]/15',
    ringClass: 'ring-[#84CC16]',
    shadowClass: 'shadow-[3px_3px_0px_#84CC16]'
  },
  'hot-pink': {
    id: 'hot-pink',
    name: 'Hot Pink',
    hex: '#EC4899',
    borderClass: 'border-[#EC4899]',
    textClass: 'text-[#EC4899]',
    bgClass: 'bg-[#EC4899]/15',
    ringClass: 'ring-[#EC4899]',
    shadowClass: 'shadow-[3px_3px_0px_#EC4899]'
  },
  'mint-glow': {
    id: 'mint-glow',
    name: 'Mint Glow',
    hex: '#2DD4BF',
    borderClass: 'border-[#2DD4BF]',
    textClass: 'text-[#2DD4BF]',
    bgClass: 'bg-[#2DD4BF]/15',
    ringClass: 'ring-[#2DD4BF]',
    shadowClass: 'shadow-[3px_3px_0px_#2DD4BF]'
  },
  'gold': {
    id: 'gold',
    name: 'Pure Gold',
    hex: '#FCD34D',
    borderClass: 'border-[#FCD34D]',
    textClass: 'text-[#FCD34D]',
    bgClass: 'bg-[#FCD34D]/15',
    ringClass: 'ring-[#FCD34D]',
    shadowClass: 'shadow-[3px_3px_0px_#FCD34D]'
  },
  'crimson': {
    id: 'crimson',
    name: 'Crimson',
    hex: '#EF4444',
    borderClass: 'border-[#EF4444]',
    textClass: 'text-[#EF4444]',
    bgClass: 'bg-[#EF4444]/15',
    ringClass: 'ring-[#EF4444]',
    shadowClass: 'shadow-[3px_3px_0px_#EF4444]'
  },
  'sunset-orange': {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    hex: '#FB923C',
    borderClass: 'border-[#FB923C]',
    textClass: 'text-[#FB923C]',
    bgClass: 'bg-[#FB923C]/15',
    ringClass: 'ring-[#FB923C]',
    shadowClass: 'shadow-[3px_3px_0px_#FB923C]'
  }
};

export const DEFAULT_ACCENT = ACCENT_PALETTES['cyber-purple'];

export const SWATCH_COLORS = [
  { name: 'Cyber Purple', hex: '#9F75FF' },
  { name: 'Electric Blue', hex: '#38BDF8' },
  { name: 'Neon Coral', hex: '#FF6B6B' },
  { name: 'Lime Punk', hex: '#84CC16' },
  { name: 'Pure Gold', hex: '#FCD34D' },
  { name: 'Hot Pink', hex: '#EC4899' },
  { name: 'Mint Glow', hex: '#2DD4BF' },
  { name: 'Crimson', hex: '#EF4444' },
  { name: 'Sunset Orange', hex: '#FB923C' },
  { name: 'Neon Amber', hex: '#F59E0B' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Electric Indigo', hex: '#6366F1' },
  { name: 'Vibrant Violet', hex: '#8B5CF6' },
  { name: 'Fuchsia Neon', hex: '#D946EF' },
  { name: 'Cyan Glow', hex: '#06B6D4' },
  { name: 'Solar Yellow', hex: '#EAB308' }
];

export function getAccentPalette(token?: string): AccentPaletteItem {
  if (!token) return DEFAULT_ACCENT;
  if (ACCENT_PALETTES[token]) return ACCENT_PALETTES[token];

  // Match hex color (e.g. #FF6B6B, #9F75FF, or without leading hash)
  const cleanHex = token.startsWith('#') ? token : `#${token}`;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(cleanHex)) {
    return {
      id: cleanHex,
      name: cleanHex.toUpperCase(),
      hex: cleanHex,
      borderClass: '',
      textClass: '',
      bgClass: '',
      ringClass: '',
      shadowClass: ''
    };
  }

  return DEFAULT_ACCENT;
}

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

export const CURATED_EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'boys',
    name: 'Boys & Dudes',
    icon: '👦',
    emojis: [
      '👦', '🧒', '👨', '🧔', '👴', '👳', '🤴', '🤠', '🕺', '🥷',
      '🧛', '🧙', '🧝', '🧟', '🦹', '🦸', '🧞', '🥽', '🛹', '🧢',
      '🎧', '🥋', '🤺', '🕵️', '💂'
    ]
  },
  {
    id: 'girls',
    name: 'Girls & Queens',
    icon: '👧',
    emojis: [
      '👧', '👩', '👵', '👸', '💃', '🧕', '🧚', '🧜', '💄', '💅',
      '🎀', '🌸', '🌺', '🌹', '🌷', '🌼', '🌻', '💐', '👒', '👑',
      '💍', '💎', '💖', '✨', '⭐'
    ]
  },
  {
    id: 'genz',
    name: 'Cool & Gen-Z',
    icon: '🕶️',
    emojis: [
      '🕶️', '🗿', '🫠', '🫡', '🫣', '🤯', '🥵', '🥶', '🥸', '🤑',
      '🥴', '🥺', '🤫', '🤪', '😈', '👿', '🤡', '💀', '☠️', '👻',
      '👽', '🤖', '👾', '👺', '👹'
    ]
  },
  {
    id: 'creatures',
    name: 'Anime Beasts',
    icon: '🦊',
    emojis: [
      '🦊', '🐯', '🦁', '🐺', '🐲', '🐉', '🦄', '🐼', '🐸', '🐵',
      '🦝', '🦇', '🦈', '🐙', '🐍', '🦅', '🦉', '🦋', '🐝', '🕷️',
      '🦂', '🦖', '🦕', '🦚', '🦩'
    ]
  },
  {
    id: 'cyber',
    name: 'Cyber Gaming',
    icon: '⚡',
    emojis: [
      '⚡', '🔥', '💥', '💫', '🪐', '🌌', '🔮', '🧿', '🎲', '🕹️',
      '🎮', '🚀', '🛸', '💣', '🎯', '🎱', '🥊', '⚔️', '🛡️', '🧪',
      '🪩', '🎙️', '🍕', '🍔', '🍹'
    ]
  }
];

export const CURATED_EMOJIS = CURATED_EMOJI_CATEGORIES.flatMap((c) => c.emojis);

export const STATUS_MOOD_PRESETS = [
  '🔥 Debating',
  '🎧 Listening',
  '⚡ Ready',
  '🧠 Brainstorming',
  '🤔 Thinking',
  '🚀 On a roll',
  '👀 Observing',
  '💬 Chatting'
];

export interface BubbleStylePreset {
  id: 'sharp' | 'rounded' | 'outline';
  name: string;
  description: string;
  containerClass: string;
}

export const BUBBLE_STYLES: Record<string, BubbleStylePreset> = {
  'sharp': {
    id: 'sharp',
    name: 'Sharp Brutalist',
    description: 'Crisp 90° edges with solid hard drop shadow',
    containerClass: 'rounded-none border-2'
  },
  'rounded': {
    id: 'rounded',
    name: 'Modern Neo',
    description: 'Balanced rounded corners with tactile offset shadow',
    containerClass: 'rounded-brutal-sm border-2'
  },
  'outline': {
    id: 'outline',
    name: 'Dashed Outline',
    description: 'Minimalist industrial feel with dashed brutalist accent',
    containerClass: 'rounded-brutal-md border-2 border-dashed'
  }
};

/**
 * Deterministically generates a 5x5 symmetrical SVG Identicon string based on seed.
 */
export function generateIdenticonSvg(seed: string, colorHex: string = '#9F75FF', size: number = 48): string {
  // Simple fast hash
  let hash = 0;
  const str = String(seed || 'ct');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  const cells: boolean[][] = [];
  for (let y = 0; y < 5; y++) {
    cells[y] = [];
    for (let x = 0; x < 3; x++) {
      const bit = ((hash >> (y * 3 + x)) & 1) === 1;
      cells[y][x] = bit;
      cells[y][4 - x] = bit; // mirror for symmetry
    }
  }

  const cellSize = size / 5;
  let rects = '';
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (cells[y][x]) {
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${colorHex}" />`;
      }
    }
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="background:#1B1B1B;border-radius:2px;">${rects}</svg>`;
}
