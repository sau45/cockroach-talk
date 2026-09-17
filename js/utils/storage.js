/**
 * CockroachTalk - LocalStorage Utility
 * File Responsibility: Safe, typed wrappers for localStorage operations and unique profile generation.
 */

import { CONFIG } from '../config.js';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn(`[Storage] Error reading key "${key}":`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`[Storage] Error writing key "${key}":`, e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`[Storage] Error removing key "${key}":`, e);
      return false;
    }
  },

  /* Specialized Profile Helpers */
  getUserProfile() {
    try {
      const sessionItem = sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER_PROFILE);
      if (sessionItem) return JSON.parse(sessionItem);
    } catch (e) {}
    return this.get(CONFIG.STORAGE_KEYS.USER_PROFILE, null);
  },

  saveUserProfile(profile) {
    try {
      if (profile) sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (e) {}
    const res = this.set(CONFIG.STORAGE_KEYS.USER_PROFILE, profile);
    if (profile && profile.tag) {
      this.updateHeaderHandleUI(profile);
    }
    return res;
  },

  updateHeaderHandleUI(profile) {
    if (!profile || !profile.tag) return;
    const compactHandle = `Co...#${profile.tag}`;
    const userPillSpans = document.querySelectorAll('.btn-user-handle-pill span');
    userPillSpans.forEach(span => {
      span.innerHTML = `<i class="bi bi-stars" aria-hidden="true"></i> ${compactHandle}`;
    });
  },

  async resetUserProfile() {
    try {
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER_PROFILE);
    } catch (e) {}
    this.remove(CONFIG.STORAGE_KEYS.USER_PROFILE);
    return await this.ensureUserProfile();
  },

  // Ensures a persistent unique handle per browser tab/session
  async ensureUserProfile() {
    let profile = null;
    try {
      const sessionItem = sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER_PROFILE);
      if (sessionItem) profile = JSON.parse(sessionItem);
    } catch (e) {}

    if (!profile || !profile.tag) {
      profile = this.get(CONFIG.STORAGE_KEYS.USER_PROFILE, null);
    }

    if (!profile || !profile.tag) {
      try {
        const res = await fetch('/api/unique-id');
        const data = await res.json();
        profile = {
          tag: data.tag,
          displayName: data.handle || `Cockroach #${data.tag}`,
          gender: 'skip'
        };
        this.saveUserProfile(profile);
      } catch (e) {
        const fallbackTag = Math.floor(1000 + Math.random() * 9000).toString();
        profile = {
          tag: fallbackTag,
          displayName: `Cockroach #${fallbackTag}`,
          gender: 'skip'
        };
        this.saveUserProfile(profile);
      }
    } else {
      this.updateHeaderHandleUI(profile);
    }
    return profile;
  },

  getTheme() {
    return this.get(CONFIG.STORAGE_KEYS.THEME, null);
  },

  setTheme(themeName) {
    return this.set(CONFIG.STORAGE_KEYS.THEME, themeName);
  },

  /* Microphone Permission Helpers */
  hasMicPermission() {
    return this.get('cockroach_mic_permission_granted', false);
  },

  saveMicPermission(granted = true) {
    return this.set('cockroach_mic_permission_granted', granted);
  },

  /* 18+ Age Consent Helpers */
  getAgeConsent() {
    return this.get(CONFIG.STORAGE_KEYS.AGE_CONSENT, false);
  },

  saveAgeConsent(granted = true) {
    return this.set(CONFIG.STORAGE_KEYS.AGE_CONSENT, granted);
  },


  /* Active Junction Tracking — uses localStorage so it's visible across all browser tabs */
  getActiveJunction() {
    try {
      const item = localStorage.getItem('cockroach_active_junction');
      if (!item) return null;
      const data = JSON.parse(item);
      // Auto-expire stale entries after 30 minutes (e.g. tab closed without explicit leave)
      if (data && data.setAt && Date.now() - data.setAt > 30 * 60 * 1000) {
        localStorage.removeItem('cockroach_active_junction');
        return null;
      }
      return data;
    } catch (e) { return null; }
  },

  setActiveJunction(roomId, roomName) {
    try {
      localStorage.setItem('cockroach_active_junction', JSON.stringify({ roomId, roomName, setAt: Date.now() }));
    } catch (e) {}
  },

  clearActiveJunction() {
    try {
      localStorage.removeItem('cockroach_active_junction');
    } catch (e) {}
  }
};
