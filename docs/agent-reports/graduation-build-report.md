# Per-profile automatic graduation build (Pack 2 → Pack 3) — 2026-11-01

## HEAD gate

- HEAD at start: **`83f471e`** ("Wire Wave 7 (Pack 3): 6 lessons, 6 new skills, 12 new images + 24 copies, 72 voice") — matches the prompt gate.
- `git pull --ff-only`: Already up to date. Tree clean apart from the known untracked strays (`AUDIT-REPORT.md`, the wave zips, `.kilo/`) **plus** `docs/agent-reports/pack3-test-switch-assist-report.md` — the report I wrote in the previous run at the founder's explicit request; it is untracked, unstaged and untouched. Flagged here because it was not in the prompt's stray list.
- `packs/active.json` read `sunny-home-garden-2` (Pack 2 live) before any edit.

## Files created / changed

| File | Change |
| --- | --- |
| `lib/pack-assignment-resolution.js` | NEW — Node-safe: `ASSIGNMENT_FILE_PREFIX`, `isPackAssignmentRecord`, `resolveActivePackIdWithAssignment` |
| `lib/pack-assignment.ts` | NEW — per-profile assignment store (cached read, atomic temp+rename write, invalidate) |
| `lib/graduation-predicate.js` | NEW — Node-safe: `GRADUATION_EDGES`, finish-set derivation, skill meta, evidence normalisation, `evaluateGraduation` |
| `lib/graduation.ts` | NEW — device: `maybeGraduate`, `getGraduationProgress` |
| `lib/pack-loader.ts` | `getGlobalActivePackId()` extracted; `getActivePackId/getActivePack/getStrings/getString/getSkills/getSkillById/getLessons/getLessonById/getCharacters/getCharacterById/getPictureSets/getPictureSetById/getMissions/getMissionById/getRoutines/getRoutineById/getTimeConcepts/getSongTemplates/getSongTemplateById/getSavedSongs/getJourneyStopSkills` all take an optional `profileId` |
| `lib/progress-store.ts` | per-profile evidence files (`skill-evidence-<profileId>.json`) + one-time legacy migration |
| `lib/pack-activation.ts` | uses `getGlobalActivePackId()` (unchanged behaviour) |
| `lib/path-queue.ts` | `profileId` threaded; computes `ageBypass` when the resolved pack is the profile's graduated pack |
| `lib/path-queue-engine.js` / `.d.ts` | `ageBypass` option: lesson age-band check + breadth/top-up eligibility bypassed (§5) |
| `lib/mission-unlock.ts` | `profileId` threaded |
| `lib/adventure-map.ts` | `profileId` threaded through the placement map + its sentence helpers |
| `app/adventure.tsx` | all 6 calls moved to `getGlobalActivePackId()` (explicit global exception) |
| `app/index.tsx` | hub: per-profile resolution + `maybeGraduate` on focus |
| `app/session.tsx` | optional `profileId` route param; per-profile resolution; `maybeGraduate` after `markPathSessionCompleted` |
| `app/child-map.tsx`, `app/parent-dashboard.tsx`, `app/mission.tsx`, `app/together.tsx`, `app/composer.tsx`, `app/routine.tsx`, `app/songbook.tsx` | per-profile resolution |
| `dev-harness/graduation-drill.js` | NEW drill |
| `dev-harness/{mission-offer,w4-wiring}-drill.js` | 1-line regression fixes (below) |
| `docs/agent-reports/graduation-build-report.md` | this report |

**No pack file changed** (`git diff -- packs/` empty); `packs/active.json` untouched; `lib/bands.js` and `lib/path-graph.js` untouched.

## The finish predicate (as implemented)

`evaluateGraduation({ evidence, lessons, skills, adventureCompleted })` in `lib/graduation-predicate.js`:

- **Finish set derived at runtime** — `deriveFinishSkillIds(lessons, skills)`: every skill that is a lesson primary **or** appears in a lesson step's `evidence_skill_ids`, filtered to skills present in `skills.json`. **At this HEAD it equals the §1 list of 31 skills** (drill-verified).
- **Skill meta built from the FROM pack's `skills.json`** (never the path-graph nodes): `domain` from the record, `bandable: true`, `provisional` from the node where one exists else `false`.
- **Evidence normalised** with `session_id = lesson:<timestamp>`, `format_key = lesson:<skill_id>`, `weight` via `evidenceWeightFor`, `bandable: true`, `scaffold_level` from the record — then evaluated by the REAL `evaluateBands` (`lib/bands.js`).
- **Standard skills:** `display_band` ∈ {`practising`, `confident`} (display, not support). For lesson evidence this means ≥3 qualifying events across ≥2 days — and it reads **`practising`, never `confident`** (lesson `format_key` is constant, so `min_formats` is unreachable). All-Confident is **not** required (drill-verified).
- **Help-only skill `name-with-grown-up`:** presence rule — ≥1 evidence record of any kind. Its evidence is help-marked by design, so it reads at most `exploring`; presence, not band, is the bar. Absence blocks graduation (drill-verified).
- **Science provisional skills** (`notice-with-choices`, `sort-by-property`, `what-will-happen-if`, `explain-why`, `what-do-you-see`): same Practising bar, `provisional: true` carried in the meta; confidence label differs only (drill-verified).
- **Adventure evidence does not count** (lesson evidence only) — the predicate reads the lesson evidence store, not adventure state.
- **Precondition:** `adventureCompleted === true` (drill-verified as a gate).

## Resolution order (as implemented)

