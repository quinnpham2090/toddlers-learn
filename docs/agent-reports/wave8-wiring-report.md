# Wave 8 wiring report — 2 vocabulary lessons, 2 skills, 7 images, 24 voice — 2026-11-01

## HEAD gate

- HEAD at start: **`280c22c`** ("Wire Wave 6: 3 science lessons, 3 new skills, 4 images + sun copy, 36 voice") — matches the prompt gate.
- `git pull --ff-only`: Already up to date. Tree clean apart from the known untracked strays (`AUDIT-REPORT.md`, `pack2-assets.zip`, `wave4-assets.zip`, `wave5-assets.zip`, `wave6-assets.zip`, `wave8-assets.zip`).
- `packs/active.json` = `sunny-home-garden-2` (Pack 2 live) — untouched.
- `wave8-assets.zip` present; `unzip -t` zero errors; contents = 7 JPGs (apple, banana, bread, egg, bus, train, bicycle — **no car**) + 24 MP3s (12 per lesson) + manifests.

## Files created / changed

| File | Change |
| --- | --- |
| `packs/sunny-home-garden-2/lessons.json` | +2 lessons (10 steps) |
| `packs/sunny-home-garden-2/skills.json` | +2 language skills; `animal-words.next_skills` `[] → [food-words]` |
| `packs/sunny-home-garden-2/picture_sets.json` | +`food-words-set` (4), `vehicle-words-set` (4) |
| `packs/sunny-home-garden-2/strings.json` | +50 strings |
| `packs/sunny-home-garden-2/manifest.json` | 35 `file_hashes` entries updated/added; `pack_sha256` unchanged |
| `packs/sunny-home-garden-2/assets/{apple,banana,bread,egg,bus,train,bicycle}.jpg` | 7 new images |
| `packs/sunny-home-garden-2/assets/voice/puff/lesson_{food_words,vehicle_words}_*.mp3` | 24 new voice files |
| `app/session.tsx` | +2 `FINALE_CONFIG` entries only (FinaleNarrator mounts untouched) |
| `lib/pack-loader.ts` | 31 static imports + 24 voice-registry keys + 7 asset-registry keys |
| `dev-harness/w8-wiring-drill.js` | new drill |
| `dev-harness/{engine-evidence,w5-wiring,w6-wiring}-drill.js` | regression fixes (below) |
| `docs/agent-reports/wave8-wiring-report.md` | this report |

**Diff scope = the stated code diff** (`lib/pack-loader.ts` + `app/session.tsx` (2 FINALE entries only) + drills + report) and the stated data diff (Pack 2 JSON + assets). **Pack 1 EMPTY; `lib/path-graph.js` UNTOUCHED; `active.json` untouched.**

## Lessons wired (both guide Puff, band 3-4, tap_choice, 5/5 min, `song_template_id`/`mission_id`/`routine_id` null, scaffolds mirroring `lesson-animal-words`)

- **W8-L1 `lesson-food-words`** — "Food Words", primary `food-words`, set `food-words-set`, fallback `lesson-animal-words` / `animal-words-set`. Steps 1–4 introduce apple, banana, bread, egg; step 5 revisits apple with a different distractor pair.
- **W8-L2 `lesson-vehicle-words`** — "Vehicle Words", primary `vehicle-words`, set `vehicle-words-set`, fallback `lesson-food-words` / `food-words-set`. Steps 1–4 introduce car, bus, train, bicycle; step 5 revisits car with a different distractor pair.

