import { WebRTCStub } from '../webrtcStub.js';
import { storage } from '../utils/storage.js';
import { escapeHTML } from '../utils/dom.js';

let commentsData = [];
let currentSort = 'best';
let roomId = new URLSearchParams(window.location.search).get('id') || 'unknown';

export function initThreadedComments(socket) {
  const container = document.querySelector('.threaded-comments-container');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const sortSelect = document.getElementById('comment-sort-select');
  const replyingToBanner = document.getElementById('replying-to-banner');
  const replyingToName = document.getElementById('replying-to-name');
  const cancelReplyBtn = document.getElementById('cancel-reply-btn');
  const emojiBtns = document.querySelectorAll('.btn-inline-emoji');
  
  if (!container || !chatForm) return;

  const userProfile = storage.getUserProfile();

  // Load comments
  fetchComments();

  // Typing Indicator Setup
  const typingIndicator = document.createElement('div');
  typingIndicator.id = 'typing-indicator';
  typingIndicator.style.cssText = 'font-size: 0.75rem; color: var(--accent-gold); font-style: italic; min-height: 1.2em; margin-bottom: 0.2rem; display: none;';
  chatForm.insertBefore(typingIndicator, chatForm.querySelector('.comment-input-wrapper'));

  const typingUsers = new Map();
  let typingTimeout = null;

  function updateTypingIndicator() {
    const names = Array.from(typingUsers.values());
    if (names.length === 0) {
      typingIndicator.style.display = 'none';
      typingIndicator.textContent = '';
      return;
    }
    typingIndicator.style.display = 'block';
    if (names.length === 1) {
      typingIndicator.textContent = `${names[0]} is typing...`;
    } else if (names.length === 2) {
      typingIndicator.textContent = `${names[0]} and ${names[1]} are typing...`;
    } else {
      typingIndicator.textContent = `${names[0]}, ${names[1]}, and ${names.length - 2} other(s) are typing...`;
    }
  }

  chatInput.addEventListener('input', () => {
    socket.emit('thread:typing', true);
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('thread:typing', false);
    }, 2000);
  });

  // Socket Listeners
  socket.on('thread:new', (comment) => {
    commentsData.push(comment);
    renderComments();

    // Auto scroll to new comment
    setTimeout(() => {
      const newEl = document.getElementById(`comment-${comment._id}`);
      if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);

    const chatSidebar = document.getElementById('chat-sidebar');
    const chatUnreadBadge = document.getElementById('chat-unread-badge');
    const isSelf = comment.authorTag === userProfile.tag;
    
    if (chatSidebar && !chatSidebar.classList.contains('open') && !isSelf && chatUnreadBadge) {
      chatUnreadBadge.style.display = 'flex';
      try {
        const audio = new Audio('/sounds/pop.mp3');
        audio.volume = 0.2;
        audio.play().catch(e => {}); 
      } catch (e) {}
    }
  });

  socket.on('thread:typing', ({ tag, name, isTyping }) => {
    if (tag === userProfile.tag) return; // ignore own typing
    if (isTyping) {
      typingUsers.set(tag, name);
    } else {
      typingUsers.delete(tag);
    }
    updateTypingIndicator();
  });

  socket.on('thread:reply-notify', ({ parentId, parentPreview, replyId, replyAuthor }) => {
    showToast(`<strong>${escapeHTML(replyAuthor)}</strong> replied to: <em>"${escapeHTML(parentPreview)}"</em>`, 'info');
    
    // Highlight parent comment briefly
    const parentEl = document.getElementById(`comment-${parentId}`);
    if (parentEl) {
      const originalBg = parentEl.style.backgroundColor;
      parentEl.style.transition = 'background-color 0.5s ease';
      parentEl.style.backgroundColor = 'var(--accent-purple)';
      setTimeout(() => {
        parentEl.style.backgroundColor = originalBg;
      }, 2000);
    }
  });

  socket.on('thread:updated', (comment) => {
    const idx = commentsData.findIndex(c => c._id === comment._id);
    if (idx !== -1) commentsData[idx] = comment;
    renderComments();
  });

  socket.on('thread:deleted', ({ id }) => {
    commentsData = commentsData.filter(c => c._id !== id);
    renderComments();
  });

  socket.on('thread:vote', ({ id, score, upvotes, downvotes }) => {
    const idx = commentsData.findIndex(c => c._id === id);
    if (idx !== -1) {
      commentsData[idx].score = score;
      commentsData[idx].upvotes = upvotes;
      commentsData[idx].downvotes = downvotes;
      
      // Update DOM without full re-render
      const scoreEl = document.getElementById(`score-${id}`);
      if (scoreEl) scoreEl.textContent = score;
    }
  });

  // Sort change
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderComments();
    });
  }

  // Cancel reply
  cancelReplyBtn.addEventListener('click', () => {
    chatForm.setAttribute('data-parent-id', '');
    replyingToBanner.style.display = 'none';
    chatInput.focus();
  });

  // Emoji picker
  emojiBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cursor = chatInput.selectionStart;
      const text = chatInput.value;
      chatInput.value = text.slice(0, cursor) + btn.textContent + text.slice(cursor);
      chatInput.focus();
    });
  });

  // Submit comment
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = chatInput.value.trim();
    if (!body) return;

    const parentId = chatForm.getAttribute('data-parent-id') || null;
    
    chatForm.querySelector('button[type="submit"]').disabled = true;

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          authorTag: userProfile.tag,
          authorName: userProfile.displayName,
          body,
          parentId
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || data.errors?.[0]?.msg || 'Error posting');
      
      chatInput.value = '';
      socket.emit('thread:typing', false);
      if (typingTimeout) clearTimeout(typingTimeout);
      cancelReplyBtn.click();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      chatForm.querySelector('button[type="submit"]').disabled = false;
    }
  });

  // Event Delegation for comments
  container.addEventListener('click', async (e) => {
    // Handle quote click for scroll-to-parent
    const quoteTarget = e.target.closest('.comment-quote');
    if (quoteTarget) {
      const parentId = quoteTarget.getAttribute('data-target');
      if (parentId) {
        const parentEl = document.getElementById(`comment-${parentId}`);
        if (parentEl) {
          parentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const originalBg = parentEl.style.backgroundColor;
          parentEl.style.transition = 'background-color 0.5s ease';
          parentEl.style.backgroundColor = 'var(--accent-purple)';
          setTimeout(() => {
            parentEl.style.backgroundColor = originalBg;
          }, 2000);
        }
      }
      return;
    }

    const target = e.target.closest('button');
    if (!target) return;

    const action = target.getAttribute('data-action');
    const id = target.getAttribute('data-id');
    
    if (action === 'reply') {
      const name = target.getAttribute('data-name');
      chatForm.setAttribute('data-parent-id', id);
      replyingToName.textContent = name;
      replyingToBanner.style.display = 'block';
      chatInput.focus();
    }
    
    if (action === 'upvote' || action === 'downvote') {
      const value = action === 'upvote' ? 1 : -1;
      
      // Optimistic UI logic could go here, but for safety we await response
      try {
        const res = await fetch(`/api/comments/${id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userTag: userProfile.tag, value })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
    
    if (action === 'delete') {
      if (target.dataset.confirming !== 'true') {
        target.dataset.confirming = 'true';
        const originalHTML = target.innerHTML;
        target.innerHTML = '<i class="bi bi-exclamation-circle-fill" style="color: #ff4444;"></i> Sure?';
        target.style.color = '#ff4444';
        
        setTimeout(() => {
          if (target && target.dataset.confirming === 'true') {
            target.dataset.confirming = 'false';
            target.innerHTML = originalHTML;
            target.style.color = 'var(--text-muted)';
          }
        }, 3000);
        return;
      }

      try {
        const res = await fetch(`/api/comments/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorTag: userProfile.tag })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });

  async function fetchComments() {
    try {
      const res = await fetch(`/api/comments?roomId=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      if (data.success) {
        commentsData = data.comments;
        renderComments();
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  }

  function renderComments() {
    container.innerHTML = '';
    
    // Sort flat array
    let sorted = [...commentsData];
    if (currentSort === 'best') sorted.sort((a, b) => b.score - a.score);
    if (currentSort === 'new') sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (currentSort === 'old') sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (currentSort === 'controversial') sorted.sort((a, b) => (b.upvotes + b.downvotes) - (a.upvotes + a.downvotes));

    // Render flat list
    if (sorted.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chat-welcome';
      empty.textContent = 'No comments yet. Be the first!';
      container.appendChild(empty);
      return;
    }

    sorted.forEach(c => {
      container.appendChild(createCommentElement(c));
    });
  }

  function createCommentElement(comment) {
    const el = document.createElement('div');
    el.className = 'threaded-comment';
    el.id = `comment-${comment._id}`;
    // No indentation for flat layout

    const time = new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let quoteHTML = '';
    if (comment.parentId) {
      const parent = commentsData.find(c => c._id === comment.parentId);
      if (parent) {
        const parentIsMine = parent.authorTag === userProfile.tag;
        let previewText;
        if (parent.isDeleted) {
          previewText = parentIsMine ? '🚫 You deleted this message' : '🚫 This message was deleted';
        } else {
          previewText = parent.body.length > 80 ? parent.body.substring(0, 80) + '...' : parent.body;
        }
        
        quoteHTML = `
          <div class="comment-quote" data-target="${parent._id}" style="background: var(--bg-main); border-left: 3px solid var(--accent-purple); padding: 0.4rem; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem; cursor: pointer; border-radius: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; overflow-wrap: break-word; word-break: break-all;">
            <strong style="color:var(--text-main);">${escapeHTML(parent.authorName)}</strong><br>
            <span style="${parent.isDeleted ? 'font-style: italic;' : ''}">${escapeHTML(previewText)}</span>
          </div>
        `;
      } else {
        quoteHTML = `
          <div class="comment-quote" style="background: var(--bg-main); border-left: 3px solid var(--border-color); padding: 0.4rem; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem; border-radius: 4px; font-style: italic; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; overflow-wrap: break-word; word-break: break-all;">
            🚫 This message was deleted
          </div>
        `;
      }
    }

    if (comment.isDeleted) {
      const isMine = comment.authorTag === userProfile.tag;
      const deleteMsg = isMine ? '🚫 You deleted this message' : '🚫 This message was deleted';
      const authorHeader = isMine ? '' : `<strong style="color:var(--text-muted); font-style: italic;">${escapeHTML(comment.authorName)}</strong>`;
      
      el.innerHTML = `
        <div class="comment-header" style="display:flex; justify-content:space-between; align-items:center; font-size: 0.75rem;">
          <div>
            ${authorHeader}
            <span style="color:var(--text-muted);">· ${time}</span>
          </div>
        </div>
        ${quoteHTML}
        <div class="comment-body" style="font-size: 0.85rem; margin: 0.3rem 0; color: var(--text-muted); font-style: italic;">${deleteMsg}</div>
      `;
    } else {
      el.innerHTML = `
        <div class="comment-header" style="display:flex; justify-content:space-between; align-items:center; font-size: 0.75rem; gap: 0.5rem;">
          <div style="min-width: 0; display: flex; align-items: center; gap: 0.3rem; flex: 1;">
            <strong style="color:var(--accent-gold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;">${escapeHTML(comment.authorName)}</strong>
            <span style="color:var(--text-muted); white-space: nowrap; flex-shrink: 0;">· ${time}</span>
          </div>
          ${comment.authorTag === userProfile.tag ? `<button class="btn-icon" data-action="delete" data-id="${comment._id}" style="font-size:0.7rem; color:var(--text-muted); flex-shrink: 0;"><i class="bi bi-trash"></i></button>` : ''}
        </div>
        ${quoteHTML}
        <div class="comment-body" style="font-size: 0.85rem; margin: 0.3rem 0; color: white; word-break: break-all; overflow-wrap: break-word; white-space: pre-wrap; min-width: 0;"></div>
        <div class="comment-actions" style="display:flex; gap:0.8rem; align-items:center; font-size:0.75rem; color:var(--text-muted); flex-wrap: wrap;">
          <div style="display:flex; align-items:center; gap:0.2rem;">
            <button data-action="upvote" data-id="${comment._id}" style="background:none; border:none; color:inherit; cursor:pointer;"><i class="bi bi-arrow-up-circle"></i></button>
            <span id="score-${comment._id}" style="font-weight:bold; min-width:1rem; text-align:center;">${comment.score}</span>
            <button data-action="downvote" data-id="${comment._id}" style="background:none; border:none; color:inherit; cursor:pointer;"><i class="bi bi-arrow-down-circle"></i></button>
          </div>
          <button data-action="reply" data-id="${comment._id}" data-name="${escapeHTML(comment.authorName)}" style="background:none; border:none; color:inherit; cursor:pointer;"><i class="bi bi-reply"></i> Reply</button>
        </div>
      `;

      // Safe assignment to prevent XSS
      el.querySelector('.comment-body').textContent = comment.body;
    }



    return el;
  }
}

function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    console.error("Toast: " + message);
    return;
  }
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  const icon = type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-shield-fill-check';
  toast.innerHTML = "<span><i class='bi " + icon + "' aria-hidden='true'></i></span> <span>" + message + "</span>";
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

