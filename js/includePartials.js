/**
 * CockroachTalk - Partials Loader & Global Theme Manager & Activity Heartbeat
 * File Responsibility: Injects shared header and footer partials at runtime, handles theme switching, and sends heartbeat ping to reset 7-day deletion timer.
 */

import { renderHeader } from './partials/header.js';
import { renderFooter } from './partials/footer.js';
import { storage } from './utils/storage.js';
import { ICONS } from './utils/icons.js';
import { initAgeGate } from './components/ageGate.js';
import { initProfileEditor } from './components/profileEditor.js';
// Modals will now be lazy-loaded by their respective controllers when needed.

window.showBannedModal = function(message) {
  if (document.getElementById('banned-overlay')) return;
  const bannedOverlay = document.createElement('div');
  bannedOverlay.id = 'banned-overlay';
  bannedOverlay.style.position = 'fixed';
  bannedOverlay.style.top = '0';
  bannedOverlay.style.left = '0';
  bannedOverlay.style.width = '100vw';
  bannedOverlay.style.height = '100vh';
  bannedOverlay.style.backgroundColor = 'rgba(0,0,0,0.95)';
  bannedOverlay.style.zIndex = '999999999';
  bannedOverlay.style.display = 'flex';
  bannedOverlay.style.flexDirection = 'column';
  bannedOverlay.style.alignItems = 'center';
  bannedOverlay.style.justifyContent = 'center';
  bannedOverlay.style.color = 'white';
  bannedOverlay.style.fontFamily = 'var(--font-heading), sans-serif';

  bannedOverlay.innerHTML = `
    <div style="background: var(--bg-card); border: 2px solid var(--accent-danger); padding: 2rem; border-radius: 12px; text-align: center; max-width: 400px; box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);">
      <i class="bi bi-exclamation-octagon-fill" style="font-size: 3rem; color: var(--accent-danger); margin-bottom: 1rem; display: block;"></i>
      <h2 style="color: var(--accent-danger); margin-bottom: 1rem;">Access Denied</h2>
      <p style="margin-bottom: 1.5rem; color: var(--text-secondary); font-size: 1.1rem;">${message || 'You have been banned from CockroachTalk.'}</p>
      <button id="btn-banned-leave" style="background: var(--accent-danger); color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer; width: 100%;">Return to Home</button>
    </div>
  `;
  document.body.appendChild(bannedOverlay);

  // If they are on the junctions page, they are already on the home page, but we can hide the button or refresh
  const btn = document.getElementById('btn-banned-leave');
  if (window.location.pathname.includes('junctions.html')) {
    btn.textContent = 'Reload Page';
    btn.addEventListener('click', () => location.reload());
  } else {
    btn.addEventListener('click', () => window.location.href = 'junctions.html');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize edit profile logic
  initProfileEditor();

  // Initialize mandatory 18+ age verification consent modal across all entry points
  initAgeGate();

  // Apply saved theme on initial boot
  let savedTheme = storage.getTheme();
  if (!savedTheme) {
    savedTheme = 'dark'; // Force dark mode as default
  }
  
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  const currentPath = window.location.pathname;

  // Inject Header
  const headerContainer = document.getElementById('site-header');
  if (headerContainer) {
    headerContainer.innerHTML = renderHeader(currentPath);
  }

  // Inject Footer
  const footerContainer = document.getElementById('site-footer');
  if (footerContainer) {
    footerContainer.innerHTML = renderFooter();
  }

  // Ensure unique profile tag is populated and sync header badge
  storage.ensureUserProfile().then((profile) => {
    if (profile && profile.tag) {
      try {
        fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: profile.tag })
        }).then(res => res.json()).then(data => {
          if (data.isBanned) {
            window.isUserBanned = true;
            if (window.location.pathname.includes('room.html')) {
              window.showBannedModal();
            }
          }
        }).catch(() => {});
      } catch (e) {}
    }
  });

  // Bind Theme Toggle Event Listener (Desktop & Mobile)
  const themeToggleBtn = document.getElementById('theme-toggle');
  const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle');

  const updateThemeUI = (isLight) => {
    if (isLight) {
      document.documentElement.setAttribute('data-theme', 'light');
      storage.setTheme('light');
      if (themeToggleBtn) themeToggleBtn.innerHTML = ICONS.sun;
      if (mobileThemeToggleBtn) mobileThemeToggleBtn.innerHTML = '<span><i class="bi bi-sun-fill" aria-hidden="true"></i></span> Light Mode';
    } else {
      document.documentElement.removeAttribute('data-theme');
      storage.setTheme('dark');
      if (themeToggleBtn) themeToggleBtn.innerHTML = ICONS.moon;
      if (mobileThemeToggleBtn) mobileThemeToggleBtn.innerHTML = '<span><i class="bi bi-moon-stars-fill" aria-hidden="true"></i></span> Dark Mode';
    }
  };

  // Set initial icon state
  updateThemeUI(savedTheme === 'light');

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    updateThemeUI(currentTheme !== 'light');
  };

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  if (mobileThemeToggleBtn) {
    mobileThemeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Mobile Hamburger Menu Toggle Listener
  const menuToggleBtn = document.getElementById('mobile-menu-toggle');
  const menuPanel = document.getElementById('mobile-menu-panel');

  if (menuToggleBtn && menuPanel) {
    const iconHamburger = menuToggleBtn.querySelector('.icon-hamburger');
    const iconClose = menuToggleBtn.querySelector('.icon-close');

    const toggleMenu = (show) => {
      const isOpen = show !== undefined ? show : !menuPanel.classList.contains('open');
      if (isOpen) {
        menuPanel.classList.add('open');
        menuToggleBtn.setAttribute('aria-expanded', 'true');
        if (iconHamburger) iconHamburger.style.display = 'none';
        if (iconClose) iconClose.style.display = 'block';
      } else {
        // Delay closing slightly to prevent mobile browsers from swallowing synthetic link clicks when pointer-events: none applies instantly
        setTimeout(() => {
          menuPanel.classList.remove('open');
          menuToggleBtn.setAttribute('aria-expanded', 'false');
          if (iconHamburger) iconHamburger.style.display = 'block';
          if (iconClose) iconClose.style.display = 'none';
        }, 150);
      }
    };

    menuToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Close menu when clicking any nav link
    const mobileNavLinks = menuPanel.querySelectorAll('.mobile-nav-item');
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => toggleMenu(false));
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggleBtn.contains(e.target) && !menuPanel.contains(e.target)) {
        toggleMenu(false);
      }
    });
  }
});
