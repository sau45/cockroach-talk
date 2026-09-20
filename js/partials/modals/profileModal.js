export function renderProfileModal() {
  return `
    <!-- Speaker Profile & Moderation Action Modal --> 
    <div id="profile-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-modal-name"> 
      <div class="modal-content profile-modal-content"> 
        <button id="profile-modal-close" class="modal-close-btn" aria-label="Close modal"><i class="bi bi-x-lg" aria-hidden="true"></i></button> 
        <div class="profile-modal-header"> 
          <div id="profile-modal-avatar-container" class="profile-modal-avatar-wrap"></div> 
          <div class="profile-modal-identity"> 
            <h3 id="profile-modal-name" class="profile-modal-name">Speaker Handle</h3> 
            <div id="profile-modal-status-pill" class="profile-modal-status-pill"></div> 
          </div> 
        </div> 
        <div class="profile-modal-body"> 
          <!-- Bio Info Box -->
          <div id="profile-modal-bio-card" class="profile-info-card" style="display: none; margin-bottom: 1rem;">
            <div class="profile-info-header">
              <i class="bi bi-person-lines-fill" style="color: var(--accent-gold); font-size: 1.1rem;"></i>
              <span class="info-title">Bio</span>
            </div>
            <p id="profile-modal-bio-text" class="profile-info-desc" style="font-style: italic; color: var(--text-main);"></p>
          </div>

          <!-- Moderation Info Box --> 
          <div class="profile-info-card"> 
            <div class="profile-info-header"> 
              <svg class="cockroach-header-icon" viewBox="0 0 24 24" width="16" height="16" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M12 2v3M8 3.5l1.5 2.5M16 3.5l-1.5 2.5" /> <ellipse cx="12" cy="13" rx="4.5" ry="6.5" fill="var(--accent-purple)" opacity="0.3" /> <path d="M7.5 10H3M16.5 10H21M7 13.5H2.5M17 13.5H21.5M7.5 17L4.5 19.5M16.5 17l3 2.5" /> <line x1="12" y1="6.5" x2="12" y2="19.5" /> </svg> 
              <span class="info-title">Stage Moderation & Removals</span> 
            </div> 
            <p class="profile-info-desc">
              Active stage debaters are <strong>Stage Moderators</strong> with authority to admit waiting users when a
              stage slot opens and remove stage members.
            </p> 
          </div> 
          <!-- Quota & Action Details --> 
          <div id="profile-modal-action-box" class="profile-action-box"></div> 
        </div> 
        <div class="profile-modal-footer" style="display: flex; gap: 0.5rem; width: 100%;">
          <button id="btn-report-user-modal" class="btn btn-outline" style="flex: 1; justify-content: center; color: var(--accent-danger); border-color: var(--accent-danger);">
            <i class="bi bi-flag-fill" aria-hidden="true"></i> Report
          </button>
          <button id="btn-close-profile-modal" class="btn btn-secondary btn-pill" style="flex: 2; justify-content: center;">
            Done
          </button> 
        </div> 
      </div> 
    </div>
  `;
}
