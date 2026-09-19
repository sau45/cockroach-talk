/**
 * CockroachTalk - DOM Utilities
 * File Responsibility: Safe DOM helper functions, XSS escaping, and compact chip cards with 1-top 2-bottom micro avatar clusters.
 */

import { storage } from './storage.js';
import { renderJunctionConflictModal } from '../partials/modals/junctionConflictModal.js';
import { renderPasswordPromptModal } from '../partials/modals/passwordPromptModal.js';

/**
 * Escapes HTML characters to prevent XSS vulnerabilities.
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Shows the Junction Conflict modal (defined in junctions.html) and resolves to:
 *   true  → user clicked "Leave & Join"
 *   false → user clicked "Stay Here", <i class="bi bi-x-lg" aria-hidden="true"></i>, or backdrop
 */
function confirmJunctionSwitch(currentRoomName, targetRoomName) {
  return new Promise((resolve) => {
    let modal      = document.getElementById('junction-conflict-modal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', renderJunctionConflictModal());
      modal = document.getElementById('junction-conflict-modal');
    }
    
    const bodyEl     = document.getElementById('jcm-body');
    const closeBtn   = document.getElementById('jcm-close');
    const cancelBtn  = document.getElementById('jcm-cancel');
    const confirmBtn = document.getElementById('jcm-confirm');

    if (!modal) {
      // Fallback: native confirm if HTML modal is missing for some reason
      resolve(confirm(`You are currently in "${currentRoomName}". Leave it and join "${targetRoomName}"?`));
      return;
    }

    // Update the message dynamically
    if (bodyEl) {
      bodyEl.textContent = `You are currently in "${currentRoomName}". Leave it and join "${targetRoomName}"?`;
    }

    function close(result) {
      modal.classList.remove('active');
      confirmBtn.removeEventListener('click',  onConfirm);
      cancelBtn.removeEventListener('click',   onCancel);
      closeBtn.removeEventListener('click',    onCancel);
      modal.removeEventListener('click',       onBackdrop);
      resolve(result);
    }

    function onConfirm()   { close(true);  }
    function onCancel()    { close(false); }
    function onBackdrop(e) { if (e.target === modal) close(false); }

    confirmBtn.addEventListener('click',  onConfirm);
    cancelBtn.addEventListener('click',   onCancel);
    closeBtn.addEventListener('click',    onCancel);
    modal.addEventListener('click',       onBackdrop);

    modal.classList.add('active');
  });
}

/**
 * Shows a password prompt modal for protected custom rooms.
 * Resolves to the password (string) or null if cancelled.
 */
function promptForPassword(roomName) {
  return new Promise((resolve) => {
    let modal = document.getElementById('password-prompt-modal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', renderPasswordPromptModal());
      modal = document.getElementById('password-prompt-modal');
    }
    
    const topicEl = document.getElementById('password-prompt-topic');
    const closeBtn = document.getElementById('password-prompt-close');
    const form = document.getElementById('password-prompt-form');
    const input = document.getElementById('password-prompt-input');

    if (topicEl) topicEl.textContent = `Enter the password for "${roomName}"`;
    if (input) input.value = '';

    function close(result) {
      modal.classList.remove('active');
      form.removeEventListener('submit', onSubmit);
      closeBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      resolve(result);
    }

    function onSubmit(e) {
      e.preventDefault();
      close(input.value);
    }
    function onCancel() { close(null); }
    function onBackdrop(e) { if (e.target === modal) close(null); }

    form.addEventListener('submit', onSubmit);
    closeBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);

    modal.classList.add('active');
    modal.style.display = 'flex';
    setTimeout(() => { if (input) input.focus(); }, 100);
  });
}

/**
 * Creates a clean, clickable symmetrical chip card element with Cockroach SVG icon,
 * State Cockroach title, and right-aligned 1-top 2-bottom micro avatar cluster.
 */
