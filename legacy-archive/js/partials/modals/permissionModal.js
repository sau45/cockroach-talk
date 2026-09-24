export function renderPermissionModal() {
  return `
    <!-- Persistent Join Room Modal --> 
    <div id="permission-modal" class="modal-backdrop active" style="z-index: 9999999 !important;"> 
      <div class="modal-content" style="text-align: center; max-width: 380px;"> 
        <span style="font-size: 2.25rem; display: block; margin-bottom: 0.5rem;"><i class="bi bi-headphones" aria-hidden="true"></i></span> 
        <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">Join Live Room</h3> 
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          Click below to join the live room and connect your audio.
        </p> 
        <button id="btn-grant-permission" class="btn btn-gold btn-pill" style="width: 100%; justify-content: center;" onclick="document.getElementById('permission-modal').classList.remove('active'); if(window._forceMicInit) window._forceMicInit();">
          Click to Join Audio <i class="bi bi-stars" aria-hidden="true"></i> 
        </button> 
      </div> 
    </div>
  `;
}
