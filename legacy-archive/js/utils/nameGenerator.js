/**
 * CockroachTalk - Private Anonymous ID Formatter Utility
 * File Responsibility: Formats anonymous display handles strictly as Cockroach #[ID] for privacy (e.g., "Cockroach #4821").
 */

export function generateRandomTag() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function formatCockroachIdName(tag = null) {
  const userTag = tag || generateRandomTag();
  return `Cockroach #${userTag}`;
}

// Backward-compatible export aliases
export const formatStateCockroachName = (stateName, tag) => formatCockroachIdName(tag);
export const generateSpeciesName = () => formatCockroachIdName();
export const generateSuperheroName = generateSpeciesName;
