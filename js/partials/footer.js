/**
 * CockroachTalk - Footer Partial Render Function
 * File Responsibility: Returns HTML string for shared site footer with SEO links & copyright.
 */

export function renderFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer"> <div class="site-container footer-inner"> <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-family: var(--font-family-heading);"> <span style="font-size: 1.25rem;"><i class="bi bi-bug-fill" aria-hidden="true"></i></span> <span class="gradient-text-gold" style="font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.06em;">CockroachTalk</span> </div> <nav class="footer-nav" aria-label="Footer Navigation"> <a href="index.html" class="footer-link">Home</a> <a href="junctions.html" class="footer-link">State Voice Junctions</a> <button onclick="if(window.openEditProfileModal) window.openEditProfileModal();" class="footer-link" style="background:none; border:none; padding:0; cursor:pointer;">Set Identity</button> <a href="about.html" class="footer-link">About & Audio Tech</a> <a href="privacy.html" class="footer-link">Privacy Policy</a> <a href="terms.html" class="footer-link">Terms of Service</a> </nav> <p class="footer-copy">
          &copy; ${year} CockroachTalk. Live audio voice rooms. Every state has a cockroach room. Anonymous & WebRTC encrypted.
        </p> </div> </footer>
  `;
}
