/**
 * CockroachTalk - Live Voice Room Page Controller
 * File Responsibility: Junction Debate Waiting Queue & Room Entry System (State updates, Moderator powers, Seniority removal authority, Quick Comment, Toasts).
 */

import { WebRTCStub } from '../webrtcStub.js';
import { storage } from '../utils/storage.js';
import { ICONS } from '../utils/icons.js';
import { escapeHTML } from '../utils/dom.js';

import { renderPermissionModal } from '../partials/modals/permissionModal.js';
import { renderProfileModal } from '../partials/modals/profileModal.js';
import { renderAdmitUserModal } from '../partials/modals/admitUserModal.js';
import { renderQuickCommentModal } from '../partials/modals/quickCommentModal.js';

// Inject room-specific modals synchronously so they are available for DOM queries
const roomModalHTML = 
  renderPermissionModal() + 
  renderProfileModal() + 
  renderAdmitUserModal() + 
  renderQuickCommentModal();
document.body.insertAdjacentHTML('beforeend', roomModalHTML);

/**
 * Formats user handle into compact Co...#1011 style.
 */
function formatCompactHandle(name, tag) {
  if (tag) return `Co..#${tag}`;
  if (!name) return 'C..#1001';
  if (name.includes('#')) {
    const parts = name.split('#');
    return `Co..#${parts[1] || '1001'}`;
  }
  if (name.length > 10) {
    return `${name.substring(0, 4)}...`;
  }
  return name;
}

/**
 * Formats milliseconds into exact mm:ss per second (e.g. 04:12)
 */
