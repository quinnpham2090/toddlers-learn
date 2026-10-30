# L6 help-only evidence fix — report (2026-10-31)

Commit: the single commit that adds this file — `git log --oneline -1`.
Message: `L6 evidence: help-only marking via evidence_help_only (L6-only) + proof drill`

## The hole (confirmed in code before the fix)

- `app/session.tsx` wrote step outcomes as `completedWithHelp: scaffoldLevel === 3`; scaffold
  starts at 0 and the Help control is opt-in, so scaffold 0–1 completions wrote
  `completed_with_help: false`.
- `lib/path-queue.ts` (`normalizeLessonEvidence`) maps that to `weight: 'strong'`.
- `lib/bands.js` `isQualifying()` admits scaffold ≤ 1 + not-help + bandable + not-participation,
  so L6 evidence qualified and could move `name-with-grown-up` / `name-with-grown-up-choice`
  toward Practising/Confident.
- The `evidence_needed_to_advance: 3` value was inert (the engine never reads it) — the hole was
  the evidence MARKING.

## The fix (L6 only)

- **Field:** `evidence_help_only?: boolean` on the lesson record schema (`LessonRecord` in
  `lib/pack-loader.ts`). Set `true` on `lesson-name-it-together` (Pack 2) **only**. No Pack 1
  lesson carries it — `lesson-big-little` (Pack 1, same `do_together` shape) is untouched.
- **Rule (single source of truth):** `lib/evidence-policy.js` + `.d.ts` —
  `completedWithHelpFor(lesson, scaffoldLevel)` returns `lesson.evidence_help_only === true || scaffoldLevel === 3`.
- **Session:** `app/session.tsx` now writes
  `completedWithHelp: completedWithHelpFor(lesson, scaffoldLevel)`, so the downstream chain follows
  automatically: progress-store `completed_with_help` → path-queue `weight: 'participation'` →
  `isQualifying()` exclusion. Scaffold UI, Help control, celebration/advance flow unchanged.
- **Validator:** unchanged. `validateCommonRecordFields` checks required fields and never iterates
  unknown keys, so an unknown lesson field is ignored — no allowlist entry needed.
- **Finale:** confirmed L6's finale writes NO evidence. `recordStepEvidence` has exactly one call
  site (app/session.tsx, in `handleNext` on the last step); `handleFinaleChoose`/`finishFinale`
  never call it.
- **Manifest:** Pack 2 `manifest.json` rehashed (lessons.json changed). While rehashing, the
  committed manifest's `skills.json` entry was found **stale** (the file had been edited after that
  run's last rehash); it is now corrected. `pack_sha256` updated. Note: the validator only verifies
  *asset* hashes via `checkAssetIntegrity`, so the stale record hash had not affected gates.

## Proof (runnable, both halves)

Drill: `dev-harness/l6-evidence-drill.js` (dev-only Node). It imports the REAL rule and feeds the
session's output shape through the REAL band engine, mirroring session → progress store →
path-queue normalization. It also asserts the session source calls `completedWithHelpFor`, so the
proof cannot drift from the app.

Output:

```
[PASS] session writes outcomes through the shared rule completedWithHelpFor
[PASS] evidence_help_only is set on lesson-name-it-together only -> pack2=[lesson-name-it-together] pack1=[]
[PASS] L6 @ scaffold 0 (flag set) writes completed-with-help
[PASS] L6 @ scaffold 0 does NOT qualify -> qualifying=0 band=exploring
[PASS] L6 @ scaffold 1 does NOT qualify -> qualifying=0 band=exploring
[PASS] L6 stress (12 spaced runs) stays capped at exploring -> qualifying=0 band=exploring
[PASS] L4 @ scaffold 0 (flag absent) writes strong evidence
[PASS] L4 @ scaffold 0 still qualifies (old behavior intact) -> qualifying=5 band=practising
[PASS] L4 qualifying evidence still reaches confident across 3 spaced formats -> band=confident qualifying=3
[PASS] counterfactual: same lesson WITHOUT the flag would qualify (hole is real) -> qualifying=5 band=practising
```

- Half 1: L6 at scaffold 0 and 1 → `qualifying_count = 0`; 12 spaced runs still cap at `exploring`.
- Half 2: Pack 1 L4 at scaffold 0 → `qualifying_count = 5`; qualifying evidence still reaches
  `confident` when the full rule is met. Old behavior intact.
- Counterfactual: the same lesson without the flag qualifies (`qualifying=5`) — the flag is what
  closes the hole.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (6 distinct queues)
- validator all-packs — 0 errors (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `node dev-harness/lesson-selection-drill.js` — PASS
- `node dev-harness/l6-evidence-drill.js` — PASS (10/10)

## Confirmations

- Pack 1 L4 evidence behavior unchanged (proved by the drill; `git diff -- packs/sunny-home-garden/` empty).
- L6 UX, prompts, celebrations, tiles, finale and flow unchanged; no copy or asset changes.
- No path-graph, bands-engine, queue-engine, or validator changes.
- `packs/active.json` never staged or committed (still restored to `sunny-home-garden`).
- Hygiene: `.gitignore` now excludes `.kilo/` (it did not before). `.kilo/`, `AUDIT-REPORT.md`,
  and `pack2-assets.zip` remain untracked and were never staged.

## DoD — what the founder should look for in the parent map

After low-scaffold L6 play (`lesson-name-it-together`):

1. The **Language** row's band chip must **never** read **Practising** or **Confident** because of
   L6 play. L6 evidence is participation-marked, so it is non-qualifying.
2. The strongest state L6 evidence alone can produce is **Exploring** (the engine floors any
   bandable-but-non-qualifying evidence at Exploring). So expect **at most "Exploring"**, never a
   band claim above it.
3. `name-with-grown-up` / `name-with-grown-up-choice` will **not** appear in the "Still getting to
   know" list, because participation evidence counts as evidence seen.

Founder decision flagged (not changed here): if you want those two skills to read as literally
**"Not yet explored"** (no band word at all) after L6 play, that requires treating this evidence as
non-bandable rather than participation-marked — a different change this pass was not scoped for.
