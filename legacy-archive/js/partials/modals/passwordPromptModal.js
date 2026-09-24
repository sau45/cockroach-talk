export function renderPasswordPromptModal() {
  return `
    <div id="password-prompt-modal" class="modal-backdrop" role="dialog" aria-modal="true" style="display: none;">
      <div class="modal-content profile-modal-content" style="max-width: 400px;">
        <button id="password-prompt-close" class="modal-close-btn" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
        <div class="profile-modal-header" style="justify-content: center; text-align: center;">
          <h3 style="margin-bottom: 0.25rem;"><i class="bi bi-lock-fill" aria-hidden="true" style="color: var(--accent-gold);"></i> Protected Room</h3>
          <p id="password-prompt-topic" style="font-size: 0.8rem; color: var(--text-secondary);">Enter the password to join this room.</p>
        </div>
        <div class="profile-modal-body" style="padding-top: 1rem;">
          <form id="password-prompt-form" style="display: flex; flex-direction: column; gap: 1rem;">
            <input type="hidden" id="password-prompt-room-id">
            <div class="input-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
              <input type="password" id="password-prompt-input" class="input-text" placeholder="Password" required style="padding: 0.75rem;">
            </div>
            <button type="submit" id="btn-submit-password" class="btn btn-gold btn-pill" style="margin-top: 0.5rem; justify-content: center; padding: 0.75rem;">
              Join Room <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}
