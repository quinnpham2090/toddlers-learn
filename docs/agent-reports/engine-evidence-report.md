# Lesson engine: per-step evidence (skill ids + participation) — report (2026-10-31)

Commit: the single commit that adds this file — `git log --oneline -1`.
Message: `Lesson engine: per-step evidence skill ids + participation flag (optional, backward compatible)`

## Files created / changed

- `lib/evidence-policy.js` / `.d.ts` — two new pure functions (below), alongside the L6
  `completedWithHelpFor`.
- `lib/pack-loader.ts` — types only: `LessonStep.evidence_skill_ids?: string[]`,
  `LessonStep.evidence_participation?: boolean`.
- `lib/progress-store.ts` — optional `participation?: boolean` on `NewSkillEvidence` and
  `SkillEvidenceRecord`; `isSkillEvidenceRecord` accepts the optional field.
- `lib/path-queue.ts` — lesson-evidence weight now comes from the shared `evidenceWeightFor()`.
- `app/session.tsx` — `StepOutcome` carries the resolved per-step values; the **single**
  `recordStepEvidence` call site now builds entries through `stepEvidenceEntries()`.
- `tools/validator.js` — two new named rules.
- `dev-harness/engine-evidence-drill.js` — new proof drill (23 checks).
- `dev-harness/engine-groups-rows-drill.js` — **one** stale source-marker assertion updated (see
  Notes); its behavioural checks are unchanged.
- `docs/agent-reports/engine-evidence-report.md` — this file.

No Pack 1 changes, no Pack 2 lesson/skill/record changes, no bands-engine rule changes, no
dependency changes, `packs/active.json` untouched.

## EXACT field contract (handoff for the Wave 3 wiring re-run)

### `LessonStep.evidence_skill_ids?: string[]`
- **Absent** → exactly today's behaviour: **one** evidence entry for the lesson's
  `primary_skill_id`.
- **Present** → **one entry per listed skill** for that step (explicit over implicit: list the
  primary too if it should still count). Must be a **non-empty** array.
- Validator `P-SCHEMA-STEP-EVIDENCE-SKILLS`: non-empty; every entry must resolve to a skill in the
  pack **or in the pack's declared dependencies** (the deps allowance is needed for L5's
  `colour-naming`, a Pack-1 skill Pack 2 declares — see the L5 note).

### `LessonStep.evidence_participation?: boolean`
- **true** → every entry for that step is recorded **participation** (non-qualifying).
- **Absent/false** → today's behaviour.
- Applies to **all** of that step's entries (see the L5 note).
- Validator `P-SCHEMA-STEP-EVIDENCE-PARTICIPATION`: must be a boolean when present.

### `participation` vs `completed_with_help` (DISTINCT — no precedence hack)
- `NewSkillEvidence.participation?: boolean` and `SkillEvidenceRecord.participation?: boolean` are
  new **optional** fields. The key is written **only when true**, so entries for steps without the
  flag are byte-shape-identical to before (existing records untouched).
- `lib/evidence-policy.js` `evidenceWeightFor(record)` returns `'participation'` when
  `completed_with_help === true` **or** `participation === true`, else `'strong'`.
- `lib/path-queue.ts` uses that function for lesson evidence, so `isQualifying()` (which already
  excludes `weight === 'participation'`) needs **no rule change**. Either signal alone makes a step's
  entries non-qualifying; both together compose with no conflict.
- The help signal stays intact for parent-map display (participation never rewrites
  `completed_with_help`).

### Single call site preserved
- `app/session.tsx` still has exactly **one** `recordStepEvidence(` call site:
  `recordStepEvidence(stepOutcomes.flatMap((outcome) => stepEvidenceEntries(outcome, lessonPrimarySkillId)))`.
- The finale still writes **no** evidence (`handleFinaleChoose` / `finishFinale` unchanged).

## How the Wave 3 wiring re-run expresses the three cases

1. **L1 step 5 ("counted, not subitized")** → `evidence_participation: true` on step 5 only. Its
   entry is `subitize` + participation → non-qualifying; steps 1–4 stay plain (qualifying at
   scaffold 0–1). Measured: step-5-only now yields `qualifying=0` (was 1).
2. **L2d per-step secondaries** → list the primary plus the step's secondary, e.g.
   `step 2: evidence_skill_ids: ['give-n', 'give-1']`, `steps 1+4: ['give-n', 'give-2']`,
   `steps 3+5: ['give-n', 'give-3']`. One step can now write several skills (measured: a step
   listing `[give-n, give-1]` yields exactly those two entries).
