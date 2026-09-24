export function renderEditProfileModal() {
  return `
    <div id="edit-profile-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" style="display: none;">
      <div class="modal-content" style="max-width: 480px;">
        <button id="edit-profile-close" class="modal-close-btn" aria-label="Close modal"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
        <div style="text-align: center; margin-bottom: 1rem; padding-top: 1rem;">
          <h2 id="edit-profile-title" style="font-size: 1.5rem; margin-bottom: 0.2rem;">Edit Your Profile</h2>
          <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3;">Update your public profile picture and short bio.</p>
        </div>
        <form id="edit-profile-form" style="display: flex; flex-direction: column; gap: 1rem;" onsubmit="return false;">
          
          <!-- Reserved Unique ID Display Box -->
          <div style="background-color: var(--bg-elevated); border: 1px dashed var(--accent-gold); border-radius: var(--radius-md); padding: 0.85rem 1rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
            <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; display: block;">Display Handle</span>
            <span id="edit-profile-name-badge" style="font-size: 1.2rem; font-weight: 800; color: var(--accent-gold);">
              Loading...
            </span>
          </div>
          
          <!-- Profile Picture Upload -->
          <div class="input-group" style="gap: 0.35rem; text-align: center;">
            <label class="input-label" style="font-size: 0.7rem; display: block; margin-bottom: 0.5rem;">Profile Picture (Optional)</label>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
              <div id="edit-avatar-preview-container" class="avatar-preview-container">
                <i class="bi bi-person-bounding-box" id="edit-avatar-placeholder-icon"></i>
                <img id="edit-avatar-preview-img" src="" alt="Avatar Preview" style="display: none;" />
              </div>
              <label for="edit-profile-picture-upload" class="btn btn-secondary btn-pill" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; cursor: pointer;">
                <i class="bi bi-upload"></i> Upload Image
              </label>
              <input type="file" id="edit-profile-picture-upload" accept="image/*" style="display: none;">
            </div>
          </div>
          
          <!-- Short Bio Input -->
          <div class="input-group" style="gap: 0.35rem;">
            <label for="edit-profile-bio" class="input-label" style="font-size: 0.7rem;">Short Bio (Optional)</label>
            <textarea id="edit-profile-bio" class="chat-form input" style="width: 100%; border: 2px solid var(--border-dark); border-radius: var(--radius-sm); background: var(--bg-page); color: var(--text-main); font-size: 0.85rem; padding: 0.5rem 0.75rem; resize: none; font-family: inherit;" rows="3" placeholder="Tell others a bit about yourself..." maxlength="150"></textarea>
          </div>
          
          <!-- Compact Gender / Avatar Selector -->
          <div class="input-group" style="gap: 0.35rem;">
            <label class="input-label" style="font-size: 0.7rem;">Avatar Style (Fallback)</label>
            <div class="gender-selector edit-gender-selector" style="gap: 0.5rem;">
              <div class="gender-option" data-gender="male" role="radio" aria-checked="false" tabindex="0" style="padding: 0.6rem 0.35rem;">
                <span style="color: var(--male); font-size: 1.1rem;"><i class="bi bi-gender-male" aria-hidden="true"></i></span>
                <span style="font-size: 0.75rem;">Male</span>
              </div>
              <div class="gender-option" data-gender="female" role="radio" aria-checked="false" tabindex="0" style="padding: 0.6rem 0.35rem;">
                <span style="color: var(--female); font-size: 1.1rem;"><i class="bi bi-gender-female" aria-hidden="true"></i></span>
                <span style="font-size: 0.75rem;">Female</span>
              </div>
              <div class="gender-option selected" data-gender="skip" role="radio" aria-checked="true" tabindex="0" style="padding: 0.6rem 0.35rem;">
                <span style="color: var(--accent-purple); font-size: 1.1rem;"><i class="bi bi-stars" aria-hidden="true"></i></span>
                <span style="font-size: 0.75rem;">Skip</span>
              </div>
            </div>
          </div>
          
          <!-- Submit Button -->
          <button type="submit" id="btn-save-edit-profile" class="btn btn-primary btn-pill" style="margin-top: 0.5rem; width: 100%; padding: 0.75rem 1.25rem; font-size: 0.85rem;">
            Save Profile <i class="bi bi-check-lg" aria-hidden="true"></i>
          </button>
        </form>
      </div>
    </div>
  `;
}
