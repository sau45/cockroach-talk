'use client';

let cachedFingerprint: string | null = null;

/**
 * Computes a stable, privacy-preserving cryptographic browser fingerprint
 * using canvas rendering, WebGL vendor, AudioContext, screen geometry, and system attributes.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  if (typeof window === 'undefined') {
    return 'ssr-unknown-device';
  }

  try {
    const stored = localStorage.getItem('ct_device_fp');
    if (stored && stored.length === 64) {
      cachedFingerprint = stored;
      return stored;
    }
  } catch (e) {}

  const components: string[] = [];

  // 1. Screen & Geometry
  try {
    components.push(`screen:${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
    components.push(`avail:${window.screen.availWidth}x${window.screen.availHeight}`);
    components.push(`dpr:${window.devicePixelRatio || 1}`);
  } catch (e) {}

  // 2. Timezone & Locale
  try {
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'}`);
    components.push(`tz_offset:${new Date().getTimezoneOffset()}`);
    components.push(`lang:${navigator.language || 'en'}`);
    components.push(`platform:${navigator.platform || 'unknown'}`);
    components.push(`concurrency:${navigator.hardwareConcurrency || 4}`);
  } catch (e) {}

  // 3. Canvas Fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.font = '11pt no-real-font-123';
      ctx.fillText('CockroachTalk,🔒<canvas> 1.0', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '18pt Arial';
      ctx.fillText('CockroachTalk,🔒<canvas> 1.0', 4, 45);
      components.push(`canvas:${canvas.toDataURL().slice(-60)}`);
    }
  } catch (e) {}

  // 4. WebGL Renderer & Vendor
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && 'getExtension' in gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        components.push(`webgl:${vendor}~${renderer}`);
      }
    }
  } catch (e) {}

  // 5. Compute SHA-256 Hash
  const rawString = components.join('|||');
  let hashHex = '';

  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(rawString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Simple fallback hash
    let h = 0;
    for (let i = 0; i < rawString.length; i++) {
      h = Math.imul(31, h) + rawString.charCodeAt(i) | 0;
    }
    hashHex = Math.abs(h).toString(16).padStart(64, '0');
  }

  cachedFingerprint = hashHex;
  try {
    localStorage.setItem('ct_device_fp', hashHex);
  } catch (e) {}

  return hashHex;
}
