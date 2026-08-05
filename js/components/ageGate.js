/**
 * CockroachTalk - 18+ Age Consent Verification Modal Component
 * File Responsibility: Renders a mandatory 18+ age verification modal at all entry points if consent has not yet been captured.
 */

import { storage } from '../utils/storage.js';

export function initAgeGate() {
  // If user has already confirmed 18+ consent, skip modal creation entirely
  if (storage.getAgeConsent()) {
    return;
  }

  // Prevent duplicate modal injection if already present
  if (document.getElementById('age-gate-modal')) {
    return;
  }

  const modalHtml = `
    <div id="age-gate-modal" class="age-gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div class="age-gate-card">
        <div class="age-gate-badge">18+</div>
        <h2 id="age-gate-title" class="age-gate-title">Before you continue</h2>
        <p class="age-gate-subtitle">Adults only. Please confirm once to continue.</p>

        <div class="age-gate-checkbox-box">
          <input type="checkbox" id="age-gate-checkbox" class="age-gate-checkbox">
          <label for="age-gate-checkbox" class="age-gate-label">
            I am 18+, I will not share personal information, I am responsible for how I use any information shared here, and I agree to the <a href="terms.html" target="_blank" class="age-gate-link">Terms</a> and <a href="privacy.html" target="_blank" class="age-gate-link">Privacy Policy</a>.
          </label>
        </div>

        <button id="age-gate-btn-continue" class="age-gate-btn-continue" disabled>
          Continue
        </button>

        <button id="age-gate-btn-leave" class="age-gate-btn-leave">
          Leave
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modalEl = document.getElementById('age-gate-modal');
  const checkboxEl = document.getElementById('age-gate-checkbox');
  const continueBtn = document.getElementById('age-gate-btn-continue');
  const leaveBtn = document.getElementById('age-gate-btn-leave');

  // Prevent background scroll while modal is active
  document.body.style.overflow = 'hidden';

  // Toggle Continue button enabled/disabled state based on checkbox consent
  checkboxEl.addEventListener('change', () => {
    if (checkboxEl.checked) {
      continueBtn.removeAttribute('disabled');
      continueBtn.classList.add('active');
    } else {
      continueBtn.setAttribute('disabled', 'true');
      continueBtn.classList.remove('active');
    }
  });

  // Handle Continue click
  continueBtn.addEventListener('click', () => {
    if (checkboxEl.checked) {
      storage.saveAgeConsent(true);
      document.body.style.overflow = '';
      if (modalEl) {
        modalEl.remove();
      }
    }
  });

  // Handle Leave click
  leaveBtn.addEventListener('click', () => {
    window.location.href = 'https://www.google.com';
  });
}
