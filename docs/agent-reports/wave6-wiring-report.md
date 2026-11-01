# Wave 6 wiring report — 3 science lessons, 3 skills, 4 images + sun copy, 36 voice — 2026-11-01

## HEAD gate

- HEAD at start: **`8f3b314`** ("Wire Wave 5: 4 language lessons, 3 new skills, 12 images, 48 voice") — matches the prompt gate.
- `git pull --ff-only`: Already up to date. Tree clean apart from the known untracked strays (`AUDIT-REPORT.md`, `pack2-assets.zip`, `wave4-assets.zip`, `wave5-assets.zip`, `wave6-assets.zip`). `wave8-assets.zip` not present.
- `packs/active.json` = `sunny-home-garden-2` (Pack 2 live) — untouched.
- `wave6-assets.zip` present; `unzip -t` zero errors; contents = 5 JPGs (rough-bark, crinkly-leaf, rough-basket, smooth-basket, sun) + 36 MP3s (12 per lesson) + `images/image-manifest.json`, `voice/voice-manifest.csv`, `voice/voice-manifest.json`, `wave6-asset-manifest.json`.

## Files created / changed

| File | Change |
| --- | --- |
| `packs/sunny-home-garden-2/lessons.json` | +3 lessons (15 steps) |
| `packs/sunny-home-garden-2/skills.json` | +3 science skills |
| `packs/sunny-home-garden-2/picture_sets.json` | +`texture-sort-set` (6), `predict-set` (6), `explain-set` (5) |
| `packs/sunny-home-garden-2/strings.json` | +69 strings |
| `packs/sunny-home-garden-2/manifest.json` | 45 `file_hashes` entries updated/added; `pack_sha256` unchanged |
| `packs/sunny-home-garden-2/assets/{rough-bark,crinkly-leaf,rough-basket,smooth-basket,sun}.jpg` | 5 new images (sun byte-identical to Pack 1 `adv_sun.jpg`) |
| `packs/sunny-home-garden-2/assets/voice/puff/lesson_{sort_by_property,what_will_happen_if,why_did_that_happen}_*.mp3` | 36 new voice files |
| `lib/path-graph.js` | 2 new science nodes + 2 edge rewires + lesson attachment |
| `app/session.tsx` | +3 `FINALE_CONFIG` entries only (FinaleNarrator mounts untouched) |
| `lib/pack-loader.ts` | 41 static imports + 36 voice-registry keys + 5 asset-registry keys |
| `dev-harness/w6-wiring-drill.js` | new drill |
| `dev-harness/{notice-title-fix,w5-wiring}-drill.js` | regression fixes (below) |
| `docs/agent-reports/wave6-wiring-report.md` | this report |

**Diff scope = the stated code diff** (`lib/pack-loader.ts` + `app/session.tsx` (3 FINALE entries only) + `lib/path-graph.js` + drills + report) and the stated data diff (Pack 2 JSON + assets). Pack 1 EMPTY; `active.json` untouched.

## Lessons wired (all guide Puff, 5/5 min, `song_template_id`/`mission_id`/`routine_id` null, scaffolds mirroring `lesson-what-do-you-see`)

- **W6-L1 `lesson-sort-by-property`** — "Sort by What You Notice!", primary `sort-by-property`, band 3-4, `interaction_type sort_group` (group, item, item, item, group), set `texture-sort-set`, fallback `lesson-what-do-you-see` / `what-do-you-see-set`. ONE contrast pair (rough/smooth); texture is the sole discriminator; steps alternate rough/smooth/rough/smooth.
- **W6-L2 `lesson-what-will-happen-if`** — primary `what-will-happen-if`, band 4-5, `tap_choice`, set `predict-set`, fallback `lesson-sort-by-property` / `texture-sort-set`. 2 choices per step; deterministic garden routines; immediate narrated check.
- **W6-L3 `lesson-why-did-that-happen`** — primary `explain-why`, band 4-5, `tap_choice`, set `explain-set`, fallback `lesson-what-will-happen-if` / `predict-set`. Paired two-try steps (1&4 pushing, 2&5 water, 3 warming); `cup` a target twice for two different whys.