**Discipline (drill-verified):** every prompt asks to FIND / TAP the named picture (no "What is this?" naming quiz); one word per picture; **no colour named in any W8 line**; no ladder claim (the vehicle copy carries no "requires food" wording); no person in any vehicle picture (founder's phone test).

## Skills (2 NEW, domain language, band 3-4, status draft, `evidence_needed_to_advance` 3)

| Skill | Description | Prereq | Next |
| --- | --- | --- | --- |
| `food-words` | "Find and name everyday food words: apple, banana, bread, egg" | `animal-words` | `vehicle-words` |
| `vehicle-words` | "Find and name everyday vehicle words: car, bus, train, bicycle" | `food-words` | `[]` (end of core vocabulary arc) |

**⚠️ Wave 5 record edited by this run (reported):** `animal-words.next_skills` `[] → ['food-words']` — the edge the Wave 8 spec explicitly anticipates. Chain for reachability: `point-to-choice → animal-words → food-words → vehicle-words` (validator `P-SCHEMA-SKILL-UNREACHABLE` passes).

## Sets

- **`food-words-set` NEW** — exactly 4 items: `apple`, `banana`, `bread`, `egg` (4 new JPGs).
- **`vehicle-words-set` NEW** — exactly 4 items: `bus`, `train`, `bicycle` (3 new JPGs) + `car`.
- **Bank rule — confirmed via the validator, no padding:** 4-item vocabulary sets **pass** (validator all-packs 0 errors). The Pack 1 hello-cup precedent holds; no 6+ rule applies to vocabulary sets. No filler items added.
- **car copy-vs-registry rule — COPY used (reported):** the `car` item record is copied verbatim from `rhyme-pairs-set` (same `item_id`, `label_ref item.car.label`, `alt_text_parent_ref item.car.alt_parent`, `asset_path assets/car.jpg`, `asset_sha256 511793a7…`); the asset already exists in Pack 2 and is registered in the loader (`assets/car.jpg`). No new car file, no Pack 1 read.
- **Image pre-existence check:** none of the 7 zip JPGs pre-existed in Pack 2 (all untracked before placement); `car.jpg` was the only pre-existing asset.
- No pig/fox; no size/colour items.

## Voice (24 placed; 0 labels; retry cue absent)

- All 24 zip MP3s placed as `assets/voice/puff/lesson_<snake>_step_N_prompt.mp3`, `..._step_N_celebration.mp3`, `..._closing_win.mp3`, `..._find_prompt.mp3`, each wired via a static import + `PACK_VOICE_REGISTRY['sunny-home-garden-2'].puff` key. Every file's raw-byte sha256 matches the zip manifests; every `manifest.file_hashes` entry matches the validator utf8 scheme.

**Conditional findings (confirmed, not invented):**

- **(a) food word-alone labels ("apple","banana","bread","egg") and vehicle word-alone labels ("car","bus","train","bicycle"):** the zip holds **base lines only** — **0** label audio files to place (device TTS fallback, Wave 3 convention). Label **strings** resolve; the two pre-existing sentence-style values were reused (see Strings).
- **(b) Puff retry cue ("Try again — let us look together!"):** **re-confirmed absent** — no such file in Pack 2 `assets/voice/{puff,moss}` and no such key in the loader registry. Retry cue stays **banner text only** (Wave 3/4/5/6 convention). Not a blocker; flagged for the phone test.
- **(c) finale find-prompt reuse: 0** — neither "Let's find the apple together!" nor "Let's find the car together!" matches any pre-existing finale find-prompt (each matches only its own new string). **Base placed count = 24.**

## FINALE_CONFIG (session.tsx — 2 entries only)

Appended after `lesson-why-did-that-happen`; shape = target + tiles + `findPromptRef` = `lesson.<snake>.find_prompt`. Targets equal each lesson's step-5 target; every tile appears in its lesson's steps (drill-verified). **FinaleNarrator mounts untouched** (Wave 4 fix intact — drill-verified tablet = 1, phone = 1).

## Strings

Added following the wired Wave 5 key conventions: `lesson.<snake>.title`, `.step_N.prompt`, `.step_N.celebration`, `.closing_win`, `.find_prompt`, `skill.<name>.title/.description`, `item.<name>.label/.alt_parent`, `picture_set.<name>.title/.alt_parent`, and `lesson.<snake>.parent_map_next_up`. Key scheme: `lesson.<snake>.*` with snake = lesson id minus `lesson-`, `-`→`_`.

- **Label-string note (reported):** `item.banana.label` (="A banana.") and `item.car.label` (="A car.") already existed in Pack 2 (sentence style, referenced by `beats-3-banana` / the rhyme sets); those keys were **reused** (no duplicates) so the new `banana`/`car` items resolve. The newly added labels (`item.apple.label` "Apple", `item.bread.label` "Bread", `item.egg.label` "Egg", `item.bus.label` "Bus", `item.train.label` "Train", `item.bicycle.label` "Bicycle") are word-alone Title Case, following the pack's dominant noun style.
- Parent-map "next up" wordings added as strings only under `lesson.<snake>.parent_map_next_up` — no `lib/path-graph.js` change; the node gap is the same reported follow-up as Waves 4/5/6 (no mechanism forced). Every key resolves; every voice ref resolves to its zip file.

## Manifest (Pack 2 only)

- `pack_sha256` **left EXACTLY as-is**: `93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a`.
- Recomputed `file_hashes` (validator utf8 scheme) for the 4 JSON + 7 images + 24 voice (35 entries; all new):
  - `lessons.json` → `28254135519932c4616c4e14f7c2b5b80d8b21b34b647c6a591346bbb87212ed`
  - `skills.json` → `625683375e47d5d27878a3abfb5026ff3b26a31d2baff13bf87c75e5319f0fbb`
  - `picture_sets.json` → `9e47f201667f31cfa985225fe1fb60744fcde312e0474df3651104a32ed5da36`
  - `strings.json` → `4fed902a00574a7c649d743fccf381ad77cc12dfa58d476b6f214718387a6b81`
  - 7 images + 24 voice files → recorded (all also match the delivery zip's raw-byte sha256s).
- 461 total entries.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (all 6 synthetic profiles produce different queues)
- validator all-packs — **0 errors** (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `lesson-selection-drill` PASS · `mission-offer-drill` PASS · `l6-evidence-drill` PASS · `engine-groups-rows-drill` PASS · `engine-evidence-drill` PASS · `w3-evidence-drill` PASS · `pack-activation-drill` PASS · `w2-l5-wiring-drill` PASS · `notice-title-fix-drill` PASS · `w4-wiring-drill` PASS · `w5-wiring-drill` PASS · `w6-wiring-drill` PASS
- `node dev-harness/w8-wiring-drill.js` — **ALL WAVE 8 WIRING CHECKS PASSED**

**Drill regression fixes (3, within the prompt's "drills" scope):** `engine-evidence-drill` (expected per-step-evidence set now includes the 2 W8 lessons); `w5-wiring-drill` (its `animal-words.next_skills` assertion now accepts the W8 `food-words` edge); `w6-wiring-drill` (pre-existing-step snapshot pinned to the explicit pre-W6 lesson list so it stays wave-relative).

## What did NOT change

- **Pack 1** — no record, string, or asset change (`git diff -- packs/sunny-home-garden/` empty).
- **`packs/active.json`** — untouched.
- **`lib/path-graph.js`** — untouched (no food-words / vehicle-words nodes; drill-verified).
- **Pre-existing steps** — byte-unchanged (**133 steps at HEAD 280c22c**, verified from the repo; drill snapshot hash `bc768c76…`).
- **FinaleNarrator mounts** — unchanged from Wave 4 (phone = 1, tablet = 1).
- `pack_sha256`, Pack 2 `version`/`status`/`dependencies` — unchanged.

## DoD (founder phone test — REQUIRED)

Play both lessons end to end on the live pointer (steps + finale each): confirm the food pictures are single objects, confirm the vehicle pictures show no person and the car reads as a car at tile size, and confirm the finale find-prompts speak automatically on the phone (Wave 4 fix still holding — no tap on the listen element). The wave counts as landed only after that test passes.