`getActivePackId(profileId)` = **device override → per-profile assignment → bundle pointer → first known pack** (`resolveActivePackIdWithAssignment`); a bad/unknown value falls through at every level. `getGlobalActivePackId()` keeps the old three-level semantics (override → pointer → first known) and is used by `lib/pack-activation.ts` (activate/rollback/list), `app/adventure.tsx` (all 6 calls — the entry adventure is Pack 1 onboarding, never per-profile) and drills. `activatePack`/`rollbackPack` are unchanged and remain the device-override escape hatch; production graduation writes **only** the assignment file.

## Evidence split + migration (as implemented)

`loadSkillEvidence(profileId)`, `recordStepEvidence(entries, profileId)`, `clearSkillEvidence(profileId)` read/write `skill-evidence-<profileId>.json`. On first read for the default profile, if that file is absent and the legacy `skill-evidence.json` exists, it is copied across once (non-destructive; the legacy file is never deleted by the app and is ignored afterwards). Non-default profiles start empty. Adventure state, questionnaire and parent settings stay global. Path state and mission-offer state were already per-profile.

## Dashboard lines

- **Active pack** — now the profile's resolved pack id + version (was the global pack).
- **Pack 2 journey** — shown only while on Pack 2: `"<N> of 31 skills finished"`, computed by the SAME `getGraduationProgress` predicate as the check (never a second computation).
- **Graduation** — shown only after graduation: `"Finished Sunny Home Garden 2 on <date> — now on Sunny Home Garden 3."`, derived from the assignment file. No dismiss, no extra flag.

No approval button, no manual pack picker, no child-facing ceremony.

## Age bypass (in this build)

When the profile's resolved pack is its **graduated** pack, the queue treats that pack's lessons as age-eligible: `lib/path-queue-engine.js` gained an `ageBypass` option applied to `lessonForNode`'s lesson-band check and to breadth/top-up candidate eligibility; `lib/path-queue.ts` sets it only when `getActivePackId(profileId) === assignment.assigned_pack_id`. Pack 2 lessons and non-graduated packs keep their age filtering. This is the one queue-filtering change; no advancement rule changed.

## Gates

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (6/6)
- validator all-packs — **0 errors** (core, Pack 1, Pack 2, Pack 3, test-switch)
- `expo-doctor` — **no new failures** (the same pre-existing dependency patch drift: `@expo/ui`, `expo`, `expo-audio`, `expo-router`, `react-native-screens`; no dependency changes)
- All prior drills PASS: lesson-selection, mission-offer, l6-evidence, engine-groups-rows, engine-evidence, w3-evidence, pack-activation, w2-l5-wiring, notice-title-fix, w4-wiring, w5-wiring, w6-wiring, w8-wiring, w7-wiring
- `node dev-harness/graduation-drill.js` — **ALL GRADUATION CHECKS PASSED** (28 checks: finish set = 31 at this HEAD; all-31 → finished; one short → not finished; help-only presence counts and absence blocks; the 5 no-path skills absent; provisional science skills counted with flag; all-Confident not required; adventure precondition; assignment record shape; idempotency; unregistered target fails safe; override > assignment > pointer > first-known; corrupt/unknown assignment falls through; evidence untouched; pointer file untouched; Pack 1/2/3 diffs empty; `active.json` untouched; Pack 2 steps 143 byte-unchanged)

**Drill regression fixes (2, within the "drills" scope):** `mission-offer-drill` (its session-source regex now allows the `profileId` argument and the `maybeGraduate(profileId)` call inserted between `markPathSessionCompleted` and `markPathLessonCompleted`); `w4-wiring-drill` (its FinaleNarrator prop regex now allows the added `profileId` argument on `getString(finalePack.findPromptRef, undefined, profileId)`).

## Known consequence (stated, not a bug)

Pack 3 ships **no missions, routines or saved songs** (its `missions.json`, `routines.json`, `saved_songs.json`, `song_templates.json` are `[]` by the Wave 7 wiring scope). A graduated profile therefore stops receiving mission offers and sees an empty songbook until a future Pack 3 wave authors them. This matches the test-switch behaviour the founder already phone-tested. Authoring Pack 3 missions is a content item, not part of this build.

## What did NOT change

- **Pack 1, Pack 2, Pack 3** — no lessons, skills, sets, strings or assets touched (`git diff -- packs/` empty).
- **`packs/active.json`** — untouched; stays on Pack 2.
- **`lib/bands.js`, the band rules, `lib/path-graph.js`** — untouched (no new nodes, no next-array fixes; the known node drift stays drift).
- **Queue advancement logic** — unchanged (only the §5 age-filtering bypass was added).
- **`activatePack` / `rollbackPack`** — unchanged.
- **Adventure state, questionnaire, parent settings** — deliberately still global.
- No dependency changes; no dev server; no child name; British "colour".

## DoD (founder phone test — REQUIRED)

The flip moment is drill-proven unless the founder's profile already satisfies the predicate (readable from the dashboard progress line: 31 of 31). Do NOT fake it by hand-editing evidence on the phone. On the phone: (a) a non-finished profile on Pack 2 shows Pack 2 lessons, the dashboard shows Pack 2 + `N of 31`, and no graduation fires after a path session; (b) test-switch still works (override to Pack 3 → Pack 3 lessons; clear it → per-profile resolution returns to Pack 2); (c) `packs/active.json` still reads Pack 2 (git + dashboard agree); (d) if the profile already satisfies the predicate, play one path session and confirm the next hub visit offers Pack 3 lessons and the dashboard shows the graduation line; (e) regression — existing Pack 2 journey unchanged and shared-skill bands still display for a graduated profile.
