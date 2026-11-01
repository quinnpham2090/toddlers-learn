# Wave 5 wiring report — 4 language lessons, 3 skills, 12 images, 48 voice lines — 2026-11-01

## HEAD gate

- HEAD at start: **`ed33e3d`** ("Wire Wave 4: 5 maths lessons, 4 new skills, 4 images, 60 voice") — matches the prompt gate.
- `git pull --ff-only`: Already up to date. Tree clean apart from the known untracked strays (`AUDIT-REPORT.md`, `pack2-assets.zip`, `wave4-assets.zip`, `wave5-assets.zip`). `wave8-assets.zip` was not present at the repo root.
- `packs/active.json` = `sunny-home-garden-2` (Pack 2 live) — untouched.
- `wave5-assets.zip` present; `unzip -t` zero errors; contents = 12 JPGs (letter-B/C/D/F/H/S/P/G/L/W, duck, cow) + 48 MP3s (12 per lesson) + `images/image-manifest.json`, `voice/voice-manifest.csv`, `voice/voice-manifest.json`, `wave5-asset-manifest.json`.

## Files created / changed

| File | Change |
| --- | --- |
| `packs/sunny-home-garden-2/lessons.json` | +4 lessons (20 steps) |
| `packs/sunny-home-garden-2/skills.json` | +3 skills; `which-starts-with.next_skills` → `[notice-with-choices, letter-names]` |
| `packs/sunny-home-garden-2/picture_sets.json` | +`letter-tiles-set` (10) + `animal-words-set` (6) |
| `packs/sunny-home-garden-2/strings.json` | +92 strings |
| `packs/sunny-home-garden-2/manifest.json` | 64 `file_hashes` entries updated/added; `pack_sha256` unchanged; dependencies unchanged |
| `packs/sunny-home-garden-2/assets/letter-{b,c,d,f,h,s,p,g,l,w}.jpg` | 10 new letter tiles (from zip) |
| `packs/sunny-home-garden-2/assets/{duck,cow}.jpg` | 2 new animal images (from zip) |
| `packs/sunny-home-garden-2/assets/voice/puff/lesson_{letter_names_1,letter_names_2,first_letter_sounds,animal_words}_*.mp3` | 48 new voice files |
| `app/session.tsx` | +4 `FINALE_CONFIG` entries only (FinaleNarrator mounts untouched) |
| `lib/pack-loader.ts` | 60 static imports + 48 voice-registry keys + 12 asset-registry keys |
| `dev-harness/w5-wiring-drill.js` | new drill |
| `dev-harness/{engine-evidence,w2-l5-wiring,w4-wiring}-drill.js` | regression fixes (below) |
| `docs/agent-reports/wave5-wiring-report.md` | this report |

**Diff scope = exactly the stated code diff** (`lib/pack-loader.ts` + `app/session.tsx` (4 FINALE entries only) + drills + report) and the stated data diff (Pack 2 JSON + assets). Pack 1 EMPTY; `active.json` untouched. No `tools/validator.js` change was needed this wave.

## Lessons wired (all guide Puff, 3–4, tap_choice, 5/5 min, `song_template_id`/`mission_id`/`routine_id` null, scaffolds mirroring `lesson-first-sounds`)

- **W5-L1 `lesson-letter-names-1`** — primary `letter-names`; set `letter-tiles-set`; fallback `lesson-first-sounds` / `first-sounds-set`. C/B/D/F/H, each a target once.
- **W5-L2 `lesson-letter-names-2`** — primary `letter-names` (consolidation, no new skill); same set (other 5 tiles); fallback `lesson-letter-names-1` / `letter-tiles-set`. S/P/W/G/L.
- **W5-L3 `lesson-first-letter-sounds`** — primary `letter-sounds`; reuses `letter-tiles-set`; fallback `lesson-letter-names-2` / `letter-tiles-set`. Exactly 3 sounds ("buh", "kuh", "fuh"); steps 4–5 generalise with new words (book→buh, cup→kuh).
- **W5-L4 `lesson-animal-words`** — primary `animal-words`; set `animal-words-set`; fallback `lesson-first-letter-sounds` / `letter-tiles-set`. cat, dog (known) → duck (new) → frog (known) → cow (new); new animals appear only as targets.

**Letter discipline (drill-verified):** L1/L2/L3 choices are letter tiles ONLY (no word picture among choices); each letter a target once per letter-names lesson; no letter drill / spelled-out word / blending / segmenting; **no L3 line speaks a letter name** (no standalone uppercase letter token in any L3 prompt/celebration/closing/find-prompt; all L3 lines use the sounds only).

## ⚠️ Schema normalisation applied (reported)

