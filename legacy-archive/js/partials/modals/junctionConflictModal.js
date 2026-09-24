export function renderJunctionConflictModal() {
  return `
    <!-- Junction Conflict Modal — shown when user tries to join a different junction while already in one -->
    <div id="junction-conflict-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="jcm-title">
      <div class="modal-content profile-modal-content" style="max-width: 400px; text-align: center;">
        <button id="jcm-close" class="modal-close-btn" aria-label="Close"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
        <div style="font-size: 2.25rem; margin-bottom: 0.5rem;"><i class="bi bi-bug-fill" aria-hidden="true"></i></div>
        <h3 id="jcm-title" style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem;">
          Already in a Junction
        </h3>
        <p id="jcm-body" style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
          You are currently in another junction. Leave it before joining a new one?
        </p>
        <div style="display: flex; gap: 0.75rem;">
          <button id="jcm-cancel" class="btn btn-secondary btn-pill" style="flex: 1; justify-content: center; font-size: 0.85rem;">
            Stay Here
          </button>
          <button id="jcm-confirm" class="btn btn-gold btn-pill" style="flex: 1; justify-content: center; font-size: 0.85rem; font-weight: 800;">
            Leave &amp; Join
          </button>
        </div>
      </div>
    </div>
  `;
}
