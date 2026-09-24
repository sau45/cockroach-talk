export function renderQuickCommentModal() {
  return `
    <!-- Quick Comment Popup Modal --> 
    <div id="quick-comment-modal" class="modal-backdrop" role="dialog" aria-modal="true"
      aria-labelledby="comment-modal-title"> 
      <div class="modal-content comment-modal-content"> 
        <button id="comment-modal-close" class="modal-close-btn" aria-label="Close modal"><i class="bi bi-x-lg" aria-hidden="true"></i></button> 
        <div class="comment-modal-header"> 
          <span class="comment-modal-icon"><i class="bi bi-chat-right-text-fill" aria-hidden="true"></i></span> 
          <h4 id="comment-modal-title" class="comment-modal-title">Quick Comment</h4> 
        </div> 
        <div class="comment-modal-body"> 
          <p class="comment-modal-desc">
            Convey a short note (max 30 characters) to stage moderators while waiting in queue.
          </p> 
          <div id="comment-modal-status-area" class="comment-modal-status-area"> 
            <!-- Dynamic Form / Lock Timer / Submitted Comment --> 
          </div> 
        </div> 
        <div class="comment-modal-footer"> 
          <button id="btn-close-comment-modal" class="btn btn-secondary btn-pill btn-sm"
            style="width: 100%; justify-content: center; font-size: 0.78rem;">
            Done
          </button> 
        </div> 
      </div> 
    </div>
  `;
}
