/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';

/**
 * Content Security Policy for the production build. It enforces the privacy promise in the
 * browser itself: the page can only talk to its own origin, so a photo cannot be sent anywhere.
 * Not applied in dev, where Vite needs inline scripts and a websocket.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob: mediastream:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  plugins: [contentSecurityPolicy()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
