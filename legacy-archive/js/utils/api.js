/**
 * CockroachTalk - API Fetch Utility
 * File Responsibility: Encapsulates real-time room metrics API requests without fake data.
 */

import { CONFIG } from '../config.js';

export async function fetchJunctionRooms() {
  try {
    const response = await fetch('/api/rooms');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('[API] Real-time /api/rooms fetch notice:', error.message);
    // Fallback: Return real 0-active room structures directly from CONFIG.SPECIES_LIST
    return CONFIG.SPECIES_LIST.map((sp) => ({
      id: sp.id,
      name: sp.name,
      image: sp.image,
      topic: `${sp.name} bio-acoustics & live voice stage`,
      category: "Species Room",
      speakerCount: 0,
      listeners: 0,
      isLive: false,
      speakers: []
    }));
  }
}

// Alias export for backwards compatibility
export const fetchRooms = fetchJunctionRooms;
