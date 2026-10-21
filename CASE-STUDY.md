# Case study: Energy Scanner

## The idea

A friend shows you a photo; you tap once and their energy visibly radiates off them. That's the whole product. The bet was that one strong, shareable visual moment beats a feature list.

## Constraints I set

- **Demoable in one tap, on a phone.** No sign-up, no install, no waiting on a server.
- **Private by design.** Photos of people are sensitive. Instead of writing a privacy policy, remove the reason for one: never upload the photo.
- **Shippable in days, not weeks.** A static site, so it can live on a portfolio link with no hosting costs or backend to maintain.

## Key product decisions

| Decision | Why | Trade-off |
| --- | --- | --- |
| Run segmentation on-device (MediaPipe in WebAssembly) | Privacy and zero server cost; works offline after load | First scan downloads ~13 MB of runtime; slower on old phones |
| Small selfie model (250 KB) over a 16 MB multiclass model | 4x faster, sharper edges, light enough for phones | Less detail on fine hair |
| Self-host the model and runtime | "Photos never leave your device" is literally true, and checked by a test | Bigger deploy than pulling from a CDN |
| Auto-pick an "energy type" from the photo's colors | Makes the scan feel like a reading, not a filter; gives a reason to share ("I'm Mystic") | Arbitrary by design; framed as fun, user can change it |
| Dim the background behind the aura | The aura has to read on bright, busy photos | The photo looks moodier than the original |
| Captioned exports + native share sheet | A shared image should explain itself and bring people back | A small brand mark on every export |
| Cut: accounts, galleries, filters, AR live video | None of them serve the core moment for v1 | Live video aura is the obvious v2 |

## How it was built

Five milestones, each one shippable on its own and reviewed as a pull request:

1. Scaffold with lint, typecheck, unit and real-browser tests from day one.
2. Photo in: camera (with a fallback for older browsers), upload, drag and drop.
3. The aura: segmentation, a distance field around the person, and a GPU shader for the animated energy.
4. Save and share: image, short video, phone share sheet.
5. This write-up, the README and screenshots.

The work was planned and specified by me and built with an AI coding agent working overnight against written milestones, done-criteria and hard rules (tests before every push, never merge, never commit photos of real people). I reviewed each milestone as a pull request in the morning.

## What I'd do next

- **Live aura on the camera feed** (segmentation runs fast enough for video on recent phones).
- **Shareable link previews** (Open Graph image) so a shared post shows the aura.
- **Measure the funnel**: photo taken, aura shown, saved, shared. Privately, without tracking photos.