3. **L5 colour-naming (practised, never banded)** → **do NOT list `colour-naming`** in
   `evidence_skill_ids`; leave the steps at the default (primary `sort-by-colour` only). That
   satisfies "no bandable evidence mapping for colour-naming in this lesson" and the drill half
   "L5 play yields NO bandable colour-naming evidence".
   **Flagged limitation:** `evidence_participation` is **per-step**, so it cannot mark one entry of
   a step participation while another stays bandable. If the founder wants colour-naming *recorded*
   (participation) **and** sort-by-colour bandable in the same step, that needs per-**entry**
   granularity — a further, small engine change not authorized this run. Listing
   `['sort-by-colour','colour-naming']` **with** `evidence_participation: true` would wrongly
   de-band `sort-by-colour`, so it must not be used.

## Proof — `dev-harness/engine-evidence-drill.js` (23/23 PASS)

Uses the **real** shared policy functions (the same module the session and path-queue import), the
**real** band engine, and the **real** validator.

```
[PASS] no existing step in any pack carries the new fields -> flagged=none
[PASS] existing lesson steps still emit exactly one entry for the primary skill, unchanged keys/weight -> checked=63
[PASS] a step listing [give-n, give-1] yields one entry per skill (L2d-style) -> entries=give-n+give-1
[PASS] participation entry keeps completed_with_help untouched and adds participation:true
[PASS] participation evidence is excluded by the real band engine (single step) -> qualifying=0 band=exploring
[PASS] participation evidence stays non-qualifying across 6 spaced runs (L1 step-5 case) -> qualifying=0 band=exploring
[PASS] help-marked evidence still yields weight participation with no participation key
[PASS] L6 evidence_help_only still marks a step completed-with-help
[PASS] help-only and participation compose without precedence hacks
[PASS] validator accepts a valid evidence_skill_ids list (in-pack ids)
[PASS] validator accepts a declared-dependency skill id (L5 colour-naming case)
[PASS] validator accepts evidence_participation: true
[PASS] validator rejects an empty evidence_skill_ids array -> P-SCHEMA-STEP-EVIDENCE-SKILLS
[PASS] validator rejects an unresolvable evidence_skill_ids entry -> P-SCHEMA-STEP-EVIDENCE-SKILLS
[PASS] validator rejects a non-boolean evidence_participation -> P-SCHEMA-STEP-EVIDENCE-PARTICIPATION
[PASS] existing pack core / sunny-home-garden / sunny-home-garden-2 / test-switch still validate
[PASS] session keeps exactly one recordStepEvidence call site
[PASS] session builds entries through the shared stepEvidenceEntries()
[PASS] path-queue maps weight through the shared evidenceWeightFor()
```

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (6 distinct queues)
- validator all-packs — 0 errors (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `node dev-harness/lesson-selection-drill.js` — PASS
- `node dev-harness/l6-evidence-drill.js` — PASS (L6 regression)
- `node dev-harness/engine-groups-rows-drill.js` — PASS (28/28, regression)
- `node dev-harness/engine-evidence-drill.js` — PASS (23/23)

## Notes

- **One prior-drill assertion updated:** `engine-groups-rows-drill.js` asserted the literal source
  string `skill_id: lessonPrimarySkillId`, which this run moved into the shared
  `stepEvidenceEntries()` helper. The assertion now checks the same intent through the new shape
  (`stepEvidenceEntries(outcome, lessonPrimarySkillId)`); its behavioural checks are unchanged, and
  the "existing output unchanged" guarantee is separately proven over all 63 existing steps by the
  new evidence drill.
- **Latent trap (not changed):** `deriveSkillBand()` in `lib/progress-store.ts` is now **dead code**
  (no callers), and it filters only on `!completed_with_help`. If it is ever revived it must also
  exclude `participation` records. Left untouched (out of scope; no bands rules changed).
- **Deps allowance:** the new `P-SCHEMA-STEP-EVIDENCE-SKILLS` rule accepts a skill id that resolves
  in-pack **or** in the pack's declared dependencies, matching the validator's existing cross-pack
  ref policy (the Wave 1/2 precedent). The prompt said "in the pack"; the allowance is required for
  L5's `colour-naming` and is reported here explicitly.

## Confirmations

- Pack 1 untouched (`git diff -- packs/sunny-home-garden/` empty); no pack data changed at all
  (`git diff -- packs/` empty).
- No Pack 2 lessons/skills/records wired; no bands-engine rule changed (only the path-queue input
  mapping now routes through the shared function).
- `packs/active.json` untouched (still `sunny-home-garden`; Pack 2 NOT active).
- No dependency changes; no dev server; no staging; nothing committed except this run's files.

## DoD

No phone test for this run: nothing visible changes until a lesson uses the new fields, and no
existing lesson renders or evidences differently (proven over all 63 existing steps). Behavioural
proof rides with the NEXT run's phone test — Wave 3 wiring re-run + engine rendering + the L6
parent-map check — via the test-switch procedure. No demo/test lesson was invented.
