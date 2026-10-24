# Recruiter UI review, round 6 (2026-10-24)

Night shift goal from Chase: "Prioritize sharing with a recruiter readiness. Move past blockers. Improve the ui."
Branch reviewed: `m2.18-handoff-sync` (the code live since PR #16). Local `vite preview` build only: chaseholroyd.com can't be reached from the sandbox, so the live site was not checked.

Agents: staff-pm (ranked recruiter touchpoints), ux-reviewer (showcase mode, every screen at 390x844, 1280x800 and 320x640, light and dark rows, plus the UI code, README and og.png).

## staff-pm: what a recruiter hits, in order
1. Link preview (og.png + meta): strong; all og/twitter tags present. Verify on the live site only.
2. First screen: says "bedtime helper", but nothing above the fold shows the impressive part (an on-device AI aura). Fix tonight.
3. Try the sample: two taps in, low on the photo card. Fix tonight (with 2 and R61).
4. Aura result: looks good in color; laptop layout has a floating card and the header scrolls away. Small fixes.
5. Palm scan: with Always Grey on by default, every first scan reads Grey with five undone steps. Fixed by R61.
6. Save/share: works in e2e; iPhone Save video still needs Chase's phone.
7. Footer links: present but below the fold.
8. README top: clear; the PM angle lives only in CASE-STUDY.md.
9. Case study: good structure; Chase's voice edit still pending (not rewritten here).

Biggest risk: a recruiter's first scan reads Grey and they leave.

## Findings
| ID | Pri | Where | Problem | Fix |
|---|---|---|---|---|
| ES-R47 | P1 (regression from R46) | Palm reading, ≥900px | Reading card left-aligned under a centred pad: `.scan-area > .reading-card { margin: 0 }` wasn't scoped to photo mode. | Scope to `.scan-area:has(.viewer)`. |
| ES-R48 | P1 | First screen | The only pitch is the bedtime line; the on-device AI aura is hidden behind an unselected tab. | Second line "Photo scan draws a live aura around a person with AI that runs on your device. Nothing is uploaded." plus a "See the aura demo" button that scans the sample. |
| ES-R49 | P1 | Photo start, laptop | "Take a photo" and "Upload a photo" both open a file picker on desktop; "Try the sample", the real laptop path, looks like an afterthought. | On fine pointers hide Take a photo and make Try the sample the primary button. |
| ES-R50 | P1 | Every reading card | The loudest line is a bold yellow to-do nag, even on Rainbow. | Quiet muted line "Steps left tonight: …"; moon color only when all done. |
| ES-R51 | P2 | Aura result, phone | Top of the aura cut off at the reveal; color name below the fold. | Smaller photo cap on phones; keep the whole photo in view. Confirm on iPhone. |
| ES-R52 | P2 | Aura result, phone | Three equal pills wrap 2+1 with no primary; "Scan again" next to "New photo". | Save image primary when Share is hidden; "Scan this photo again" in photo mode. |
| ES-R53 | P2 | Grey reading | "See every color" is a small secondary pill, ragged next to "Scan again". | Primary button in one actions row; note says it's a grown-up setting. |
| ES-R54 | P2 | Aura result, laptop | Scroll on scan pushes the title and mode switch off the top; card floats mid-column; title wraps. | Don't scroll when the stage already fits; top-align, 400px card column. |
| ES-R55 | P2 | Footer, phone | Way back to the portfolio is below the fold; "Chase Holroyd" link goes to the case study without saying so. | "By Chase Holroyd · Case study" line near the top; footer link "Read the case study". |
| ES-R56 | P2 | Bedtime steps | Chips look disabled (grayscale icons, muted labels). | Less grey; label "Bedtime steps · tap when done". |
| ES-R57 | P3 | Grown-ups | Privacy sentence repeated right above the footer; dense rules paragraph. | Drop the repeat; shorter rules. |
| ES-R58 | P3 | Header | Large yellow clock competes with the logo. | Smaller, plain clock. |
| ES-R59 | P3 | No person found | Grey canvas dominates; recovery buttons secondary. | Dim the photo; Try the sample primary. |
| ES-R60 | P3 | Palm reading | "Grey Energy detected" repeats the card title. | Hint says "Scan complete". |
| ES-R61 | P1 (staff-pm) | Always Grey default | On by default, so every first scan reads Grey. | Off for first visits only; a saved choice is kept. Logged under Decisions to review. |

## Status
Fixed in this round: see HANDOFF.md "Done" (PR per batch, tests named with the IDs).

## Round 7 re-review (same night)
ux-reviewer re-checked every screen on the top of the stack (`m2.22-screenshots`). All 15 round-6 fixes verified, no regressions. New:

| ID | Pri | Where | Problem | Fix |
|---|---|---|---|---|
| ES-R62 | P1 | Palm reading, phone and laptop | After a palm scan nothing scrolls, so the reading card sits below the fold ("Scan complete" with the answer hidden). | Scroll the card into view (`block: 'nearest'`, vertical only) after the scan and after See every color. |
| ES-R63 | P2 | Palm start, laptop | "Put your hand on the scanner" on a mouse device. | "Click and hold the scanner until the circle fills" on a fine pointer. |
| ES-R64 | P3 | Photo start, laptop | Lead says "Take a photo" but there's no camera button. | "Upload a photo or try the sample, and the scanner shows the energy glowing off the person." |
| ES-R65 | P3 | Link preview | og:description and og.png say "Runs on the phone" and miss the R48 pitch. | "A live AI aura that runs on your device. Nothing is uploaded." |
| ES-R66 | P3 | README | Still says tap Photo scan, then Try the sample. | "No photo handy? Tap See the aura demo." |
| ES-R67 | P3 | No person found | Primary button sits second. | Try the sample first. |
| ES-R68 | P3 | README aura shots | Rounded corners filled with page color; dark corners on GitHub light theme. | Square, cropped canvas shots. |

All seven fixed in `m2.23-round7`. Verdict after the fixes: share-ready; still needs Chase's iPhone for R51 (photo fit) and Save video / Share.
