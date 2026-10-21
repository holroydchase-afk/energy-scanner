# Third-party notices

Energy Scanner's own code is MIT (see `LICENSE`). It ships these third-party parts, each under its own license:

| Part | Where | License | Source |
| --- | --- | --- | --- |
| MediaPipe Selfie Segmenter model (float16) | `public/models/selfie_segmenter.tflite` (committed) | Apache License 2.0, © Google LLC | https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter |
| MediaPipe Tasks Vision runtime (JS + wasm) | `@mediapipe/tasks-vision`, copied to `public/mediapipe/` at build time | Apache License 2.0, © Google LLC | https://github.com/google-ai-edge/mediapipe |

The full Apache 2.0 text is in `licenses/Apache-2.0.txt`. The model and runtime are used unmodified.

Dev-only tools (Vite, TypeScript, ESLint, Vitest, Playwright, jsdom) are not shipped in the built app.
