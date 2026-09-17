/**
 * CockroachTalk - Partials Loader & Global Theme Manager & Activity Heartbeat
 * File Responsibility: Injects shared header and footer partials at runtime, handles theme switching, and sends heartbeat ping to reset 7-day deletion timer.
 */

import { renderHeader } from './partials/header.js';
import { renderFooter } from './partials/footer.js';
import { storage } from './utils/storage.js';
import { ICONS } from './utils/icons.js';
import { initAgeGate } from './components/ageGate.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize mandatory 18+ age verification consent modal across all entry points
  initAgeGate();

  // Apply saved theme on initial boot
  let savedTheme = storage.getTheme();
  if (!savedTheme) {
    savedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
        menuPanel.classList.remove('open');
        menuToggleBtn.setAttribute('aria-expanded', 'false');
        if (iconHamburger) iconHamburger.style.display = 'block';
        if (iconClose) iconClose.style.display = 'none';
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