Two Pack-2 schema rules forced lowercase where the prompt wrote uppercase:

1. **Item ids must be lowercase kebab slugs** (`SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`). The prompt's `letter-C` etc. failed `P-SCHEMA-ITEM-ID`. Item ids are wired as **`letter-c` … `letter-w`** (used in lessons and FINALE_CONFIG). Report, not silent.
2. **Asset paths must be lowercase** (`ASSET_EXT_RE = /^assets\/[a-z0-9/_-]+\.(svg|png|webp|jpg|jpeg)$/`). The zip's `letter-B.jpg` failed `P-MEDIA-ITEM-EXT`, so the 10 tiles were placed as **`assets/letter-b.jpg` … `letter-w.jpg`** (contents unchanged; raw sha256 still matches the zip). The uppercase letter remains unambiguous in the item id / label.

## Skills

| Skill | Description | Prereq | Next | Evidence |
| --- | --- | --- | --- | --- |
| `letter-names` | "Find the first letter of a known word, by its letter name" | `which-starts-with` | `letter-sounds` | 3 |
| `letter-sounds` | "Find the letter that makes a heard first sound in a known word" | `letter-names` | `[]` | 3 |
| `animal-words` | "Name new animal words, inside the animal set the child already knows" | **`point-to-choice` (fallback — see below)** | `[]` | 3 |

All domain language, `is_entry_skill` false, `age_band_min` 3-4. `which-starts-with.next_skills` → `[notice-with-choices, letter-names]` (branch; the notice path still reachable). Validator `P-SCHEMA-SKILL-UNREACHABLE` passes. No Wave 8 edge (`animal-words → food-words`) added.

### CROSS-PACK PREREQUISITE — resolved to the FALLBACK and reported

- `everyday-object-words` lives in **Pack 1** only and is not in Pack 2's `dependencies`.
- **Finding:** a Pack 2 skill record **may** declare a prerequisite resolving to a Pack 1 skill, but **only if** that id is added to Pack 2's `manifest.dependencies` (`P-REF-DANGLING-SKILL` is skipped for declared deps). Even then, the validator's reachability check (`P-SCHEMA-SKILL-UNREACHABLE`) walks the **in-pack** graph only, so `animal-words` — whose only incoming edge would be the cross-pack prerequisite — remains **unreachable** and the pack fails. So the cross-pack prerequisite is **rejected** in practice.
- **Resolution used:** the spec's named fallback — prerequisite **`point-to-choice`** (Pack 2, wired, reachable). No manifest dependency added; `everyday-object-words` is referenced by no Pack 2 record (drill-verified). Content unchanged.

## Sets

- **`letter-tiles-set` NEW** — exactly 10 items (`letter-b … letter-w`), one set record referenced by L1 (5 tiles), L2 (the other 5) and L3 (6 across both halves). Validates.
- **`animal-words-set` NEW** — exactly 6 items: `duck`, `cow` (2 new JPGs) + `cat`, `dog`, `frog`, `bear`. **Reuse rule used: COPY** — the 4 reuse records are copied verbatim from `first-sounds-set` (same `asset_path`/`asset_sha256`); the assets are already manifest-hashed in Pack 2, so no new copies and no new images. Bank clears the 6+ rule exactly.
- **W5-L3** reuses `letter-tiles-set` — no new set, no new images.
- **Adventure-asset rule (pig/fox) — confirmed + reported:** lesson picture-set items are validated against the **pack's own** assets (`P-MEDIA-ASSET-MISSING`). Pack 2 holds no `adv_pig.jpg`/`adv_fox.jpg` (they exist only in Pack 1), so a lesson set **may not** reference adventure-only assets. **pig/fox stay OUT** (no pig/fox asset and no pig/fox set entry in Pack 2) — the specced bank, unchanged.

## Voice (48 placed; 0 labels; retry cue absent)

- All 48 zip MP3s placed as `assets/voice/puff/lesson_<snake>_step_N_prompt.mp3`, `..._step_N_celebration.mp3`, `..._closing_win.mp3`, `..._find_prompt.mp3`, each wired via a static import + `PACK_VOICE_REGISTRY['sunny-home-garden-2'].puff` key. Every file's raw-byte sha256 matches `wave5-asset-manifest.json`; every `manifest.file_hashes` entry matches the validator utf8 scheme.

**Conditional findings (confirmed, not invented):**

