export function renderAdmitUserModal() {
  return `
    <!-- Dedicated Admit Participant Modal for Stage Moderators --> 
    <div id="admit-user-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admit-modal-title" style="z-index: 9999999 !important;"> 
      <div class="modal-content profile-modal-content" style="max-width: 420px; text-align: center;"> 
        <button id="admit-modal-close" class="modal-close-btn" aria-label="Close modal"><i class="bi bi-x-lg" aria-hidden="true"></i></button> 
        <div style="font-size: 2.2rem; margin-bottom: 0.35rem;"><i class="bi bi-mic-fill" aria-hidden="true"></i></div> 
        <h3 id="admit-modal-title"
          style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem;">
          Admit Participant to Stage
        </h3> 
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
          As a Stage Moderator, you have authority to admit this waiting participant to the live active stage.
        </p> 
        <div
          style="background: var(--bg-card); border: 3px solid var(--border-dark); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem; text-align: left; box-shadow: var(--shadow-sm);"> 
          <div style="display: flex; align-items: center; gap: 0.85rem;"> 
            <div id="admit-modal-avatar" class="avatar avatar-md avatar-gender-skip">C</div> 
            <div> 
              <div id="admit-modal-username" style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">
                Cockroach #1007
              </div> 
              <div id="admit-modal-waittime"
                style="font-size: 0.75rem; color: var(--accent-purple); font-weight: 700; margin-top: 0.15rem;"><i class="bi bi-hourglass-split" aria-hidden="true"></i> Waiting:
                02m 15s
              </div> 
            </div> 
          </div> 
          <div id="admit-modal-comment-container"
            style="display: none; background: var(--bg-page); border: 3px solid var(--border-dark); padding: 0.55rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-primary); margin-top: 0.75rem; box-shadow: var(--shadow-none);"> 
            <span
              style="color: var(--accent-purple); font-weight: 800; font-size: 0.75rem; display: block; margin-bottom: 0.2rem;"><i class="bi bi-chat-right-text-fill" aria-hidden="true"></i>
              Quick Comment:
            </span> 
            <span id="admit-modal-comment-text">""</span> 
          </div> 
        </div> 
        <button id="btn-admit-user-confirm" class="btn btn-primary btn-pill"
          style="width: 100%; justify-content: center; font-weight: 800; font-size: 0.95rem; padding: 0.75rem 1.25rem;" onclick="window.__handleAdmitClick(this, event)">
          + Admit to Active Stage
        </button> 
      </div> 
    </div>
  `;
}