**Evidence:** every step uses the DEFAULT (Wave 4 convention) — no `evidence_skill_ids`, no `evidence_participation` (drill-verified). **Science discipline:** no seasons/day-night/growth content; no size/colour in any sort step/prompt/choice set (drill-verified); `colour-naming` and `sizes-big-little` banded nowhere.

## Skills (3 NEW, all domain science, status draft, `evidence_needed_to_advance` 3)

| Skill | Band | Prereq | Next |
| --- | --- | --- | --- |
| `sort-by-property` | 3-4 | `sorting-one-rule`, `what-do-you-see` | `what-will-happen-if` |
| `what-will-happen-if` | 4-5 | `what-do-you-see`, `sort-by-property` | `explain-why` |
| `explain-why` | 4-5 | `what-will-happen-if` | `[]` |

`sorting-one-rule` resolves in-pack (re-confirmed — no cross-pack issue). `what-do-you-see.next_skills` in **skills.json stays `[name-with-grown-up]` UNTOUCHED** (the chain rewire lives in `path-graph.js`) — confirmed from the W2-L5 dual structure; the validator did **not** require a skills.json next change.

**⚠️ Finding (schema):** the prompt asked for `provisional true` on the skill records. `packs/schema/skill.json` is `additionalProperties: false` and has no `provisional` property, so a skill record **cannot** carry it. Provisional is expressed on the **path nodes** (all five science nodes are `provisional: true`), which is where the bands engine reads it. No `provisional` field was added to skill records; reported, not forced.

## Path-graph (`lib/path-graph.js`)

- **2 NEW nodes** (science, `entry: false`, `provisional: true`):
  - `sort-by-property` — `min_age 3`, `title_ref adventure.skill.sort_by_property.title`, `next [what-will-happen-if]`, `catch_up null`, `consolidation_contexts ['new-item-set','new-garden-place']`, `adventure_skill_ids []`, `lesson_skill_ids ['sort-by-property']`, `playable_lesson_skill_id 'sort-by-property'`.
  - `explain-why` — `min_age 5`, `title_ref adventure.skill.explain_why.title`, `next []`, `catch_up null`, same consolidation/adventure shape, `lesson_skill_ids ['explain-why']`, `playable_lesson_skill_id 'explain-why'`.