- **(a) letter-name word-alone labels:** the zip holds **base lines only** (n01–n12) — **no** letter label files exist to place → **0**.
- **(b) sound-alone labels:** **0** (no label files in the zip).
- **(c) animal word-alone labels:** **0** (no label files in the zip; bear excluded anyway as distractor-only).
- **(d) Puff retry cue ("Try again — let us look together!"):** **re-confirmed absent** — no such file in Pack 2 `assets/voice/{puff,moss}` and no such key in the loader registry. The retry cue stays **banner text only** (Wave 3/4 convention). Not a blocker; flagged for the phone test.
- **Finale find-prompt reuse: 0** — all four finale find-prompts differ in text, so no reuse deduction applies. Base placed count = **48**.

## FINALE_CONFIG (session.tsx — 4 entries only)

Appended after `lesson-copy-abc-pattern`; shape = target + tiles + `findPromptRef` = `lesson.<snake>.find_prompt`. Targets equal each lesson's step-5 target; every tile appears in its lesson's steps (drill-verified). **FinaleNarrator mounts untouched** (Wave 4 fix intact — drill-verified tablet = 1, phone = 1).

## Strings

Added following the wired Wave 4 key conventions: `lesson.<snake>.title`, `.step_N.prompt`, `.step_N.celebration`, `.closing_win`, `.find_prompt`, plus `skill.<name>.title/.description`, `item.<name>.label/.alt_parent` (10 letters + duck + cow), and `picture_set.<name>.title/.alt_parent` (2 sets). Parent-map "next up" wordings added as strings only under `lesson.<snake>.parent_map_next_up` — **no `lib/path-graph.js` change**; the node gap is the same reported follow-up shared with Wave 4 (the parent map reads path-node `title_ref`, and this wave adds no nodes). Every key resolves; every voice ref resolves to its zip file. Key scheme reported: `lesson.<snake>.*` with snake = lesson id minus `lesson-`, `-`→`_`.

## Manifest (Pack 2 only)

- `pack_sha256` **left EXACTLY as-is**: `93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a`.
- `dependencies` **unchanged** (no cross-pack prerequisite added — fallback used).
- Recomputed `file_hashes` (validator utf8 scheme) for the 4 JSON + 12 images + 48 voice (64 entries):
  - `lessons.json` → `41fd45597445c5bda390b0c68a532402fd9cd2292ba51e96f2d84dd8e2ca00e1`
  - `skills.json` → `1476a1508e0500e2b927e5b9b00d8b1186151624a83a50fca87448aa80398a21`
  - `picture_sets.json` → `2b7ad7ec6fc19c0453aa819ad0ee4785d05cc254d4a801f3f4a7b462e5be90eb`
  - `strings.json` → `b204af851ce6ebd0e75be5ed03029a02cb06b741bc37c33a38809e949c70a907`
  - 12 images + 48 voice files → recorded (all also match the delivery zip's raw-byte sha256s).
- 389 total entries.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (all 6 synthetic profiles produce different queues)
- validator all-packs — **0 errors** (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `lesson-selection-drill` PASS · `mission-offer-drill` PASS · `l6-evidence-drill` PASS · `engine-groups-rows-drill` PASS · `engine-evidence-drill` PASS · `w3-evidence-drill` PASS · `pack-activation-drill` PASS · `w2-l5-wiring-drill` PASS · `notice-title-fix-drill` PASS · `w4-wiring-drill` PASS
- `node dev-harness/w5-wiring-drill.js` — **ALL WAVE 5 WIRING CHECKS PASSED**

**Drill regression fixes (3, within the prompt's "drills" scope):** `engine-evidence-drill` (expected per-step-evidence set now includes the 4 W5 lessons); `w2-l5-wiring-drill` (its `which-starts-with.next_skills` assertion now accepts the W5 `letter-names` branch); `w4-wiring-drill` (its pre-existing-step snapshot pinned to the explicit pre-W4 lesson list so it stays wave-relative, and its FINALE-count check relaxed from `== 24` to `>= 24`).

## What did NOT change

- **Pack 1** — no record, string, or asset change (`git diff -- packs/sunny-home-garden/` empty).
- **`packs/active.json`** — untouched.
- **Pre-existing steps** — byte-unchanged (**98 steps at HEAD ed33e3d**, verified from the repo; drill snapshot hash `5f85958e…`).
- **FinaleNarrator mounts** — unchanged from Wave 4 (phone = 1, tablet = 1).
- **`lib/path-graph.js`** — untouched. `pack_sha256`, Pack 2 `version`/`status`/`dependencies` — unchanged.

## DoD (founder phone test — REQUIRED)

Play all 4 lessons end to end on the live pointer (steps + finale each): confirm the letter tiles render (uppercase letter alone; G/C distinct, B/D/P distinct), confirm L3 speaks sounds only (no letter names), confirm the animal pictures are single animals with no pig/fox, and confirm the finale find-prompts speak automatically on the phone (Wave 4 fix still holding — no tap on the listen element). The wave counts as landed only after that test passes.