function formatTimeMS(ms) {
  if (!ms || ms < 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const padMin = String(min).padStart(2, '0');
  const padSec = String(sec).padStart(2, '0');
  return `${padMin}:${padSec}`;
}

/**
 * Formats milliseconds into human readable time (e.g. 45s or 03m 12s)
 */
function formatWaitTime(ms) {
  if (!ms || ms < 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${String(min).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}

/**
 * Displays animated non-intrusive Toast Notification
 */
function showToast(message) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.innerHTML = `<span><i class="bi bi-shield-fill-check" aria-hidden="true"></i></span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Global top-level helper for direct inline onclick on admit button
window.__handleAdmitClick = function (btnEl, event) {
  if (event) {
    try { event.preventDefault(); event.stopPropagation(); } catch (e) { }
  }
  console.log('<i class="bi bi-rocket-takeoff-fill" aria-hidden="true"></i> [Admit] window.__handleAdmitClick triggered!', btnEl);

  if (!btnEl) {
    console.warn('[Admit] No button element provided');
    return;
  }

  let tag = btnEl.getAttribute('data-admit-tag') || btnEl.getAttribute('data-target-tag');
  let socketId = btnEl.getAttribute('data-admit-socket') || btnEl.getAttribute('data-target-socket');

  if (!tag && btnEl.textContent) {
    const match = btnEl.textContent.match(/#(\d+)/);
    if (match) tag = match[1];
  }

  const roomState = window._currentRoomState;
  if (roomState && roomState.waitingQueue) {
    const live = roomState.waitingQueue.find(q =>
      (tag && String(q.tag) === String(tag)) ||
      (socketId && q.socketId === socketId)
    );
    if (live) {
      tag = String(live.tag);
      socketId = live.socketId || socketId;
    }
  }

  console.log(`[Admit] Emitting admit-user to server: socketId=${socketId}, tag=${tag}`);

  btnEl.innerHTML = '<i class="bi bi-hourglass-split" aria-hidden="true"></i> Admitting...';
  btnEl.disabled = true;

  WebRTCStub.admitUser(socketId, tag);

  setTimeout(() => {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) profileModal.classList.remove('active');
  }, 200);
};

// Capture-phase document-level click listener (fires before any child propagation stops)
document.addEventListener('click', (e) => {
  const admitBtn = e.target && e.target.closest && e.target.closest('#btn-execute-admit-modal');
  if (admitBtn) {
    console.log('<i class="bi bi-rocket-takeoff-fill" aria-hidden="true"></i> [Admit] document capture-phase click caught!', admitBtn);
    window.__handleAdmitClick(admitBtn, e);
  }
}, true);

document.addEventListener('DOMContentLoaded', async () => {
  const userProfile = await storage.ensureUserProfile();

  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('id') || 'maharashtra';
  const roomPwd = urlParams.get('pwd') || null;

  const formattedRoomNameForStorage = roomId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  storage.setActiveJunction(roomId, formattedRoomNameForStorage);

  // Heartbeat: refresh the timestamp every 5 minutes so the 30-min expiry stays alive
  const _junctionHeartbeat = setInterval(() => {
    storage.setActiveJunction(roomId, formattedRoomNameForStorage);
  }, 5 * 60 * 1000);

  // UI Elements
  const roomTitleEl = document.getElementById('room-title');
  const roomTopicEl = document.getElementById('room-topic');
  const listenerCountEl = document.getElementById('room-listener-count');
  const stageCapacityBadge = document.getElementById('stage-capacity-badge');
  const seniorModIndicator = document.getElementById('senior-mod-indicator');
  const stageModStatsEl = document.getElementById('stage-mod-stats');

  const stageGrid = document.getElementById('stage-grid');
  const queueGrid = document.getElementById('queue-grid');
  const queueCountEl = document.getElementById('queue-count');
  const queueActionPanel = document.getElementById('queue-action-panel');
  const waitTimerDisplay = document.getElementById('wait-timer-display');
  const btnQueueRaiseHand = document.getElementById('btn-queue-raise-hand');

  const quickCommentLock = document.getElementById('quick-comment-lock');
  const quickCommentForm = document.getElementById('quick-comment-form');
  const inputQuickComment = document.getElementById('input-quick-comment');
  const quickCommentSent = document.getElementById('quick-comment-sent');

  const micButton = document.getElementById('mic-button');
  const micIconContainer = document.getElementById('mic-icon-container');
  const btnRaiseHand = document.getElementById('btn-raise-hand');
  const btnRecordStage = document.getElementById('btn-record-stage');
  const btnReport = document.getElementById('btn-report-room');

  // Chat UI Elements
  const btnToggleChat = document.getElementById('btn-toggle-chat');
  const btnCloseChat = document.getElementById('btn-close-chat');
  const chatSidebar = document.getElementById('chat-sidebar');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const chatUnreadBadge = document.getElementById('chat-unread-badge');

  const permModal = document.getElementById('permission-modal');
  const btnGrantPerm = document.getElementById('btn-grant-permission');

  const profileModal = document.getElementById('profile-modal');
  const btnCloseProfileModal = document.getElementById('btn-close-profile-modal');
  const btnProfileModalClose = document.getElementById('profile-modal-close');

  const quickCommentModal = document.getElementById('quick-comment-modal');
  const btnOpenCommentModal = document.getElementById('btn-open-comment-modal');
  const btnCloseCommentModal = document.getElementById('btn-close-comment-modal');
  const commentModalClose = document.getElementById('comment-modal-close');

  const admitUserModal = document.getElementById('admit-user-modal');
  const admitModalClose = document.getElementById('admit-modal-close');
  const btnAdmitUserConfirm = document.getElementById('btn-admit-user-confirm');

  function closeProfileModal() {
    if (profileModal) {
      profileModal.classList.remove('active');
      setTimeout(() => { profileModal.style.display = 'none'; }, 200);
    }
  }

  function closeQuickCommentModal() {
    if (quickCommentModal) {
      quickCommentModal.classList.remove('active');
      setTimeout(() => { quickCommentModal.style.display = 'none'; }, 200);
    }
  }

  function closeAdmitModal() {
    if (admitUserModal) {
      admitUserModal.classList.remove('active');
      setTimeout(() => { admitUserModal.style.display = 'none'; }, 200);
    }
  }

  // Chat Toggle Logic
  let isChatOpen = false;
  if (btnToggleChat) {
    btnToggleChat.addEventListener('click', () => {
      isChatOpen = true;
      if (chatSidebar) chatSidebar.classList.add('open');
      if (chatUnreadBadge) chatUnreadBadge.style.display = 'none';
      if (chatInput) chatInput.focus();
    });
  }

  if (btnCloseChat) {
    btnCloseChat.addEventListener('click', () => {
      isChatOpen = false;
      if (chatSidebar) chatSidebar.classList.remove('open');
    });
  }

  // Chat Form Submission
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (text.length > 0) {
        WebRTCStub.sendChatMessage(text);
        chatInput.value = '';
      }
    });
  }

  if (btnCloseProfileModal) btnCloseProfileModal.addEventListener('click', closeProfileModal);
  if (btnProfileModalClose) btnProfileModalClose.addEventListener('click', closeProfileModal);

  if (admitModalClose) admitModalClose.addEventListener('click', closeAdmitModal);
  if (admitUserModal) {
    admitUserModal.addEventListener('click', (e) => {
      if (e.target === admitUserModal) closeAdmitModal();
    });
  }

  function openAdmitUserModal(targetUser) {
    const modal = admitUserModal || document.getElementById('admit-user-modal');
    if (!modal) {
      console.warn('[Admit Modal] #admit-user-modal element not found in DOM!');
      openQueueUserModal(targetUser, true);
      return;
    }
    modal.style.display = 'flex';

    const avatarEl = document.getElementById('admit-modal-avatar');
    const nameEl = document.getElementById('admit-modal-username');
    const waitEl = document.getElementById('admit-modal-waittime');
    const commentWrap = document.getElementById('admit-modal-comment-container');
    const commentText = document.getElementById('admit-modal-comment-text');
    const confirmBtn = btnAdmitUserConfirm || document.getElementById('btn-admit-user-confirm');

    const genderClass = `avatar-gender-${targetUser.gender || 'skip'}`;
    const initial = (targetUser.name || 'C').charAt(0).toUpperCase();
    const compactDisplayName = formatCompactHandle(targetUser.name, targetUser.tag);
    const waitTimeText = formatWaitTime(targetUser.waitTimeMs);

    if (avatarEl) {
      avatarEl.className = `avatar avatar-md ${genderClass}`;
      avatarEl.textContent = initial;
    }
    if (nameEl) nameEl.textContent = compactDisplayName;
    if (waitEl) waitEl.innerHTML = `<i class="bi bi-hourglass-split" aria-hidden="true"></i> Waiting: ${waitTimeText}`;

    if (commentWrap && commentText) {
      if (targetUser.quickComment) {
        commentText.textContent = `"${targetUser.quickComment}"`;
        commentWrap.style.display = 'block';
      } else {
        commentWrap.style.display = 'none';
      }
    }

    if (confirmBtn) {
      confirmBtn.setAttribute('data-target-socket', targetUser.socketId || '');
      confirmBtn.setAttribute('data-target-tag', String(targetUser.tag || ''));
      confirmBtn.textContent = `+ Admit ${compactDisplayName} to Active Stage`;
      confirmBtn.disabled = false;
    }

    modal.classList.add('active');
  }

  if (btnAdmitUserConfirm) {
    btnAdmitUserConfirm.addEventListener('click', () => {
      let socketId = btnAdmitUserConfirm.getAttribute('data-target-socket');
      let tag = btnAdmitUserConfirm.getAttribute('data-target-tag');

      const roomState = currentRoomState || window._currentRoomState;
      if (roomState && roomState.waitingQueue) {
        const liveUser = roomState.waitingQueue.find(q =>
          (tag && String(q.tag) === String(tag)) ||
          (socketId && q.socketId === socketId)
        );
        if (liveUser) {
          socketId = liveUser.socketId || socketId;
          tag = String(liveUser.tag);
        }
      }

      console.log(`[Admit Confirm Clicked] Admitting user: socketId=${socketId}, tag=${tag}`);

      btnAdmitUserConfirm.innerHTML = '<i class="bi bi-hourglass-split" aria-hidden="true"></i> Admitting...';
      btnAdmitUserConfirm.disabled = true;

      WebRTCStub.admitUser(socketId, tag);

      setTimeout(() => {
        closeAdmitModal();
      }, 200);
    });
  }

  // Single delegated click handler on the profile modal — handles ALL dynamic buttons inside
  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      // Close on backdrop click
      if (e.target === profileModal) {
        closeProfileModal();
        return;
      }

      // Admit button inside queue user modal
      const admitBtn = e.target.closest('#btn-execute-admit-modal');
      if (admitBtn) {
        e.stopPropagation();
        const tag = admitBtn.getAttribute('data-admit-tag');
        const socketId = admitBtn.getAttribute('data-admit-socket');

        // Get freshest data from live room state
        let resolvedTag = tag;
        let resolvedSocket = socketId;
        if (currentRoomState && currentRoomState.waitingQueue) {
          const live = currentRoomState.waitingQueue.find(q =>
            (tag && String(q.tag) === String(tag)) ||
            (socketId && q.socketId === socketId)
          );
          if (live) {
            resolvedTag = String(live.tag);
            resolvedSocket = live.socketId;
          }
        }

        console.log('[Admit] delegated click! resolvedTag=', resolvedTag, 'resolvedSocket=', resolvedSocket);
        console.log('[Admit] socket connected=', WebRTCStub.socket?.connected, 'socketId=', WebRTCStub.socket?.id);

        if (WebRTCStub.socket && WebRTCStub.socket.connected) {
          WebRTCStub.socket.emit('admit-user', { targetSocketId: resolvedSocket, targetTag: resolvedTag });
          closeProfileModal();
        } else {
          showToast('<i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> Not connected to server. Please refresh the page.');
        }
        return;
      }

      // Remove button inside active stage profile modal
      const removeBtn = e.target.closest('#btn-execute-remove');
      if (removeBtn) {
        e.stopPropagation();
        const targetId = removeBtn.getAttribute('data-socket-id');
        const targetTag = removeBtn.getAttribute('data-target-tag');
        if (targetId || targetTag) {
          showToast(`<i class="bi bi-info-circle-fill"></i> Removing user...`);
          WebRTCStub.removeUser(targetId, targetTag);
          closeProfileModal();
        } else {
          showToast(`<i class="bi bi-exclamation-triangle-fill"></i> Error: No target ID or tag found.`);
        }
        return;
      }

      // Comment button inside queue user modal
      const commentBtn = e.target.closest('#btn-modal-open-comment');
      if (commentBtn) {
        e.stopPropagation();
        closeProfileModal();
        openQuickCommentModal();
        return;
      }
      // Report button inside profile modal
      const reportBtn = e.target.closest('#btn-report-user-modal');
      if (reportBtn) {
        e.stopPropagation();
        const reportedTag = reportBtn.getAttribute('data-report-tag');
        if (!reportedTag) return;
        
        const reportOverlay = document.createElement('div');
        reportOverlay.className = 'modal-backdrop active';
        reportOverlay.style.zIndex = '10000002'; // Above profile modal
        reportOverlay.innerHTML = `
          <div class="modal-content" style="max-width: 420px; background: var(--bg-card); border: 2px solid var(--border-main); border-radius: 0px; box-shadow: var(--shadow-md); padding: 1.5rem;">
            <div class="modal-header" style="border-bottom: 2px solid var(--border-main); padding-bottom: 1rem; margin-bottom: 1rem;">
              <h2 style="font-family: var(--font-family-heading); font-size: 1.5rem; margin: 0; color: var(--text-primary);">Report User</h2>
            </div>
            <div class="modal-body">
              <p style="margin-bottom: 0.75rem; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">Select a reason or type your own. Our moderation team will review this.</p>
              
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
                <button class="btn-report-chip" style="background: var(--bg-main); color: var(--text-primary); border: 1px solid var(--border-main); padding: 4px 10px; font-size: 0.8rem; border-radius: 16px; cursor: pointer;">Abusive Language</button>
                <button class="btn-report-chip" style="background: var(--bg-main); color: var(--text-primary); border: 1px solid var(--border-main); padding: 4px 10px; font-size: 0.8rem; border-radius: 16px; cursor: pointer;">Spam / Advertising</button>
                <button class="btn-report-chip" style="background: var(--bg-main); color: var(--text-primary); border: 1px solid var(--border-main); padding: 4px 10px; font-size: 0.8rem; border-radius: 16px; cursor: pointer;">Harassment</button>
                <button class="btn-report-chip" style="background: var(--bg-main); color: var(--text-primary); border: 1px solid var(--border-main); padding: 4px 10px; font-size: 0.8rem; border-radius: 16px; cursor: pointer;">Trolling / Disruptive</button>
              </div>

              <textarea id="report-reason-input" rows="3" placeholder="Type reason here..." style="width: 100%; background: var(--bg-main); border: 2px solid var(--border-main); border-radius: 0px; color: var(--text-primary); padding: 12px; font-family: var(--font-family-body); font-size: 0.95rem; resize: vertical; box-sizing: border-box;"></textarea>
            </div>
            <div class="modal-footer" style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
              <button id="btn-cancel-report" style="background: var(--bg-main); color: var(--text-primary); border: 2px solid var(--border-main); padding: 8px 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: var(--font-family-body);">Cancel</button>
              <button id="btn-submit-report" style="background: var(--accent-danger); color: #fff; border: 2px solid var(--border-main); padding: 8px 16px; font-weight: 700; cursor: pointer; box-shadow: 4px 4px 0px var(--border-main); transition: all 0.2s; font-family: var(--font-family-body);">Submit Report</button>
            </div>
          </div>
        `;
        document.body.appendChild(reportOverlay);

        // Add event listeners for chips
        const reasonInput = document.getElementById('report-reason-input');
        reportOverlay.querySelectorAll('.btn-report-chip').forEach(chip => {
          chip.addEventListener('click', (ev) => {
            reasonInput.value = ev.target.textContent;
          });
        });

        document.getElementById('btn-cancel-report').addEventListener('click', () => {
          reportOverlay.remove();
        });

        document.getElementById('btn-submit-report').addEventListener('click', () => {
          const reason = document.getElementById('report-reason-input').value.trim();
          if (!reason) {
            showToast('<i class="bi bi-exclamation-triangle-fill"></i> Please enter a reason.');
            return;
          }
          
          reportOverlay.remove();
          reportBtn.disabled = true;
          reportBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>...';
          
          fetch('/api/report-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reporterTag: userProfile.tag,
              reportedTag: reportedTag,
              reason: reason
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              showToast('<i class="bi bi-check-circle-fill" style="color:var(--accent-success)"></i> User reported successfully.');
              closeProfileModal();
            } else {
              showToast('<i class="bi bi-exclamation-triangle-fill" style="color:var(--accent-danger)"></i> Failed to report: ' + data.message);
              reportBtn.disabled = false;
              reportBtn.innerHTML = '<i class="bi bi-flag-fill"></i> Report';
            }
          })
          .catch(err => {
            console.error('Report error:', err);
            showToast('<i class="bi bi-exclamation-triangle-fill" style="color:var(--accent-danger)"></i> Failed to submit report.');
            reportBtn.disabled = false;
            reportBtn.innerHTML = '<i class="bi bi-flag-fill"></i> Report';
          });
        });
        return;
      }
    });
  }

  if (btnCloseCommentModal) btnCloseCommentModal.addEventListener('click', closeQuickCommentModal);
  if (commentModalClose) commentModalClose.addEventListener('click', closeQuickCommentModal);
  if (quickCommentModal) {
    quickCommentModal.addEventListener('click', (e) => {
      if (e.target === quickCommentModal) closeQuickCommentModal();
    });
  }

  if (btnOpenCommentModal) {
    btnOpenCommentModal.addEventListener('click', () => {
      openQuickCommentModal();
    });
  }

  function openQuickCommentModal() {
    const modal = quickCommentModal || document.getElementById('quick-comment-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    updateQuickCommentModalContent(true);
    modal.classList.add('active');

    // Focus input field immediately so user can type cleanly
    setTimeout(() => {
      const inputModal = document.getElementById('input-quick-comment-modal');
      if (inputModal) inputModal.focus();
    }, 50);
  }

  function updateQuickCommentModalContent(force = false) {
    const statusArea = document.getElementById('comment-modal-status-area');
    if (!statusArea) return;

    const activeMembers = (currentRoomState && currentRoomState.activeMembers) || [];
    const waitingQueue = (currentRoomState && currentRoomState.waitingQueue) || [];

    const selfMember = activeMembers.find(m => m.socketId === currentSelfSocketId || String(m.tag) === String(userProfile?.tag)) ||
      waitingQueue.find(q => q.socketId === currentSelfSocketId || String(q.tag) === String(userProfile?.tag));

    if (selfMember && selfMember.commentUsed) {
      statusArea.innerHTML = `
        <div class="comment-submitted-tag"> <span style="font-size: 0.72rem; color: #10b981;"><i class="bi bi-chat-right-text-fill" aria-hidden="true"></i> Comment Submitted:</span> <strong style="color: var(--accent-gold); font-size: 0.82rem;">"${escapeHTML(selfMember.quickComment)}"</strong> </div>
      `;
    } else {
      // If form is already rendered, do NOT overwrite it (preserves user typing focus)
      const existingForm = statusArea.querySelector('#quick-comment-modal-form');
      if (existingForm && !force) return;

      statusArea.innerHTML = `
        <form id="quick-comment-modal-form" class="comment-modal-form"> <input type="text" id="input-quick-comment-modal" maxlength="30" placeholder="Type quick comment (max 30 chars)..." class="comment-modal-input" required autocomplete="off"> <button type="submit" class="btn btn-gold btn-pill btn-sm" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">Send</button> </form>
      `;

      const formModal = statusArea.querySelector('#quick-comment-modal-form');
      const inputModal = statusArea.querySelector('#input-quick-comment-modal');

      if (formModal && inputModal) {
        formModal.addEventListener('submit', (e) => {
          e.preventDefault();
          const comment = inputModal.value.trim();
          if (comment) {
            WebRTCStub.submitQuickComment(comment);
            closeQuickCommentModal();
          }
        });
      }
    }
  }

  function openProfileModal(targetMember, activeMembers, seniorModSocketId, selfMember) {
    if (!profileModal) return;

    const isSelf = (targetMember.socketId === currentSelfSocketId || targetMember.tag === userProfile.tag);
    const isSelfMod = selfMember && selfMember.isModerator;
    const canRemoveTarget = isSelfMod && !isSelf;

    const genderClass = `avatar-gender-${targetMember.gender || 'skip'}`;
    const speakingClass = targetMember.isSpeaking ? 'avatar-speaking' : '';
    const initial = (targetMember.name || 'C').charAt(0).toUpperCase();
    const compactDisplayName = formatCompactHandle(targetMember.name, targetMember.tag);

    const micStatusClass = targetMember.isSpeaking ? 'speaking' : (targetMember.isMuted ? 'muted' : 'unmuted');
    const micStatusLabel = targetMember.isSpeaking ? '<i class="bi bi-lightning-fill" aria-hidden="true"></i> Speaking Live' : (targetMember.isMuted ? '<i class="bi bi-mic-fill" aria-hidden="true"></i> Muted' : '<i class="bi bi-circle-fill text-success" aria-hidden="true"></i> Open Mic');
    const micStatusTitle = targetMember.isSpeaking ? 'Speaking Live' : (targetMember.isMuted ? 'Muted' : 'Open Mic');

    const avatarWrap = document.getElementById('profile-modal-avatar-container');
    if (avatarWrap) {
      avatarWrap.innerHTML = `
        <div class="avatar avatar-lg ${genderClass} ${speakingClass}">
          ${escapeHTML(initial)}
          
          ${targetMember.isModerator ? `
            <div class="avatar-mod-badge" title="Stage Moderator (10+ min on stage, max 4)"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2v3M8 3.5l1.5 2.5M16 3.5l-1.5 2.5"/> <ellipse cx="12" cy="13" rx="4.5" ry="6.5" fill="rgba(255, 255, 255, 0.3)"/> <path d="M7.5 10H3M16.5 10H21M7 13.5H2.5M17 13.5H21.5M7.5 17L4.5 19.5M16.5 17l3 2.5"/> <line x1="12" y1="6.5" x2="12" y2="19.5"/> </svg> </div>
          ` : ''}

          <div class="avatar-mic-badge ${micStatusClass}" title="${micStatusTitle}">
            ${targetMember.isSpeaking ? `
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path> <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path> <line x1="12" y1="19" x2="12" y2="22"></line> </svg>
            ` : (targetMember.isMuted ? `
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"> <line x1="2" y1="2" x2="22" y2="22"></line> <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path> <path d="M5 10v2a7 7 0 0 0 12 5.59"></path> <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path> <path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path> <line x1="12" y1="19" x2="12" y2="22"></line> </svg>
            ` : `
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path> <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path> <line x1="12" y1="19" x2="12" y2="22"></line> </svg>
            `)}
          </div> </div>
      `;
    }

    const nameEl = document.getElementById('profile-modal-name');
    if (nameEl) nameEl.innerHTML = compactDisplayName + (isSelf ? ' <i class="bi bi-person-fill" aria-hidden="true"></i>' : '');

    const cockroachSVG = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px; vertical-align: text-bottom;"> <path d="M12 2v3M8 3.5l1.5 2.5M16 3.5l-1.5 2.5"/> <ellipse cx="12" cy="13" rx="4.5" ry="6.5" fill="var(--accent-purple)" opacity="0.3"/> <path d="M7.5 10H3M16.5 10H21M7 13.5H2.5M17 13.5H21.5M7.5 17L4.5 19.5M16.5 17l3 2.5"/> <line x1="12" y1="6.5" x2="12" y2="19.5"/> </svg>
    `;

    const boltSVG = `
      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="margin-right: 2px; vertical-align: text-bottom; color: #f59e0b;"> <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/> </svg>
    `;

    const statusPillEl = document.getElementById('profile-modal-status-pill');
    if (statusPillEl) {
      statusPillEl.innerHTML = `
        <span style="color: var(--text-secondary);">${micStatusLabel}</span> <span><i class="bi bi-dot" aria-hidden="true"></i></span> <span style="color: var(--accent-gold); font-weight: 800;">${targetMember.isModerator ? (cockroachSVG + 'Moderator Cockroach') : 'Stage Debater'}</span>
      `;
    }

    const actionBox = document.getElementById('profile-modal-action-box');
    if (actionBox) {
      let actionHTML = '';

      if (isSelf) {
        actionHTML = `
          <div style="font-size: 0.78rem; color: var(--accent-gold); font-weight: 700; text-align: center;">
            ${selfMember && selfMember.isModerator ? '<i class="bi bi-star-fill" aria-hidden="true"></i> You are a Stage Moderator' : '<i class="bi bi-mic-fill" aria-hidden="true"></i> You are a Stage Debater (Mod status after 10m on stage)'}
          </div>
        `;
      } else if (isSelfMod) {
        if (canRemoveTarget) {
          // data-target-tag used by delegated modal click handler
          actionHTML = `
            <button id="btn-execute-remove" class="btn-remove-modal"
              data-socket-id="${escapeHTML(targetMember.socketId)}"
              data-target-tag="${escapeHTML(String(targetMember.tag || ''))}"> <i class="bi bi-x-lg" aria-hidden="true"></i> Remove ${escapeHTML(targetMember.name || 'User')} to Queue
            </button>
          `;
        }
      } else {
        actionHTML = `
          <div style="font-size: 0.78rem; color: var(--text-muted); text-align: center;"> <i class="bi bi-info-circle-fill" aria-hidden="true"></i> Waiting Queue user (Listen only).
          </div>
        `;
      }

      if (actionHTML.trim()) {
        actionBox.style.display = 'block';
        actionBox.innerHTML = actionHTML;
      } else {
        actionBox.style.display = 'none';
      }
      // Button clicks handled by delegated listener on profileModal
    }

    // Reset bio
    const bioCard = document.getElementById('profile-modal-bio-card');
    if (bioCard) bioCard.style.display = 'none';

    const btnReport = document.getElementById('btn-report-user-modal');
    if (btnReport) {
      if (isSelf) {
        btnReport.style.display = 'none';
      } else {
        btnReport.style.display = 'flex';
        btnReport.setAttribute('data-report-tag', targetMember.tag);
        btnReport.disabled = false;
        btnReport.innerHTML = '<i class="bi bi-flag-fill"></i> Report';
      }
    }

    profileModal.style.display = 'flex';
    setTimeout(() => profileModal.classList.add('active'), 10);

    // Fetch and render profile data asynchronously
    fetch(`/api/profile/${targetMember.tag}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.bio && data.bio.trim() !== '') {
            const bioText = document.getElementById('profile-modal-bio-text');
            if (bioText) {
              bioText.textContent = `"${data.bio}"`;
            }
            if (bioCard) {
              bioCard.style.display = 'block';
            }
          }
          if (data.profilePicture && avatarWrap) {
            const avatarInner = avatarWrap.querySelector('.avatar');
            if (avatarInner && !avatarInner.querySelector('img.profile-img-overlay')) {
              const img = document.createElement('img');
              img.src = data.profilePicture;
              img.className = 'profile-img-overlay';
              img.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0px !important; z-index: 0;';
              avatarInner.style.position = 'relative'; // ensure img is absolute to this
              avatarInner.style.overflow = 'hidden'; // clip if needed, though badges might be clipped. 
              // Better: just prepend it. If badges are outside, they might need z-index.
              avatarInner.insertBefore(img, avatarInner.firstChild);
              
              // Ensure badges stay on top
              const badges = avatarInner.querySelectorAll('.avatar-mic-badge, .avatar-mod-badge');
              badges.forEach(b => {
                b.style.zIndex = '2';
              });
            }
          }
        }
      })
      .catch(err => console.error('Error fetching profile:', err));
  }

  // Inside DOMContentLoaded: setup room variables

  function openQueueUserModal(targetUser, isSelfMod) {
    const modal = profileModal || document.getElementById('profile-modal');
    if (!modal) return;

    const isSelf = (targetUser.socketId === currentSelfSocketId || (targetUser.tag && String(targetUser.tag) === String(userProfile?.tag)));
    const genderClass = `avatar-gender-${targetUser.gender || 'skip'}`;
    const initial = (targetUser.name || 'C').charAt(0).toUpperCase();
    const compactDisplayName = formatCompactHandle(targetUser.name, targetUser.tag);
    const waitTimeText = formatWaitTime(targetUser.waitTimeMs);

    const avatarWrap = document.getElementById('profile-modal-avatar-container');
    if (avatarWrap) {
      avatarWrap.innerHTML = `
        <div class="avatar avatar-lg ${genderClass}">
          ${escapeHTML(initial)}
          <div class="avatar-mic-badge muted" title="Muted in Queue"> <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"> <line x1="2" y1="2" x2="22" y2="22"></line> <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path> <path d="M5 10v2a7 7 0 0 0 12 5.59"></path> <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path> <path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path> <line x1="12" y1="19" x2="12" y2="22"></line> </svg> </div> </div>
      `;
    }

    const nameEl = document.getElementById('profile-modal-name');
    if (nameEl) nameEl.innerHTML = compactDisplayName + (isSelf ? ' <i class="bi bi-person-fill" aria-hidden="true"></i>' : '');

    const statusPillEl = document.getElementById('profile-modal-status-pill');
    if (statusPillEl) {
      statusPillEl.innerHTML = `
        <span style="color: var(--text-secondary);"><i class="bi bi-hourglass-split" aria-hidden="true"></i> Waiting in Queue</span> <span><i class="bi bi-dot" aria-hidden="true"></i></span> <span style="color: var(--accent-gold); font-weight: 700;">Wait: ${waitTimeText}</span>
      `;
    }

    const actionBox = document.getElementById('profile-modal-action-box');
    if (actionBox) {
      let actionHTML = '';

      if (targetUser.quickComment) {
        actionHTML += `
          <div style="background: var(--bg-page); border: 3px solid var(--border-dark); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); margin-bottom: 0.85rem; text-align: left; box-shadow: var(--shadow-none);"> <span style="color: var(--accent-purple); font-size: 0.75rem; font-weight: 800; display: block; margin-bottom: 0.2rem;"><i class="bi bi-chat-right-text-fill" aria-hidden="true"></i> Quick Comment:</span> <span style="font-size: 0.82rem; color: var(--text-primary); font-weight: 600;">"${escapeHTML(targetUser.quickComment)}"</span> </div>
        `;
      }

      if (targetUser.raisedHand) {
        actionHTML += `
          <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-subtle); padding: 0.4rem 0.75rem; border-radius: 8px; margin-bottom: 0.85rem; font-size: 0.78rem; color: var(--accent-gold); font-weight: 700; text-align: center;"> <i class="bi bi-hand-index-thumb-fill" aria-hidden="true"></i> Hand Raised
          </div>
        `;
      }

      if (isSelfMod && !isSelf) {
        actionHTML += `
          <button
            id="btn-execute-admit-modal"
            class="btn btn-gold btn-pill"
            data-admit-tag="${escapeHTML(String(targetUser.tag || ''))}"
            data-admit-socket="${escapeHTML(targetUser.socketId || '')}"
            onclick="window.__handleAdmitClick && window.__handleAdmitClick(this, event)"
            style="width: 100%; justify-content: center; font-weight: 800; font-size: 0.88rem; padding: 0.65rem 1rem; cursor: pointer; pointer-events: all; position: relative; z-index: 999;">
            + Admit ${escapeHTML(targetUser.name || 'User')} to Active Stage
          </button>
        `;
      } else if (isSelf) {
        actionHTML += `
          <button id="btn-modal-open-comment" class="btn btn-secondary btn-pill" style="width: 100%; justify-content: center; font-size: 0.8rem; font-weight: 700; margin-top: 0.35rem;"> <i class="bi bi-chat-right-text-fill" aria-hidden="true"></i> Add / Edit Quick Comment
          </button>
        `;
      } else if (!isSelfMod) {
        actionHTML += `
          <div style="font-size: 0.78rem; color: var(--text-muted); text-align: center;"> <i class="bi bi-info-circle-fill" aria-hidden="true"></i> Waiting Queue participant (Listen only).
          </div>
        `;
      }

      actionBox.style.display = 'block';
      actionBox.innerHTML = actionHTML;

      // Direct listener attached right after innerHTML
      const btnExec = document.getElementById('btn-execute-admit-modal');
      if (btnExec) {
        btnExec.onclick = function (e) {
          window.__handleAdmitClick(this, e);
        };
      }
    }

    // Reset bio
    const bioCard = document.getElementById('profile-modal-bio-card');
    if (bioCard) bioCard.style.display = 'none';

    profileModal.classList.add('active');

    // Fetch and render profile data asynchronously
    fetch(`/api/profile/${targetUser.tag}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.bio && data.bio.trim() !== '') {
            const bioText = document.getElementById('profile-modal-bio-text');
            if (bioText) {
              bioText.textContent = `"${data.bio}"`;
            }
            if (bioCard) {
              bioCard.style.display = 'block';
            }
          }
          if (data.profilePicture && avatarWrap) {
            const avatarInner = avatarWrap.querySelector('.avatar');
            if (avatarInner && !avatarInner.querySelector('img.profile-img-overlay')) {
              const img = document.createElement('img');
              img.src = data.profilePicture;
              img.className = 'profile-img-overlay';
              img.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0px !important; z-index: 0;';
              avatarInner.style.position = 'relative'; 
              avatarInner.style.overflow = 'hidden'; 
              avatarInner.insertBefore(img, avatarInner.firstChild);
              
              const badges = avatarInner.querySelectorAll('.avatar-mic-badge, .avatar-mod-badge');
              badges.forEach(b => {
                b.style.zIndex = '2';
              });
            }
          }
        }
      })
      .catch(err => console.error('Error fetching profile:', err));
  }

  let isMuted = true;
  let currentRoomState = null;
  let currentSelfSocketId = null;

  // Format room header text
  const formattedRoomName = roomId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (roomTitleEl) roomTitleEl.textContent = formattedRoomName;
  if (roomTopicEl) roomTopicEl.textContent = `Live ${formattedRoomName} debate junction & community stage`;

  // Render Stage Grid (Active Debaters up to 8)
  function renderStageGrid(activeMembers, seniorModSocketId, selfMember) {
    if (!stageGrid) return;
    
    // Save existing video elements before clearing DOM to prevent black flashes
    const existingVideos = {};
    stageGrid.querySelectorAll('.avatar-video').forEach(vid => {
      existingVideos[vid.id] = vid;
    });

    stageGrid.innerHTML = '';

    if (!Array.isArray(activeMembers) || activeMembers.length === 0) {
      stageGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1.5rem 1rem;"> <i class="bi bi-mic-fill" aria-hidden="true"></i> No debaters currently on stage. Waiting queue members get admitted by Moderators when a slot opens!
        </div>
      `;
      return;
    }

    const isSelfMod = selfMember && selfMember.isModerator;
    const selfRemovalsLeft = selfMember ? selfMember.removalsRemaining : 0;
    const isFullRoom = activeMembers.length >= 2;

    activeMembers.forEach(member => {
      const slot = document.createElement('div');
      slot.className = 'spaces-speaker-chip';
      slot.style.cursor = 'pointer';
      slot.setAttribute('title', `Click to view ${escapeHTML(member.name)}'s profile & moderation options`);

      const isSelf = (member.socketId === currentSelfSocketId || String(member.tag) === String(userProfile?.tag));
      const speakingClass = member.isSpeaking ? 'avatar-speaking' : '';
      const genderClass = `avatar-gender-${member.gender || 'skip'}`;
      const selfTag = isSelf ? ' <span class="self-icon-badge" title="Your Account"><i class="bi bi-person-fill" aria-hidden="true"></i></span>' : '';
      const initial = (member.name || 'C').charAt(0).toUpperCase();

      const compactDisplayName = formatCompactHandle(member.name, member.tag);
      const isSeniorLead = isFullRoom && (seniorModSocketId === member.socketId);

      const micStatusClass = member.isSpeaking ? 'speaking' : (member.isMuted ? 'muted' : 'unmuted');
      const micStatusTitle = member.isSpeaking ? 'Speaking' : (member.isMuted ? 'Muted' : 'Microphone On');

      slot.innerHTML = `
        <div class="avatar avatar-xl ${genderClass} ${speakingClass}" title="${escapeHTML(member.name)}">
          <div id="video-container-${member.socketId}" style="width:100%; height:100%; position:absolute; top:0; left:0; z-index:1;"></div>
          ${member.isVideoEnabled 
            ? '' 
            : `<span class="initial">${escapeHTML(initial)}</span>`}
          
          ${member.isModerator ? `
            <div class="avatar-mod-badge" title="Stage Moderator (10+ min on stage, max 4)"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2v3M8 3.5l1.5 2.5M16 3.5l-1.5 2.5"/> <ellipse cx="12" cy="13" rx="4.5" ry="6.5" fill="rgba(255, 255, 255, 0.3)"/> <path d="M7.5 10H3M16.5 10H21M7 13.5H2.5M17 13.5H2.5M17 13.5H21.5M7.5 17L4.5 19.5M16.5 17l3 2.5"/> <line x1="12" y1="6.5" x2="12" y2="19.5"/> </svg> </div>
          ` : ''}

          <div class="avatar-mic-badge ${micStatusClass}" title="${micStatusTitle}">
            ${member.isSpeaking ? `
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path> <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path> <line x1="12" y1="19" x2="12" y2="22"></line> </svg>
            ` : (member.isMuted ? `
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"> <line x1="2" y1="2" x2="22" y2="22"></line> <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path> <path d="M5 10v2a7 7 0 0 0 12 5.59"></path> <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path> <path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path> <line x1="12" y1="19" x2="12" y2="22"></line> </svg>
            ` : `
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path> <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path> <line x1="12" y1="19" x2="12" y2="22"></line> </svg>
            `)}
          </div> </div> <div class="speaker-name-wrap"> <div class="speaker-name" title="${escapeHTML(member.name)}">${escapeHTML(compactDisplayName)}${selfTag}</div> </div>
      `;

      slot.addEventListener('click', () => {
        const selfActive = currentRoomState && currentRoomState.activeMembers ? currentRoomState.activeMembers.find(m => m.socketId === currentSelfSocketId || String(m.tag) === String(userProfile?.tag)) : selfMember;
        openProfileModal(member, activeMembers, seniorModSocketId, selfActive);
      });

      stageGrid.appendChild(slot);
      
      if (member.isVideoEnabled) {
        const container = document.getElementById(`video-container-${member.socketId}`);
        const vidId = `video-stream-${member.socketId}`;
        
        if (container) {
          if (existingVideos[vidId]) {
            // Reuse existing playing video element seamlessly
            const vidEl = existingVideos[vidId];
            container.appendChild(vidEl);
            setTimeout(() => {
              const stream = WebRTCStub.getStreamFor(member.socketId);
              if (stream) vidEl.srcObject = stream;
            }, 50);
          } else {
            // Create brand new video element
            const vidEl = document.createElement('video');
            vidEl.className = 'avatar-video';
            vidEl.autoplay = true;
            vidEl.playsInline = true;
            vidEl.muted = true;
            vidEl.id = vidId;
            container.appendChild(vidEl);
            
            setTimeout(() => {
              const stream = WebRTCStub.getStreamFor(member.socketId);
              if (stream) {
                vidEl.srcObject = stream;
              }
            }, 50);
          }
        }
      }
    });
  }

  // Render Waiting Queue Grid
  function renderQueueGrid(waitingQueue, selfMember) {
    if (!queueGrid) return;
    queueGrid.innerHTML = '';

    const isSelfMod = !!selfMember; // Active stage participant is a Stage Moderator

    if (waitingQueue.length === 0) {
      // Intentionally leave the grid completely empty instead of showing a bulky placeholder text to save screen real estate
      return;
    }

    waitingQueue.forEach(qUser => {
      const chip = document.createElement('div');
      chip.className = 'queue-chip';
      chip.setAttribute('title', 'Click to view profile & options');

      const isSelf = (qUser.socketId === currentSelfSocketId || (qUser.tag && String(qUser.tag) === String(userProfile?.tag)));
      const genderClass = `avatar-gender-${qUser.gender || 'skip'}`;
      const compactDisplayName = formatCompactHandle(qUser.name, qUser.tag);
      const waitTimeText = formatWaitTime(qUser.waitTimeMs);

      chip.innerHTML = `
        <div class="queue-chip-inner"> <div class="avatar avatar-sm ${genderClass}" style="width: 34px; height: 34px; font-size: 0.75rem;">
            ${escapeHTML((qUser.name || 'C').charAt(0).toUpperCase())}
            <div class="avatar-mic-badge muted" title="Muted in Queue"> <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"> <line x1="2" y1="2" x2="22" y2="22"></line> <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path> <path d="M5 10v2a7 7 0 0 0 12 5.59"></path> <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path> <path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path> <line x1="12" y1="19" x2="12" y2="22"></line> </svg> </div> </div> <div class="queue-user-details"> <div class="queue-user-header"> <span class="queue-user-name">${escapeHTML(compactDisplayName)}${isSelf ? '<span class="self-icon-badge" title="Your Account"><i class="bi bi-person-fill" aria-hidden="true"></i></span>' : ''}</span> </div> <div class="queue-user-meta"> <span class="queue-wait-time">${waitTimeText}</span>
              ${qUser.raisedHand ? `<span class="queue-micro-icon" title="Hand Raised"><i class="bi bi-hand-index-thumb-fill" aria-hidden="true"></i></span>` : ''}
              ${qUser.quickComment ? `<span class="queue-micro-icon" title="Has Comment"><i class="bi bi-chat-right-text-fill" aria-hidden="true"></i></span>` : ''}
            </div> </div> </div>
      `;

      chip.addEventListener('click', (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        console.log('<i class="bi bi-rocket-takeoff-fill" aria-hidden="true"></i> [Queue Chip Clicked]', qUser, { isSelfMod, isSelf });

        try {
          if (isSelfMod && !isSelf) {
            console.log('[Queue Chip] Opening Admit User Modal');
            openAdmitUserModal(qUser);
          } else if (isSelf) {
            console.log('[Queue Chip] Opening Quick Comment Modal');
            openQuickCommentModal();
          } else {
            console.log('[Queue Chip] Opening Queue User Profile Modal');
            openQueueUserModal(qUser, false);
          }
        } catch (err) {
          console.error('[Queue Chip Click Error]:', err);
          openQueueUserModal(qUser, isSelfMod);
        }
      });

      queueGrid.appendChild(chip);
    });
  }

  // Update complete Junction Debate room state from server
  function handleRoomStateUpdate(state) {
    currentRoomState = state;
    window._currentRoomState = state;
    if (WebRTCStub.socket) {
      currentSelfSocketId = WebRTCStub.socket.id;
    }

    const { activeMembers = [], waitingQueue = [], seniorModSocketId, capacity = 8 } = state;

    // Update Header Metrics
    if (stageCapacityBadge) {
      stageCapacityBadge.innerHTML = `<i class="bi bi-mic-fill" aria-hidden="true"></i> Stage: ${activeMembers.length}/${capacity}`;
    }
    if (listenerCountEl) {
      listenerCountEl.textContent = `${activeMembers.length + waitingQueue.length} Total`;
    }
    if (queueCountEl) {
      queueCountEl.textContent = `${waitingQueue.length}`;
    }

    // Identify user role
    const selfActiveMember = activeMembers.find(m => (m.socketId && m.socketId === currentSelfSocketId) || (m.tag && String(m.tag) === String(userProfile?.tag)));
    const selfQueueMember = waitingQueue.find(q => (q.socketId && q.socketId === currentSelfSocketId) || (q.tag && String(q.tag) === String(userProfile?.tag)));

    const isSelfActive = !!selfActiveMember;
    const isSelfInQueue = !!selfQueueMember;

    // Update Role Banner
    // Toggle Senior Mod Indicator
    if (seniorModIndicator) {
      if (activeMembers.length >= 2 && seniorModSocketId) {
        seniorModIndicator.style.display = 'inline-block';
      } else {
        seniorModIndicator.style.display = 'none';
      }
    }

    // Toggle Record Button visibility for moderators
    if (btnRecordStage) {
      if (isSelfActive && selfActiveMember && selfActiveMember.isModerator) {
        btnRecordStage.style.display = 'inline-flex';
      } else {
        btnRecordStage.style.display = 'none';
        if (WebRTCStub.isRecording) {
          WebRTCStub.stopRecording();
          btnRecordStage.innerHTML = '<i class="bi bi-record-circle" aria-hidden="true"></i> Record';
          btnRecordStage.classList.remove('btn-recording');
          btnRecordStage.classList.add('btn-secondary');
        }
      }
    }

    // Toggle Mic Button availability and Raise Hand visibility
    if (micButton) {
      const micContainer = micButton.closest('.mic-button-container');
      if (isSelfActive) {
        if (micContainer) micContainer.style.display = 'block';
        if (btnRaiseHand) btnRaiseHand.style.display = 'none';

        micButton.style.opacity = '1';
        micButton.style.pointerEvents = 'auto';
        micButton.title = 'Click to Mute/Unmute';
      } else {
        if (micContainer) micContainer.style.display = 'none';
        if (btnRaiseHand) btnRaiseHand.style.display = 'inline-flex';

        micButton.style.opacity = '0.4';
        micButton.style.pointerEvents = 'none';
        micButton.title = 'Muted in Waiting Queue';
        isMuted = true;
        micButton.classList.remove('active-unmuted');
        if (micIconContainer) micIconContainer.innerHTML = ICONS.micOff;
      }
    }

    // Personal Queue Action Panel logic
    if (queueActionPanel) {
      if (isSelfInQueue) {
        queueActionPanel.style.display = 'block';
        if (waitTimerDisplay) {
          waitTimerDisplay.textContent = `Waiting time: ${formatWaitTime(selfQueueMember.waitTimeMs)}`;
        }

        // Quick Comment logic (60s timer unlock, max 30 chars, single use)
        if (selfQueueMember.commentUsed) {
          if (quickCommentLock) quickCommentLock.style.display = 'none';
          if (quickCommentForm) quickCommentForm.style.display = 'none';
          if (quickCommentSent) {
            quickCommentSent.style.display = 'inline-block';
            quickCommentSent.innerHTML = `<i class="bi bi-chat-right-text-fill" aria-hidden="true"></i> Comment: "${escapeHTML(selfQueueMember.quickComment)}"`;
          }
        } else if (selfQueueMember.canComment) {
          if (quickCommentLock) quickCommentLock.style.display = 'none';
          if (quickCommentForm) quickCommentForm.style.display = 'flex';
          if (quickCommentSent) quickCommentSent.style.display = 'none';
        } else {
          if (quickCommentLock) {
            quickCommentLock.style.display = 'inline-block';
            const remainingSec = Math.max(1, Math.ceil((60000 - selfQueueMember.waitTimeMs) / 1000));
            quickCommentLock.textContent = `⏱️ Quick Comment unlocks in ${remainingSec}s`;
          }
          if (quickCommentForm) quickCommentForm.style.display = 'none';
          if (quickCommentSent) quickCommentSent.style.display = 'none';
        }

        // Raise hand button in panel
        if (btnQueueRaiseHand) {
          if (selfQueueMember.raisedHand) {
            btnQueueRaiseHand.className = 'btn btn-gold btn-pill';
            btnQueueRaiseHand.innerHTML = '<i class="bi bi-hand-index-thumb-fill" aria-hidden="true"></i> Hand Raised';
          } else {
            btnQueueRaiseHand.className = 'btn btn-secondary btn-pill';
            btnQueueRaiseHand.innerHTML = '<i class="bi bi-hand-index-thumb-fill" aria-hidden="true"></i> Raise Hand';
          }
        }

      } else {
        queueActionPanel.style.display = 'none';
      }
    }

    // Render Stage and Queue Grids
    renderStageGrid(activeMembers, seniorModSocketId, selfActiveMember);
    renderQueueGrid(waitingQueue, selfActiveMember);
    updateTimersPerSecond();
  }

  // Update live per-second counters for Stage Mod stats, personal wait timer, and quick comment countdown
  function updateTimersPerSecond() {
    if (!currentRoomState) return;
    try {
      const now = Date.now();
      const activeMembers = currentRoomState.activeMembers || [];
      const waitingQueue = currentRoomState.waitingQueue || [];

      const selfActiveMember = activeMembers.find(m => (m.socketId && m.socketId === currentSelfSocketId) || (m.tag && String(m.tag) === String(userProfile?.tag)));
      const selfQueueMember = waitingQueue.find(q => (q.socketId && q.socketId === currentSelfSocketId) || (q.tag && String(q.tag) === String(userProfile?.tag)));

      const badgeCap = stageCapacityBadge || document.getElementById('stage-capacity-badge');
      const listenerCount = listenerCountEl || document.getElementById('room-listener-count');
      const queueCount = queueCountEl || document.getElementById('queue-count');

      // Live sync header metric badges
      if (badgeCap) {
        badgeCap.innerHTML = `<i class="bi bi-mic-fill" aria-hidden="true"></i> Stage: ${activeMembers.length}/${currentRoomState.capacity || 8}`;
      }
      if (listenerCount) {
        listenerCount.textContent = `${activeMembers.length + waitingQueue.length} Total`;
      }
      if (queueCount) {
        queueCount.textContent = `${waitingQueue.length}`;
      }

      // Ensure stage grid chips are rendered if grid count is mismatched
      if (stageGrid && (stageGrid.children.length !== activeMembers.length)) {
        renderStageGrid(activeMembers, currentRoomState.seniorModSocketId, selfActiveMember);
      }

      // Stage timer display beside "Live Active Stage (Max 8)"
      if (stageModStatsEl) {
        const MODERATOR_WAIT_TIME_MS = 1 * 60 * 1000;
        if (selfActiveMember) {
          const activeTimeMs = now - (selfActiveMember.joinedActiveAt || now);
          const timeRemainingMs = Math.max(0, MODERATOR_WAIT_TIME_MS - activeTimeMs);
          if (timeRemainingMs > 0) {
            stageModStatsEl.innerHTML = `<i class="bi bi-mic-fill" aria-hidden="true"></i> Active Stage <i class="bi bi-dot" aria-hidden="true"></i> ${formatTimeMS(timeRemainingMs)}`;
          } else {
            stageModStatsEl.innerHTML = selfActiveMember.isModerator ? '<i class="bi bi-bug-fill" aria-hidden="true"></i> Moderator' : '<i class="bi bi-mic-fill" aria-hidden="true"></i> Active Stage';
          }
          stageModStatsEl.style.display = 'inline-flex';
        } else if (activeMembers.length > 0) {
          const earliestJoined = Math.min(...activeMembers.map(m => m.joinedActiveAt || now));
          const activeTimeMs = now - earliestJoined;
          const timeRemainingMs = Math.max(0, MODERATOR_WAIT_TIME_MS - activeTimeMs);
          if (timeRemainingMs > 0) {
            stageModStatsEl.innerHTML = `<i class="bi bi-star-fill" aria-hidden="true"></i> Stage Active <i class="bi bi-dot" aria-hidden="true"></i> ${formatTimeMS(timeRemainingMs)}`;
          } else {
            stageModStatsEl.innerHTML = `<i class="bi bi-star-fill" aria-hidden="true"></i> Stage Active`;
          }
          stageModStatsEl.style.display = 'inline-flex';
        } else {
          stageModStatsEl.style.display = 'none';
        }
      }

      // 3. Personal Queue Wait Timer & Quick Comment Countdown
      if (selfQueueMember) {
        const waitMs = now - selfQueueMember.joinedWaitAt;
        if (waitTimerDisplay) {
          waitTimerDisplay.textContent = `Waiting time: ${formatWaitTime(waitMs)}`;
        }
      }
    } catch (e) {
      console.warn('[Ticker Error]:', e);
    }
  }

  // Run per-second live ticker
  setInterval(updateTimersPerSecond, 1000);

  // Connect WebRTC & Socket.io Signaling
  async function initVoiceConnection() {
    await WebRTCStub.connectToRoom(roomId, userProfile, roomPwd, {
      onRoomEmoji: ({ socketId, tag, emoji }) => {
        // Prevent double-spawning your own emojis if server echoes them back
        if (socketId === WebRTCStub.socket?.id || socketId === currentSelfSocketId) return;
        spawnEmoji(emoji);
      },
      onChatMessage: (data) => {
        handleIncomingChatMessage(data);
      },
      onRoomStateUpdate: (state) => {
        if (state.name) {
          const titleEl = document.querySelector('.header-title');
          if (titleEl) {
            titleEl.innerHTML = `${escapeHTML(state.name)} <span style="font-weight: 300; opacity: 0.8; font-size: 0.9em;">Live</span>`;
          }
        }
        handleRoomStateUpdate(state);
      },
      onRoleAssigned: ({ role }) => {
        if (role === 'active') {
          showToast('<i class="bi bi-emoji-smile-fill" aria-hidden="true"></i> You have been admitted to the Live Active Stage! Unmute your mic to speak.');
        } else if (role === 'queue') {
          showToast('<i class="bi bi-info-circle-fill" aria-hidden="true"></i> You were moved to the Waiting Queue.');
        }
      },
      onRemovalToast: ({ message }) => {
        showToast(message);
      },
      onActionError: ({ message }) => {
        showToast(`<i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> ${message}`);
      },
      onPeerMuteChanged: ({ socketId, tag, isMuted: peerMuted, isSpeaking }) => {
        if (currentRoomState && currentRoomState.activeMembers) {
          const member = currentRoomState.activeMembers.find(m => m.socketId === socketId || m.tag === tag);
          if (member) {
            member.isMuted = peerMuted;
            member.isSpeaking = isSpeaking;
            const selfActiveMember = currentRoomState.activeMembers.find(m => m.socketId === currentSelfSocketId);
            renderStageGrid(currentRoomState.activeMembers, currentRoomState.seniorModSocketId, selfActiveMember);
          }
        }
      },
      onLocalSpeakingState: (isSpeaking) => {
        if (currentRoomState && currentRoomState.activeMembers) {
          const selfActiveMember = currentRoomState.activeMembers.find(m => m.socketId === currentSelfSocketId || m.tag === userProfile.tag);
          if (selfActiveMember && selfActiveMember.isSpeaking !== isSpeaking && !isMuted) {
            selfActiveMember.isSpeaking = isSpeaking;
            renderStageGrid(currentRoomState.activeMembers, currentRoomState.seniorModSocketId, selfActiveMember);
          }
        }
      }
    });
  }

  // Force the Join Audio modal to show on every page load to fix browser autoplay policies
  if (permModal) {
    permModal.classList.add('active');
  }

  // Expose a global function for the inline HTML onclick handler to use
  window._forceMicInit = async () => {
    storage.saveMicPermission(true);
    if (WebRTCStub.audioContext && WebRTCStub.audioContext.state === 'suspended') {
      WebRTCStub.audioContext.resume();
    }
    await WebRTCStub.getLocalMicrophone();
  };

  if (btnGrantPerm) {
    btnGrantPerm.addEventListener('click', async () => {
      if (permModal) {
        permModal.classList.remove('active');
        setTimeout(() => { permModal.style.display = 'none'; }, 200);
      }
      await window._forceMicInit();
    });
  }

  await initVoiceConnection();

  // Mic Button Toggle Mute Logic
  if (micButton) {
    micButton.addEventListener('click', async () => {
      isMuted = !isMuted;
      await WebRTCStub.setMuteState(isMuted);

      if (isMuted) {
        micButton.classList.remove('active-unmuted');
        if (micIconContainer) micIconContainer.innerHTML = ICONS.micOff;
      } else {
        micButton.classList.add('active-unmuted');
        if (micIconContainer) micIconContainer.innerHTML = ICONS.mic;
      }
    });
  }

  // Video Button Toggle Camera Logic
  const videoButton = document.getElementById('video-button');
  const videoIconContainer = document.getElementById('video-icon-container');
  let isVideoEnabled = false;
  
  if (videoButton) {
    videoButton.addEventListener('click', async () => {
      isVideoEnabled = !isVideoEnabled;
      
      try {
          await WebRTCStub.setVideoState(isVideoEnabled);
          if (isVideoEnabled) {
              videoButton.classList.add('active-unmuted');
              if (videoIconContainer) videoIconContainer.innerHTML = '<i class="bi bi-camera-video-fill" style="font-size: 1.2rem;"></i>';
          } else {
              videoButton.classList.remove('active-unmuted');
              if (videoIconContainer) videoIconContainer.innerHTML = '<i class="bi bi-camera-video-off" style="font-size: 1.2rem;"></i>';
          }
          
          // Re-render local stage to show our video immediately
          if (currentRoomState && currentRoomState.activeMembers) {
              const selfActiveMember = currentRoomState.activeMembers.find(m => m.socketId === currentSelfSocketId || String(m.tag) === String(userProfile?.tag));
              if (selfActiveMember) {
                  selfActiveMember.isVideoEnabled = isVideoEnabled;
              }
              renderStageGrid(currentRoomState.activeMembers, currentRoomState.seniorModSocketId, selfActiveMember);
          }
          
      } catch (e) {
          console.error('Failed to toggle camera', e);
          isVideoEnabled = false;
          showToast('Failed to access camera.');
      }
    });
  }

  // Helper to spawn flying emoji visually
  function spawnEmoji(emoji) {
    const overlay = document.getElementById('emoji-overlay');
    if (!overlay) return;
    const emojiEl = document.createElement('div');
    emojiEl.className = 'emoji-floating';
    emojiEl.textContent = emoji;
    const leftPercent = 10 + Math.random() * 80;
    emojiEl.style.left = `${leftPercent}%`;
    emojiEl.style.bottom = '100px';
    
    overlay.appendChild(emojiEl);
    
    setTimeout(() => {
      if (emojiEl.parentNode) emojiEl.parentNode.removeChild(emojiEl);
    }, 2500);
  }

  // Handle Incoming Chat Message
  function handleIncomingChatMessage(data) {
    if (!chatMessages) return;

    const isSelf = (data.socketId === currentSelfSocketId || (data.tag && String(data.tag) === String(userProfile?.tag)));
    
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isSelf ? 'self' : ''}`;
    
    const time = new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Auto linkify URLs
    const sanitizedText = escapeHTML(data.text);
    const linkifiedText = sanitizedText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--accent-purple); text-decoration: underline;">$1</a>');

    bubble.innerHTML = `
      <div class="chat-sender">${escapeHTML(data.name)} <span style="color: var(--text-muted); font-size: 0.65rem; font-weight: normal;">${time}</span></div>
      <div class="chat-text">${linkifiedText}</div>
    `;

    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Show unread badge if chat is closed and it's not our own message
    if (!isChatOpen && !isSelf && chatUnreadBadge) {
      chatUnreadBadge.style.display = 'flex';
      
      // Play a soft notification pop sound if possible (optional)
      try {
        const audio = new Audio('/sounds/pop.mp3');
        audio.volume = 0.2;
        audio.play().catch(e => {}); // Ignore if autoplay blocked
      } catch (e) {}
    }
  }

  // Emoji Buttons Click Logic
  const emojiButtons = document.querySelectorAll('.btn-emoji');
  emojiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-emoji');
      if (emoji) {
        WebRTCStub.sendEmoji(emoji); // Send to server
        spawnEmoji(emoji);           // Spawn locally INSTANTLY
        
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => {
          btn.style.transform = 'scale(1)';
        }, 150);
      }
    });
  });

  // Raise Hand Buttons
  if (btnRaiseHand) {
    btnRaiseHand.addEventListener('click', async () => {
      await WebRTCStub.toggleQueueHand();
    });
  }

  if (btnQueueRaiseHand) {
    btnQueueRaiseHand.addEventListener('click', async () => {
      await WebRTCStub.toggleQueueHand();
    });
  }

  // Quick Comment Form Submission
  if (quickCommentForm) {
    quickCommentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!inputQuickComment) return;
      const commentText = inputQuickComment.value.trim();
      if (commentText.length > 0) {
        await WebRTCStub.submitQuickComment(commentText);
        inputQuickComment.value = '';
      }
    });
  }

  // Exit Room Button Logic
  if (btnReport) {
    btnReport.addEventListener('click', async () => {
      storage.clearActiveJunction();
      await WebRTCStub.leaveRoom();
      window.location.href = 'junctions.html';
    });
  }

  // Record Stage Logic
  if (btnRecordStage) {
    btnRecordStage.addEventListener('click', () => {
      if (WebRTCStub.isRecording) {
        WebRTCStub.stopRecording();
        btnRecordStage.innerHTML = '<i class="bi bi-record-circle" aria-hidden="true"></i>';
        btnRecordStage.classList.remove('btn-recording');
        btnRecordStage.classList.add('btn-secondary');
        showToast('Recording stopped and saved to downloads.', 'info');
      } else {
        const started = WebRTCStub.startRecording();
        if (started) {
          btnRecordStage.innerHTML = '<i class="bi bi-stop-circle-fill" aria-hidden="true"></i>';
          btnRecordStage.classList.remove('btn-secondary');
          btnRecordStage.classList.add('btn-recording');
          showToast('Recording stage audio...', 'success');
        } else {
          showToast('Failed to start recording. Please try again.', 'error');
        }
      }
    });
  }
});

// ============================================================
// Junctions Sidebar - Desktop right sidebar with live room list
// ============================================================
(async function initJunctionsSidebar() {
  const sidebarList = document.getElementById('sidebar-junctions-list');
  if (!sidebarList) return;

  const currentRoomId = new URLSearchParams(window.location.search).get('id');
  const searchInput = document.getElementById('junction-search-input');

  async function renderSidebarRooms() {
    try {
      const res = await fetch('/api/rooms');
      let rooms = await res.json();
      if (!rooms || !rooms.length) {
        sidebarList.innerHTML = '<div class="sidebar-loading">No junctions available</div>';
        return;
      }
      
      // Calculate totalUsers for sorting
      rooms.forEach(room => {
        room.totalUsers = (room.activeMembersCount || room.activeCount || 0) + (room.waitingQueueCount || room.queueCount || 0);
      });
      
      // Sort logic: 
      // 1. Active junctions (users > 0) come before empty ones.
      // 2. Active junctions are sorted in INCREASING order (1, 2, 3...).
      // 3. Empty junctions are sorted alphabetically.
      rooms.sort((a, b) => {
        if (a.totalUsers > 0 && b.totalUsers > 0) {
          return a.totalUsers - b.totalUsers; // Ascending
        }
        if (a.totalUsers > 0) return -1;
        if (b.totalUsers > 0) return 1;
        return (a.topic || a.name || '').localeCompare(b.topic || b.name || '');
      });
      
      // Search filter
      if (searchInput && searchInput.value.trim() !== '') {
        const query = searchInput.value.trim().toLowerCase();
        rooms = rooms.filter(room => (room.topic || room.name || '').toLowerCase().includes(query));
      }
      
      if (rooms.length === 0) {
        sidebarList.innerHTML = '<div class="sidebar-loading">No matching junctions</div>';
        return;
      }

      sidebarList.innerHTML = rooms.map(room => {
        const isActive = room.id === currentRoomId || room.roomId === currentRoomId;
        const totalUsers = room.totalUsers;
        const hasUsers = totalUsers > 0;
        const lock = room.hasPassword ? '<i class="bi bi-lock-fill" style="font-size:0.65rem;opacity:0.6;margin-right:2px;"></i>' : '';
        const encodedId = encodeURIComponent(room.id || room.roomId || '');
        const users = room.allUsers || [];
        const userTags = users.slice(0, 3).map(u => {
          const tag = u.tag ? `Co..#${u.tag}` : (u.name || '?');
          return `<span class="sidebar-user-tag">👤 ${escapeHTML(tag)}</span>`;
        }).join('');
        const moreCount = totalUsers > 3 ? `<span class="sidebar-user-tag sidebar-user-more">+${totalUsers - 3}</span>` : '';
        return `
          <a href="room.html?id=${encodedId}" class="sidebar-junction-item${isActive ? ' active-room' : ''}">
            <div class="sidebar-junction-info">
              <div class="sidebar-junction-name">${lock}${escapeHTML(room.topic || room.name || 'Junction')}</div>
              <div class="sidebar-junction-users">${hasUsers ? (userTags + moreCount) : '<span style="color:var(--text-secondary);font-size:0.65rem;">Empty</span>'}</div>
            </div>
            <span class="sidebar-junction-count${hasUsers ? ' has-users' : ''}">${totalUsers}</span>
          </a>`;
      }).join('');
    } catch (e) {
      sidebarList.innerHTML = '<div class="sidebar-loading">Failed to load</div>';
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderSidebarRooms);
  }

  await renderSidebarRooms();
  setInterval(renderSidebarRooms, 5000);
}());