export function createJunctionCard(room) {
  const card = document.createElement('a');
  card.className = 'card-junction-chip';
  card.href = `room.html?id=${encodeURIComponent(room.id)}`;
  card.setAttribute('aria-label', `Join ${room.name} Voice Room`);

  const listenerCount = (typeof room.listeners === 'number') ? room.listeners : 0;
  const isLive = listenerCount > 0;
  const isFull = listenerCount >= 8;

  // Cockroach SVG Icon (Standardized to 24px via CSS)
  const cockroachSVG = `
    <svg class="cockroach-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2v3M8 3.5l1.5 2.5M16 3.5l-1.5 2.5"/> <ellipse cx="12" cy="13" rx="4.5" ry="6.5" fill="var(--white)"/> <path d="M7.5 10H3M16.5 10H21M7 13.5H2.5M17 13.5H21.5M7.5 17L4.5 19.5M16.5 17l3 2.5"/> <line x1="12" y1="6.5" x2="12" y2="19.5"/> </svg>
  `;

  // Mic Icon for active state
  const micIcon = isLive ? `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path> <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path> <line x1="12" y1="19" x2="12" y2="22"></line> <line x1="8" y1="22" x2="16" y2="22"></line> </svg>` : `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"> <rect x="3" y="3" width="18" height="18" rx="0" ry="0"></rect> </svg>`;

  let statusLabel = isLive ? 'ACTIVE' : 'QUIET';
  if (isFull) {
    statusLabel = `FULL (${listenerCount})`;
  }

  let usersHTML = '';
  if (room.allUsers && room.allUsers.length > 0) {
    const userChips = room.allUsers.map(u => {
      // Format like Co..#1234
      const parts = u.name.split('#');
      const shortName = parts[1] ? `Co..#${parts[1]}` : u.name;
      return `<div class="mini-user-chip" title="${escapeHTML(u.name)}">${escapeHTML(shortName)}</div>`;
    }).join('');
    usersHTML = `<div class="junction-users-grid">${userChips}</div>`;
  }

  card.innerHTML = `
    <div class="chip-top" style="justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        ${room.hasPassword ? '<i class="bi bi-lock-fill" style="color: var(--accent-gold); font-size: 1.1rem;" title="Password Protected"></i>' : cockroachSVG}
        <h3 class="chip-title">${escapeHTML(room.name)}</h3>
      </div>
      <div class="status-indicator ${isLive ? 'is-live' : 'is-quiet'}">
        <span class="status-dot"></span>
        <span class="status-label">${statusLabel}</span>
      </div>
    </div>
    <div class="chip-bottom">
      <div class="status-row ${isLive ? 'is-live' : 'is-quiet'} ${isFull ? 'is-full' : ''}">
        ${usersHTML}
        <div class="status-icon" style="margin-left: auto;">
          ${micIcon}
        </div>
      </div>
    </div>
  `;

  if (isFull) {
    card.style.opacity = '0.6';
    card.style.cursor = 'not-allowed';
  }

  // Intercept click — show conflict modal if user is already in a different junction
  // Also prompt for password if the room is protected
  card.addEventListener('click', async (e) => {
    e.preventDefault(); // Always prevent default so we can handle async logic

    if (isFull) {
      alert(`This junction is full (Max 8 participants).`);
      return;
    }
    
    let pwd = null;
    if (room.hasPassword) {
      pwd = await promptForPassword(room.name);
      if (pwd === null) return; // cancelled
    }

    const activeJunction = storage.getActiveJunction();

    if (activeJunction && activeJunction.roomId !== room.id) {
      e.preventDefault();
      const proceed = await confirmJunctionSwitch(
        activeJunction.roomName || activeJunction.roomId,
        room.name
      );
      if (proceed) {
        // Immediately evict user from old junction on the server so others see them gone right away
        const userProfile = storage.getUserProfile();
        if (userProfile?.tag) {
          try {
            await fetch('/api/leave-room', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId: activeJunction.roomId, tag: userProfile.tag })
            });
          } catch (_) { /* best-effort — navigation proceeds regardless */ }
        }
        storage.clearActiveJunction();
        const qs = pwd ? `?id=${encodeURIComponent(room.id)}&pwd=${encodeURIComponent(pwd)}` : `?id=${encodeURIComponent(room.id)}`;
        window.location.href = `room.html${qs}`;
      }
    } else {
      // No active junction, or same junction → navigate normally
      const qs = pwd ? `?id=${encodeURIComponent(room.id)}&pwd=${encodeURIComponent(pwd)}` : `?id=${encodeURIComponent(room.id)}`;
      window.location.href = `room.html${qs}`;
    }
  });


  return card;
}
