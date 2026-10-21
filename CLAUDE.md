# Energy Scanner

Take or upload a photo of a person and render their energy/aura coming off them. Portfolio v1 for Chase.

## Hard rules (these win over any other instructions)

- This repo is PUBLIC. Never commit photos of real, identifiable people. Use generated, CC0, or clearly licensed sample images (record source + license in `samples/SOURCES.md`).
- Photos never leave the device: all processing in the browser, no uploads, no analytics or telemetry.
- No secrets, tokens, artifact ids or trigger ids in the repo.
- Never deploy or publish anything. Never merge to `main`, force-push, rewrite history, or delete branches. One branch and one draft PR per milestone, stacked.
- Fakes (e.g. a fake segmenter) are for tests only and labeled as such; never present them as the real thing in the app.
- Keep `HANDOFF.md` current in every push: done, in progress, exact next step, decisions to review, blockers.
- Run `npm run lint`, `npm run typecheck` and `npm test` before every push.
