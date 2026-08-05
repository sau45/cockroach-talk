/**
 * CockroachTalk - Onboarding Page Controller
 * File Responsibility: Requests guaranteed unique database ID from backend API, persists to localStorage, and syncs across all tabs in same session.
 */

import { formatCockroachIdName, generateRandomTag } from '../utils/nameGenerator.js';
import { storage } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const previewBadge = document.getElementById('name-preview-badge');
  const btnContinue = document.getElementById('btn-continue-onboarding');
  const genderOptions = document.querySelectorAll('.gender-option');

  let selectedGender = 'skip';
  let currentTag = null;

  // 1. Check localStorage immediately
  let existingProfile = storage.getUserProfile();
  if (existingProfile && existingProfile.tag) {
    currentTag = existingProfile.tag;
  }

  if (existingProfile && existingProfile.gender) {
    selectedGender = existingProfile.gender;
  }

  // Request unique non-duplicate ID from Database API Endpoint
  async function fetchDatabaseUniqueTag() {
    try {
      const res = await fetch('/api/unique-id');
      if (res.ok) {
        const data = await res.json();
        return data.tag;
      }
    } catch (e) {
      console.warn('[Onboarding] Database API offline, fallback to local unique tag:', e);
    }
    return generateRandomTag();
  }

  // 2. If no tag exists yet, fetch from database with race-condition recheck
  if (!currentTag) {
    const fetchedTag = await fetchDatabaseUniqueTag();
    
    // Double-check localStorage in case another tab saved a tag while we were fetching
    const recheckedProfile = storage.getUserProfile();
    if (recheckedProfile && recheckedProfile.tag) {
      currentTag = recheckedProfile.tag;
    } else {
      currentTag = fetchedTag;
      storage.saveUserProfile({
        displayName: formatCockroachIdName(currentTag),
        tag: currentTag,
        gender: selectedGender
      });
    }
  }

  // 3. Update preview badge
  function updatePreview() {
    const formattedName = formatCockroachIdName(currentTag);
    if (previewBadge) {
      previewBadge.textContent = formattedName;
    }
  }

  // 4. Update gender option selection UI
  function updateGenderUI() {
    genderOptions.forEach(opt => {
      const val = opt.getAttribute('data-gender');
      if (val === selectedGender) {
        opt.classList.add('selected');
        opt.setAttribute('aria-checked', 'true');
      } else {
        opt.classList.remove('selected');
        opt.setAttribute('aria-checked', 'false');
      }
    });
  }

  updatePreview();
  updateGenderUI();

  // 5. Cross-tab live storage synchronization event listener
  window.addEventListener('storage', (e) => {
    const updatedProfile = storage.getUserProfile();
    if (updatedProfile && updatedProfile.tag && updatedProfile.tag !== currentTag) {
      currentTag = updatedProfile.tag;
      if (updatedProfile.gender) selectedGender = updatedProfile.gender;
      updatePreview();
      updateGenderUI();
    }
  });

  // Gender selection listeners
  genderOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      selectedGender = opt.getAttribute('data-gender');
      updateGenderUI();
      // Persist gender selection immediately
      storage.saveUserProfile({
        displayName: formatCockroachIdName(currentTag),
        tag: currentTag,
        gender: selectedGender
      });
    });
  });

  // Refresh handle button listener
  const btnRefresh = document.getElementById('btn-refresh-handle');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.disabled = true;
      btnRefresh.textContent = '⏳ Fetching...';
      const newTag = await fetchDatabaseUniqueTag();
      currentTag = newTag;
      storage.saveUserProfile({
        displayName: formatCockroachIdName(currentTag),
        tag: currentTag,
        gender: selectedGender
      });
      updatePreview();
      btnRefresh.disabled = false;
      btnRefresh.textContent = '🔄 Refresh New ID';
    });
  }

  // Save profile and proceed to junctions directory
  if (btnContinue) {
    btnContinue.addEventListener('click', (e) => {
      e.preventDefault();
      const finalDisplayName = formatCockroachIdName(currentTag);
      
      storage.saveUserProfile({
        displayName: finalDisplayName,
        tag: currentTag,
        gender: selectedGender
      });

      window.location.href = 'junctions.html';
    });
  }
});
