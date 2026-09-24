import { RegionNamePool } from './types.js';
import { punjabiPool } from './punjabi.js';
import { bengaliPool } from './bengali.js';
import { tamilPool } from './tamil.js';
import { marathiPool } from './marathi.js';
import { teluguPool } from './telugu.js';
import { gujaratiPool } from './gujarati.js';
import { kannadaPool } from './kannada.js';
import { malayalamPool } from './malayalam.js';
import { hindiPool } from './hindi.js';
import { kashmiriPool } from './kashmiri.js';
import { assamesePool } from './assamese.js';
import { westernPool } from './western.js';
import { arabicPool } from './arabic.js';
import { eastAsianPool } from './eastAsian.js';
import { latinPool } from './latin.js';
import { europeanPool } from './european.js';

export * from './types.js';

export const ALL_NAME_POOLS: RegionNamePool[] = [
  // Indian Regional Pools
  punjabiPool,
  bengaliPool,
  tamilPool,
  marathiPool,
  teluguPool,
  gujaratiPool,
  kannadaPool,
  malayalamPool,
  hindiPool,
  kashmiriPool,
  assamesePool,

  // International Pools
  westernPool,
  arabicPool,
  eastAsianPool,
  latinPool,
  europeanPool
];
