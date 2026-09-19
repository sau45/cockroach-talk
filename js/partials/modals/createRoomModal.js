export function renderCreateRoomModal() {
  return `
    <div id="create-room-modal" class="modal-backdrop" role="dialog" aria-modal="true" style="display: none;">
      <div class="modal-content profile-modal-content" style="max-width: 450px;">
        <button id="create-room-close" class="modal-close-btn" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
        <div class="profile-modal-header" style="justify-content: center; text-align: center;">
          <h3 style="margin-bottom: 0.25rem;"><i class="bi bi-plus-circle" aria-hidden="true"></i> Create Room</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">Start your own temporary voice junction.</p>
        </div>
        <div class="profile-modal-body" style="padding-top: 1rem;">
          <form id="create-room-form" style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="input-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
              <label for="create-room-topic" style="font-size: 0.8rem; font-weight: 600;">Room Topic / Name <span style="color: var(--accent-red);">*</span></label>
              <input type="text" id="create-room-topic" class="input-text" placeholder="e.g. Discussing the Match" required maxlength="50" style="padding: 0.75rem;">
            </div>
            <div class="input-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
              <label for="create-room-password" style="font-size: 0.8rem; font-weight: 600;">Password <span style="color: var(--accent-red);">*</span></label>
              <input type="password" id="create-room-password" class="input-text" placeholder="Set a password for the room" required maxlength="20" style="padding: 0.75rem;">
            </div>
            <button type="submit" id="btn-submit-create-room" class="btn btn-gold btn-pill" style="margin-top: 0.5rem; justify-content: center; padding: 0.75rem;">
              Create & Join <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}
