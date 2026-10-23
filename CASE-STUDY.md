# Case study: Energy Scanner

## The problem

Bedtime at our house was a nightly negotiation. "Five more minutes" works better on a parent than on a machine. So the idea: kids work through their bedtime routine, then step up for an energy scan, and a neutral scanner says it's time to sleep instead of me.

## Constraints I set

- **Routine first.** A fake scan on its own wears off in a week. The scan is the reward at the end of real steps (bath, PJs, teeth, potty, book).
- **Kids' faces never go to a cloud model.** If there's a camera, the photo stays on the phone. No server, no account, no tracking.
- **Demoable in one tap, on a phone.** A static site on my portfolio, no sign-up, no install.

## How it evolved

1. **Palm scan prototype.** Press and hold a pad until the ring fills, and the scanner reads a color from Rainbow (way too much sparkle for sleeping) down to Grey (battery empty). My kids tested it at bedtime. The camera waited until it could run privately.
2. **Photo scan.** Take or upload a photo and the child's energy glows off them as an animated aura, in the color of the reading: softer and slower when sleepy, blazing at Rainbow. It runs entirely on the phone.
3. **One app.** The palm scan stays as an option next to the photo scan, so it still works without a camera.

## Key product decisions

| Decision | Why | Trade-off |
| --- | --- | --- |
| The reading follows the clock and the routine | The closer to bedtime and the more steps done, the sleepier the color; it never says Rainbow once every step is done | A little randomness keeps it from feeling canned, so it isn't perfectly predictable |
| An "Always Grey" grown-up switch, on by default | Some nights the answer is just "bed", and the machine backs the parent up | First-time visitors see Grey every time, so the card says how to see the other colors |
| On-device person segmentation (MediaPipe in WebAssembly, a 250 KB model) | "Photos never leave the device" is literally true, and a test checks every request stays on the app's own origin | The first photo scan downloads the runtime; slower on old phones |
| The phone's own camera app instead of an in-page camera | The in-page camera was buggy on iPhone; the native camera handles focus, flash and switching cameras | Less control over the capture screen |
| An illustrated sample person | Anyone can see the aura without a photo, and no real person's photo is ever published | It's a drawing, so it shows the effect, not how it looks on a real child |
| Save and share | A captioned image or short video, shared from the phone, explains itself when it reaches family | A small app name on every export |
| Cut: accounts, history, streaks, live video | None of them serve the bedtime moment | Live video aura is the obvious next step |

## How it was built

I planned and specified it, and an AI coding agent built it against written milestones, done-criteria and hard rules: tests before every push, never merge, never commit photos of real people, photos never leave the device. Each milestone was a pull request I reviewed: scaffold with lint, typecheck, unit and real-browser tests; photo in; the aura (segmentation, a distance field around the person, a WebGL shader); save and share; the bedtime flow; the native camera; and a recruiter-ready review with fixes.

## What I'd do next

- **Watch real bedtimes.** Does the novelty hold past two weeks, and does the scan end the negotiation?
- **Live aura on the camera feed** (segmentation is fast enough for video on recent phones).
- **Measure privately:** scans per night and steps completed, kept on the device.
