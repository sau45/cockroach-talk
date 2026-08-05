/**
 * CockroachTalk - Header Partial Render Function
 * File Responsibility: Returns HTML string for shared sticky top header with responsive mobile hamburger drawer.
 */

import { storage } from '../utils/storage.js';

export function renderHeader(currentPath = '/') {
  const isHome = currentPath === '/' || currentPath.endsWith('index.html');
  const isJunctions = currentPath.includes('junctions.html');
  const isAbout = currentPath.includes('about.html');

  const userProfile = storage.getUserProfile();
  const userTag = userProfile?.tag || '1001';
  const compactHandle = `Co...#${userTag}`;

  return `
    <header class="site-header">
      <div class="site-container header-inner">
        <a href="index.html" class="site-logo" aria-label="CockroachTalk Home">
          <span style="font-size: 1.25rem; line-height: 1;">🪲</span>
          Cockroach<span>Talk</span>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="site-nav desktop-only" aria-label="Main Navigation">
          <a href="index.html" class="nav-link ${isHome ? 'active' : ''}">Home</a>
          <a href="junctions.html" class="nav-link ${isJunctions ? 'active' : ''}">Junctions</a>
          <a href="about.html" class="nav-link ${isAbout ? 'active' : ''}">About</a>
        </nav>

        <!-- Desktop Action Controls -->
        <div class="header-actions desktop-only" style="display: flex; align-items: center; gap: 0.5rem;">
          <a href="onboarding.html" class="btn btn-secondary btn-pill btn-user-handle-pill" style="padding: 0.3rem 0.6rem; font-size: 0.7rem; background: rgba(212, 160, 23, 0.08); border-color: var(--border-glow);" title="${userProfile?.displayName || compactHandle}">
            <span style="color: var(--accent-gold); font-weight: 800;">✦ ${compactHandle}</span>
          </a>

          <button id="theme-toggle" class="theme-toggle-btn" aria-label="Toggle Dark/Light Theme" title="Toggle Theme">
            ✦
          </button>
        </div>

        <!-- Mobile Hamburger Toggle Button -->
        <button id="mobile-menu-toggle" class="mobile-menu-toggle-btn mobile-only" aria-label="Open Navigation Menu" aria-expanded="false">
          <svg class="icon-hamburger" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <svg class="icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Mobile Collapsible Menu Panel -->
      <div id="mobile-menu-panel" class="mobile-menu-panel">
        <div class="mobile-menu-inner">
          <nav class="mobile-nav-links">
            <a href="index.html" class="mobile-nav-item ${isHome ? 'active' : ''}">
              <span style="font-size: 1.1rem;">🏠</span> Home
            </a>
            <a href="junctions.html" class="mobile-nav-item ${isJunctions ? 'active' : ''}">
              <span style="font-size: 1.1rem;">🎙️</span> State Junctions
            </a>
            <a href="about.html" class="mobile-nav-item ${isAbout ? 'active' : ''}">
              <span style="font-size: 1.1rem;">ℹ️</span> About & Tech
            </a>
            <a href="onboarding.html" class="mobile-nav-item">
              <span style="font-size: 1.1rem;">👤</span> Handle: <strong style="color: var(--accent-gold); margin-left: 0.25rem;">${compactHandle}</strong>
            </a>
          </nav>

          <div class="mobile-menu-footer">
            <button id="mobile-theme-toggle" class="btn btn-secondary btn-pill" style="width: 100%; justify-content: center; gap: 0.5rem; padding: 0.6rem; font-size: 0.85rem;">
              <span>✦</span> Toggle Theme
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}
