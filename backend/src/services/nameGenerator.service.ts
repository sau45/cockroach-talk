import { ALL_NAME_POOLS, RegionNamePool } from '../data/names/index.js';

export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generates a realistic human name from one of the regional or international pools.
 * Optionally filters by gender ('male' | 'female').
 * If gender is omitted, 'skip', or other, draws from the combined pool.
 * Returns a first name + surname combination.
 */
export function generateRealisticName(gender?: string | null, tag?: string | number | null): string {
  const normalizedGender = gender?.toLowerCase()?.trim();

  // If user chooses 'skip', 'prefer_not_to_say', or anything other than 'male'/'female', assign anonymous unique Cockroach identity
  if (!normalizedGender || normalizedGender === 'skip' || normalizedGender === 'prefer_not_to_say') {
    const id = tag || Math.floor(1000 + Math.random() * 9000);
    return `Cockroach #${id}`;
  }

  // 1. Pick a random culture/region pool
  const pool: RegionNamePool = getRandomElement(ALL_NAME_POOLS);

  // 2. Select first name candidates based on gender preference
  let firstNameCandidates: string[];

  if (normalizedGender === 'male') {
    firstNameCandidates = pool.firstNames.male;
  } else if (normalizedGender === 'female') {
    firstNameCandidates = pool.firstNames.female;
  } else {
    const id = tag || Math.floor(1000 + Math.random() * 9000);
    return `Cockroach #${id}`;
  }

  // 3. Pick a first name and a last name
  const firstName = getRandomElement(firstNameCandidates);
  const lastName = getRandomElement(pool.lastNames);

  return `${firstName} ${lastName}`;
}

/**
 * Resolves a unique display name within a room.
 * If the base name is already taken by someone in that room, appends a numeric suffix (e.g. "Aarav Sharma 2").
 * Numbers only appear as a rare collision fallback, never by default.
 */
export function resolveRoomDisplayName(
  baseName: string,
  existingNamesInRoom: string[]
): string {
  if (!existingNamesInRoom || existingNamesInRoom.length === 0) {
    return baseName;
  }

  const normalizedExisting = existingNamesInRoom.map((n) => n.trim().toLowerCase());
  const normalizedBase = baseName.trim().toLowerCase();

  if (!normalizedExisting.includes(normalizedBase)) {
    return baseName;
  }

  // Handle collision: find next available suffix
  let counter = 2;
  while (normalizedExisting.includes(`${normalizedBase} ${counter}`)) {
    counter++;
  }

  return `${baseName} ${counter}`;
}
