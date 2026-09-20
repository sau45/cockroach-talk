import { WebRTCStub } from '../webrtcStub.js';
import { storage } from '../utils/storage.js';

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

  // Chat Toggle Logic
  const btnToggleChat = document.getElementById('btn-toggle-chat');
  const btnCloseChat = document.getElementById('btn-close-chat');
  const chatSidebar = document.getElementById('chat-sidebar');
  let isChatOpen = false;

  if (btnToggleChat) {
    btnToggleChat.addEventListener('click', () => {
      isChatOpen = true;
      if (chatSidebar) chatSidebar.classList.add('open');
      if (chatInput) chatInput.focus();
    });
  }

  if (btnCloseChat) {
    btnCloseChat.addEventListener('click', () => {
      isChatOpen = false;
      if (chatSidebar) chatSidebar.classList.remove('open');
    });
  }

  // Socket Listeners
  socket.on('thread:new', (comment) => {
    commentsData.push(comment);
    renderComments();
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
      cancelReplyBtn.click();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      chatForm.querySelector('button[type="submit"]').disabled = false;
    }
  });

  // Event Delegation for comments
  container.addEventListener('click', async (e) => {
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
      if (!confirm('Delete this comment?')) return;
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

    // Build tree
    const map = new Map();
    const roots = [];

    sorted.forEach(c => {
      c.children = [];
      map.set(c._id, c);
    });

    sorted.forEach(c => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId).children.push(c);
      } else {
        roots.push(c);
      }
    });

    // Render tree recursively
    if (roots.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chat-welcome';
      empty.textContent = 'No comments yet. Be the first!';
      container.appendChild(empty);
      return;
    }

    roots.forEach(root => {
      container.appendChild(createCommentElement(root));
    });
  }

  function createCommentElement(comment) {
    const el = document.createElement('div');
    el.className = 'threaded-comment';
    el.style.marginLeft = `${comment.depth * 15}px`;
    if (comment.depth > 0) {
      el.style.borderLeft = '2px solid var(--border-color)';
      el.style.paddingLeft = '10px';
    }

    const time = new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    el.innerHTML = `
      <div class="comment-header" style="display:flex; justify-content:space-between; align-items:center; font-size: 0.75rem;">
        <div>
          <strong style="color:var(--accent-gold);">${comment.authorName}</strong>
          <span style="color:var(--text-muted);">· ${time}</span>
        </div>
        ${comment.authorTag === userProfile.tag ? `<button class="btn-icon" data-action="delete" data-id="${comment._id}" style="font-size:0.7rem; color:var(--text-muted);"><i class="bi bi-trash"></i></button>` : ''}
      </div>
      <div class="comment-body" style="font-size: 0.85rem; margin: 0.3rem 0; color: white; word-break: break-word;"></div>
      <div class="comment-actions" style="display:flex; gap:0.8rem; align-items:center; font-size:0.75rem; color:var(--text-muted);">
        <div style="display:flex; align-items:center; gap:0.2rem;">
          <button data-action="upvote" data-id="${comment._id}" style="background:none; border:none; color:inherit; cursor:pointer;"><i class="bi bi-arrow-up-circle"></i></button>
          <span id="score-${comment._id}" style="font-weight:bold; min-width:1rem; text-align:center;">${comment.score}</span>
          <button data-action="downvote" data-id="${comment._id}" style="background:none; border:none; color:inherit; cursor:pointer;"><i class="bi bi-arrow-down-circle"></i></button>
        </div>
        <button data-action="reply" data-id="${comment._id}" data-name="${comment.authorName}" style="background:none; border:none; color:inherit; cursor:pointer;"><i class="bi bi-reply"></i> Reply</button>
      </div>
    `;

    // Safe assignment to prevent XSS
    el.querySelector('.comment-body').textContent = comment.body;

    // Render children
    if (comment.children && comment.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'comment-children';
      childrenContainer.style.marginTop = '0.5rem';
      
      comment.children.forEach(child => {
        childrenContainer.appendChild(createCommentElement(child));
      });
      el.appendChild(childrenContainer);
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

