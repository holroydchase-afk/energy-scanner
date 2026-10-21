// Copies the MediaPipe Tasks Vision wasm runtime into public/ so the app self-hosts it
// (no CDN calls at runtime). Run automatically before dev and build.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const to = join(root, 'public/mediapipe');
const files = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm'];

if (!existsSync(from)) {
  console.warn('copy-mediapipe-wasm: @mediapipe/tasks-vision is not installed, skipping');
  process.exit(0);
}
mkdirSync(to, { recursive: true });
for (const f of files) copyFileSync(join(from, f), join(to, f));
console.log(`copy-mediapipe-wasm: copied ${files.length} files to public/mediapipe`);
