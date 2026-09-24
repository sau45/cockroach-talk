export interface Species {
  id: string;
  name: string;
}

export const SPECIES_LIST: Species[] = [
  { id: 'maharashtra', name: 'Maharashtra' },
  { id: 'delhi', name: 'Delhi' },
  { id: 'karnataka', name: 'Karnataka' },
  { id: 'uttar-pradesh', name: 'Uttar Pradesh' },
  { id: 'tamil-nadu', name: 'Tamil Nadu' },
  { id: 'gujarat', name: 'Gujarat' },
  { id: 'west-bengal', name: 'West Bengal' },
  { id: 'rajasthan', name: 'Rajasthan' },
  { id: 'andhra-pradesh', name: 'Andhra Pradesh' },
  { id: 'telangana', name: 'Telangana' },
  { id: 'kerala', name: 'Kerala' },
  { id: 'punjab', name: 'Punjab' },
  { id: 'haryana', name: 'Haryana' },
  { id: 'madhya-pradesh', name: 'Madhya Pradesh' },
  { id: 'bihar', name: 'Bihar' },
  { id: 'odisha', name: 'Odisha' },
  { id: 'assam', name: 'Assam' },
  { id: 'jharkhand', name: 'Jharkhand' },
  { id: 'chhattisgarh', name: 'Chhattisgarh' },
  { id: 'uttarakhand', name: 'Uttarakhand' },
  { id: 'himachal-pradesh', name: 'Himachal Pradesh' },
  { id: 'goa', name: 'Goa' },
  { id: 'tripura', name: 'Tripura' },
  { id: 'jammu-kashmir', name: 'Jammu & Kashmir' },
  { id: 'chandigarh', name: 'Chandigarh' },
  { id: 'meghalaya', name: 'Meghalaya' },
  { id: 'manipur', name: 'Manipur' },
  { id: 'nagaland', name: 'Nagaland' }
];

export const MAX_STAGE_SLOTS = 8;
export const INITIAL_STAGE_SLOTS = 2;
export const MODERATOR_WAIT_TIME_MS = 1 * 60 * 1000; // 1 minute on stage to earn moderator badge (server.js aligned)
export const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes comment edit window
export const SESSION_COOKIE_NAME = 'ct_session';

export const RESERVED_NAME_TERMS = [
  'admin',
  'administrator',
  'mod',
  'moderator',
  'senior mod',
  'lead',
  'room lead',
  'host',
  'system',
  'sysadmin',
  'cockroachtalk',
  'cockroach',
  'official',
  'support',
  'staff',
  'security',
  'superuser',
  'root',
  'helpdesk'
];

export const ACCENT_COLOR_TOKENS = [
  'coral',
  'electric-blue',
  'cyber-purple',
  'neon-amber',
  'lime-punk',
  'hot-pink',
  'mint-glow',
  'gold',
  'crimson',
  'sunset-orange'
];

export const CURATED_AVATAR_EMOJIS = [
  // Boys & Cool Personas (25 - single standalone glyphs)
  '👦', '🧒', '👨', '🧔', '👴', '👳', '🤴', '🤠', '🕺', '🥷',
  '🧛', '🧙', '🧝', '🧟', '🦹', '🦸', '🧞', '🥽', '🛹', '🧢',
  '🎧', '🥋', '🤺', '🕵️', '💂',

  // Girls & Queens (25 - single standalone glyphs)
  '👧', '👩', '👵', '👸', '💃', '🧕', '🧚', '🧜', '💄', '💅',
  '🎀', '🌸', '🌺', '🌹', '🌷', '🌼', '🌻', '💐', '👒', '👑',
  '💍', '💎', '💖', '✨', '⭐',

  // Gen-Z Moods & Reactions (25 - single standalone glyphs)
  '🕶️', '🗿', '🫠', '🫡', '🫣', '🤯', '🥵', '🥶', '🥸', '🤑',
  '🥴', '🥺', '🤫', '🤪', '😈', '👿', '🤡', '💀', '☠️', '👻',
  '👽', '🤖', '👾', '👺', '👹',

  // Creatures & Anime Beasts (25 - single standalone glyphs)
  '🦊', '🐯', '🦁', '🐺', '🐲', '🐉', '🦄', '🐼', '🐸', '🐵',
  '🦝', '🦇', '🦈', '🐙', '🐍', '🦅', '🦉', '🦋', '🐝', '🕷️',
  '🦂', '🦖', '🦕', '🦚', '🦩',

  // Cyber, Gaming & Aesthetic (25 - single standalone glyphs)
  '⚡', '🔥', '💥', '💫', '🪐', '🌌', '🔮', '🧿', '🎲', '🕹️',
  '🎮', '🚀', '🛸', '💣', '🎯', '🎱', '🥊', '⚔️', '🛡️', '🧪',
  '🪩', '🎙️', '🍕', '🍔', '🍹'
];