- **2 EDGE rewires:** `what-do-you-see.next` `[what-will-happen-if] → [sort-by-property]`; `what-will-happen-if.next` `[] → [explain-why]`.
- **catch_up edges UNCHANGED:** `what-do-you-see.catch_up` stays `notice-with-choices`; `what-will-happen-if.catch_up` stays `what-do-you-see`. (New nodes' `catch_up` not specified → `null`; reported.)
- **Lesson attachment — mechanism confirmed and applied:** `playable_lesson_skill_id` is read by `lib/path-queue-engine.js` (`lessonForNode` → the queue item's `lesson_id`/`lesson_skill_id`), and `lesson_skill_ids` is read by `lib/adventure-map.ts` (`buildStillGettingToKnow`). So attachment **is** how lessons bind to nodes. All three lessons are attached. (Note: the pre-existing `what-do-you-see` node keeps `lesson_skill_ids: []` / `playable_lesson_skill_id: null` — its W2-L5 lesson was wired without attachment; left as-is, reported.)
- **Title scheme:** `adventure.skill.*` (following the W2-L5 precedent — `what-do-you-see` uses `adventure.skill.what_do_you_see.title`). Added `adventure.skill.sort_by_property.title` and `adventure.skill.explain_why.title`.
- **⚠️ Finding (predict title):** the prompt said predict's title "already resolves — no title fix needed". In Pack 2 it did **not**: `adventure.skill.what_will_happen_if.title` existed only in Pack 1, so the parent map would have shown the raw ref. I added it to Pack 2 strings (value copied from Pack 1: **"What will happen?"**) so all five science nodes resolve a title. Reported as a necessary fix beyond the prompt's premise.
- **Verify:** `provisional: true` on all five science nodes (`notice-with-choices`, `what-do-you-see`, `what-will-happen-if`, `sort-by-property`, `explain-why`) — drill-verified.

## Sets

- **`texture-sort-set` NEW** — exactly 6 items: `rough-bark`, `crinkly-leaf`, `rough-basket`, `smooth-basket` (4 new JPGs) + `green-leaf` (from `what-do-you-see-set`) + `ball` (from `everyday-objects-set`). **Reuse rule: COPY** — the 2 reuse records are copied verbatim (same `asset_path`/`asset_sha256`); assets already manifest-hashed in Pack 2.
- **`predict-set` NEW** — exactly 6 choice tiles: `ball`, `book`, `cup`, `spoon`, `green-leaf`, `outdoor-plant` (all in-pack reuse). **Prompt-reference confirm:** `watering-can` is not a choice tile and is **not** added (6 items, unchanged).
- **`explain-set` NEW** — exactly 5 choice tiles: `sun` + `ball`, `book`, `cup`, `watering-can` (in-pack reuse). **Prompt-reference confirm:** `outdoor-plant` is named in step 2's scenario but is not a choice tile and is **not** added (5 items, unchanged).
- **sun:** byte-identical to Pack 1 `packs/sunny-home-garden/assets/adv_sun.jpg` (`cmp` clean) — a **read** from Pack 1 + a NEW Pack 2 file, never a Pack 1 edit.
- No pig/fox, no size, no colour items anywhere in the Wave 6 sets.

## Voice (36 placed; 0 labels; retry cue absent)

- All 36 zip MP3s placed as `assets/voice/puff/lesson_<snake>_step_N_prompt.mp3`, `..._step_N_celebration.mp3`, `..._closing_win.mp3`, `..._find_prompt.mp3`, each wired via a static import + `PACK_VOICE_REGISTRY['sunny-home-garden-2'].puff` key. Every file's raw-byte sha256 matches `wave6-asset-manifest.json`; every `manifest.file_hashes` entry matches the validator utf8 scheme.

**Conditional findings (confirmed, not invented):**

- **(a) finale find-prompt reuse ×2 — both PLACED, no deduction (base 36):**
  - W6-L2 "Let's find the green leaf together!" vs W2-L5's `lesson.what_do_you_see.find_prompt`: files are **byte-distinct** (`be3091a9…` vs `d3149458…`) → both placed.
  - W6-L3 "Let's find the cup together!" vs Wave 3 `lesson.give_three.find_prompt`: files are **byte-distinct** (`d1589355…` vs `efa75675…`) → both placed. (Semantically identical text; the apostrophe glyph differs — my new copy uses the pack's curly `’` convention, `lesson.give_three.find_prompt` uses a straight `'`; wiring outcome unaffected.)
  - **Base placed count = 36.**
- **(b) item word-alone labels for the 4 new texture items:** the zip holds **base lines only** — **0** label files to place (device TTS fallback, Wave 3 convention).
- **(c) prompt-reference set entries:** `watering-can` (predict) and `outdoor-plant` (explain) are **not** added — 6 and 5 items respectively, as specced.
- **(d) Puff retry cue ("Try again — let us look together!"):** **re-confirmed absent** — no such file in Pack 2 `assets/voice/{puff,moss}` and no such key in the loader registry. Retry cue stays **banner text only** (Wave 3/4/5 convention). Not a blocker; flagged for the phone test.

## FINALE_CONFIG (session.tsx — 3 entries only)

Appended after `lesson-animal-words`; shape = target + tiles + `findPromptRef` = `lesson.<snake>.find_prompt`. Targets equal each lesson's step-5 target; every tile appears in its lesson's steps (drill-verified). **FinaleNarrator mounts untouched** (Wave 4 fix intact — drill-verified tablet = 1, phone = 1).

## Strings

Added following the wired Wave 5 key conventions: `lesson.<snake>.title`, `.step_N.prompt`, `.step_N.celebration`, `.closing_win`, `.find_prompt`, `skill.<name>.title/.description`, `item.<name>.label/.alt_parent` (rough-bark, crinkly-leaf, rough-basket, smooth-basket, sun), `picture_set.<name>.title/.alt_parent` (3 sets), and `adventure.skill.<name>.title` (sort-by-property, explain-why, what-will-happen-if). Key scheme: `lesson.<snake>.*` with snake = lesson id minus `lesson-`, `-`→`_`.

- **explain-why recognition wording:** `skill.explain_why.title` = "Recognizes Why That Happened", `skill.explain_why.description` = "Recognizes why that happened, by tapping the cause object", `adventure.skill.explain_why.title` = "Recognizes why that happened". No "explains in own words" claim anywhere (drill-verified).
- Parent-map "next up" wordings added as strings only under `lesson.<snake>.parent_map_next_up`. With path nodes now added, the parent map shows **skill titles via node `title_ref`**, not the lesson wordings — the wordings remain strings-only until a mechanism exists (same reported follow-up as Waves 4/5; no mechanism forced). Every key resolves; every voice ref resolves to its zip file.

## Manifest (Pack 2 only)

- `pack_sha256` **left EXACTLY as-is**: `93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a`.
- Recomputed `file_hashes` (validator utf8 scheme) for the 4 JSON + 5 images + 36 voice (45 entries; all new):
  - `lessons.json` → `9de3e49d39c94bf9b1a7f1586f6a378398ac53957a9031387792fde628b207a1`
  - `skills.json` → `ee47c825178b9ba2850ead289f4113a5e1d365aacf6a68fef41c57ae7c86b614`
  - `picture_sets.json` → `6ec51a5bd152646e2d60fb54902300770b9aeac71ef72c11c65a8fa5da67d758`
  - `strings.json` → `1c3dcbbcdab3af645a5746773c2910cb7fef1b050409f34232b704ff61d6ecd7`
  - 5 images + 36 voice files → recorded (all also match the delivery zip's raw-byte sha256s).
- 430 total entries.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (all 6 synthetic profiles produce different queues)
- validator all-packs — **0 errors** (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `lesson-selection-drill` PASS · `mission-offer-drill` PASS · `l6-evidence-drill` PASS · `engine-groups-rows-drill` PASS · `engine-evidence-drill` PASS · `w3-evidence-drill` PASS · `pack-activation-drill` PASS · `w2-l5-wiring-drill` PASS · `notice-title-fix-drill` PASS · `w4-wiring-drill` PASS · `w5-wiring-drill` PASS
- `node dev-harness/w6-wiring-drill.js` — **ALL WAVE 6 WIRING CHECKS PASSED**

**Drill regression fixes (2, within the prompt's "drills" scope):** `notice-title-fix-drill` (its node-count assertion now allows later waves to add nodes — still asserts only `notice-with-choices` differs among snapshot nodes); `w5-wiring-drill` (pre-existing-step snapshot pinned to the explicit pre-W5 lesson list so it stays wave-relative, and its FINALE-count check relaxed from `== 28` to `>= 28`).

## What did NOT change

- **Pack 1** — no record, string, or asset change (`git diff -- packs/sunny-home-garden/` empty; the sun is a read + a new Pack 2 file).
- **`packs/active.json`** — untouched.
- **Pre-existing steps** — byte-unchanged (**118 steps at HEAD 8f3b314**, verified from the repo; drill snapshot hash `4f710f30…`).
- **FinaleNarrator mounts** — unchanged from Wave 4 (phone = 1, tablet = 1).
- **catch_up edges** — unchanged (`what-do-you-see.catch_up` = `notice-with-choices`; `what-will-happen-if.catch_up` = `what-do-you-see`).
- `pack_sha256`, Pack 2 `version`/`status`/`dependencies`, and `what-do-you-see.next_skills` in skills.json — unchanged.

## DoD (founder phone test — REQUIRED)

Play all 3 lessons end to end on the live pointer (steps + finale each): confirm the sort texture contrast (the two baskets share one wicker colour; only contents differ), confirm predict's binary choices with celebrations narrating outcomes, confirm explain's paired two-try steps and recognition wording, and confirm the finale find-prompts speak automatically on the phone (Wave 4 fix still holding — no tap on the listen element). The wave counts as landed only after that test passes.
