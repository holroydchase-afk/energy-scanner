# Sample images

This repo is public, so it never stores photos of real, identifiable people.

- Portfolio screenshots of the aura (`docs/screenshots/aura-*.png`, `result-*.png`) are only added from a photo whose subject has agreed to be published. Regenerate them with `npm run screenshots -- path/to/photo.jpg`.
- The in-app **Try the sample** image is an illustrated child drawn in code (`src/photo/sample.ts`), labeled "Illustrated sample, not a real person". It is not a photo and depicts no real person. Tests and screenshots use it too.
- Tests use synthetic images generated in the browser (`e2e/helpers.ts`). The happy-path browser test runs on the illustrated sample; an optional extra test runs on a local photo you supply: `SAMPLE_PHOTO=path/to/photo.jpg npm run test:e2e`.

| File | Source | License |
| --- | --- | --- |
| (none yet) | | |
