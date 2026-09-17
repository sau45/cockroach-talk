/**
 * CockroachTalk - DOM Utilities
 * File Responsibility: Safe DOM helper functions, XSS escaping, and compact chip cards with 1-top 2-bottom micro avatar clusters.
 */

import { storage } from './storage.js';

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
    const modal      = document.getElementById('junction-conflict-modal');
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

  // Cockroach SVG Icon (Standardized to 24px via CSS)
  const cockroachSVG = `
    <svg class="cockroach-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2v3M8 3.5l1.5 2.5M16 3.5l-1.5 2.5"/> <ellipse cx="12" cy="13" rx="4.5" ry="6.5" fill="var(--white)"/> <path d="M7.5 10H3M16.5 10H21M7 13.5H2.5M17 13.5H21.5M7.5 17L4.5 19.5M16.5 17l3 2.5"/> <line x1="12" y1="6.5" x2="12" y2="19.5"/> </svg>
  `;

  // Mic Icon for active state
  const micIcon = isLive ? `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path> <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path> <line x1="12" y1="19" x2="12" y2="22"></line> <line x1="8" y1="22" x2="16" y2="22"></line> </svg>` : `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"> <rect x="3" y="3" width="18" height="18" rx="0" ry="0"></rect> </svg>`;

  card.innerHTML = `
    <div class="chip-top">
      ${cockroachSVG}
      <h3 class="chip-title">${escapeHTML(room.name)}</h3> </div> <div class="chip-bottom"> <div class="status-row ${isLive ? 'is-live' : 'is-quiet'}"> <div class="status-indicator"> <span class="status-dot"></span> <span class="status-label">${isLive ? 'ACTIVE' : 'QUIET'}</span> </div> <div class="status-icon">
          ${micIcon}
        </div> </div> </div>
  `;

  // Intercept click — show conflict modal if user is already in a different junction
  card.addEventListener('click', async (e) => {
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
        window.location.href = `room.html?id=${encodeURIComponent(room.id)}`;
      }
    }
    // No active junction, or same junction → let href navigate normally
  });


  return card;
}
