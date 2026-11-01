# Wave 7 wiring report — NEW Pack 3 (sunny-home-garden-3): 6 lessons, 6 skills, 12 images + copies, 72 voice — 2026-11-01

## HEAD gate

- HEAD at start: **`c55208b`** ("Wire Wave 8: 2 vocabulary lessons, 2 new skills, 7 images, 24 voice") — matches the prompt gate.
- `git pull --ff-only`: Already up to date. Tree clean apart from the known untracked strays (`AUDIT-REPORT.md`, `pack2-assets.zip`, `wave4/5/6/7/8-assets.zip`).
- `packs/active.json` = **`sunny-home-garden-2`** (Pack 2 stays live) — untouched, verified after a local test-switch (below).
- `wave7-assets.zip` present; `unzip -t` zero errors; contents = 36 JPGs (10 numeral tiles, 2 ribbons, 24 copies) + 72 MP3s + `images/image-manifest.json`, `voice/voice-manifest.csv`, `voice/voice-manifest.json`, `wave7-asset-manifest.json`.
- **F7 sequencing gate:** Pack 2 has `cardinality` + `more-less` skills and `letter-tiles-set` with all 10 tiles (B/C/D/F/H/S/P/W/G/L) — **pass**.
- **F6 gate:** every letter W7-L5 uses (G, D, B, F, C, L, S, P, H) is in Pack 2's `letter-tiles-set` — **pass**.

## ⚠️ Precedent-driven addition beyond the zip (reported, not silent)

The zip supplies 36 JPGs, but a verbatim Pack 3 also needs **4 more Pack 2 copies** (byte-identical) that the zip does not carry — required by the copied records, not by this run's choice:

1. **`red-flower.jpg` + `yellow-flower.jpg`** — `counting-groups-set` is copied **verbatim** from Pack 2, and that set's `red-flower-1..4` / `yellow-flower-1..4` items reference those assets; the validator's `P-MEDIA-ASSET-MISSING` requires them in-pack.
2. **`puff-portrait.jpg` + `moss-portrait.jpg`** — `characters.json` requires `model_asset_path`, and the Pack 2 creation precedent (commit `22eadec`) shipped both portraits.

Pack 3 therefore holds **40 images** (36 zip + 4 Pack 2 copies) + 72 voice files = 112 assets. The prompt's "24 copies" figure describes the zip's copy JPGs; these 4 are additional. Reported per "Report any place where the precedent does not fit Pack 3".

## Files created / changed

| File | Change |
| --- | --- |
| `packs/sunny-home-garden-3/manifest.json` | NEW — Pack 3 manifest (v0.1.0 draft, band 4-5) |
| `packs/sunny-home-garden-3/lessons.json` | NEW — 6 lessons / 30 steps |
| `packs/sunny-home-garden-3/skills.json` | NEW — copy of Pack 2's skills + 6 new records + 3 branch edges |
| `packs/sunny-home-garden-3/picture_sets.json` | NEW — 5 sets (numeral-tiles 10, blending-words 12, measurement 6, letter-tiles 10, counting-groups 25) |
| `packs/sunny-home-garden-3/strings.json` | NEW — copy of Pack 2's strings + 135 W7 strings |
| `packs/sunny-home-garden-3/characters.json` | NEW — puff + moss (pack-3 tags, world_home_id sunny-home-garden-3) |
| `packs/sunny-home-garden-3/{missions,routines,saved_songs,song_templates,time_concepts}.json` | NEW — `[]` (Pack 2 creation precedent) |
| `packs/sunny-home-garden-3/assets/…` | 40 JPGs + 72 MP3s (36 zip + 4 Pack 2 copies) |
| `lib/pack-loader.ts` | Pack 3 JSON imports + `PACK_REGISTRY` entry + 40 asset-registry keys + 72 voice-registry keys |
| `lib/path-graph.js` | 6 NEW nodes (attachment applied); no existing node rewritten |
| `app/session.tsx` | +6 `FINALE_CONFIG` entries only (FinaleNarrator mounts untouched) |
| `dev-harness/w7-wiring-drill.js` | NEW drill |
| `dev-harness/{w4,w5,w6,w8}-wiring-drill.js` | regression fixes (below) |
| `docs/agent-reports/wave7-wiring-report.md` | this report |

**Diff scope = the stated scope:** Pack 3 files + loader + session FINALE entries (6) + path-graph (6 nodes) + drills + report. **Pack 1 diff EMPTY. Pack 2 diff EMPTY. `packs/active.json` untouched** (all three git-verified in the drill).

## Lessons wired (all `tap_choice`, band 4-5, 5/5 min, `song_template_id`/`mission_id`/`routine_id` null, primary-only evidence)

| Lesson | Guide | Set | Primary | Fallback (lesson / set) |
| --- | --- | --- | --- | --- |
| `lesson-number-symbols-1-3` | Moss | numeral-tiles-set | number-symbols-1-3 | lesson-how-many / numeral-tiles-set |
| `lesson-number-symbols-1-10` | Moss | numeral-tiles-set | number-symbols-1-10 | lesson-number-symbols-1-3 / numeral-tiles-set |
| `lesson-add-take-away` | Moss | counting-groups-set | operations-with-objects | lesson-how-many / counting-groups-set |
| `lesson-onset-rime-blending` | Puff | blending-words-set | onset-rime-blending | lesson-first-sounds / blending-words-set |
| `lesson-final-sounds` | Puff | letter-tiles-set | final-sounds | lesson-onset-rime-blending / letter-tiles-set |
| `lesson-measurement-compare` | Moss | measurement-set | measurement-comparison | lesson-more-or-less / measurement-set |

Every step bands its lesson's primary skill only (`evidence_skill_ids` omitted, `evidence_participation` absent — drill-verified). One-correct per step: 30/30. Digits are words in every voice line; numerals appear only as pictures.

## Skills (6 NEW, band 4-5, `is_entry_skill` false, `evidence_needed_to_advance` 3)

| Skill | Title (parent-map wording) | Prereq | Next | Domain | min_age |
| --- | --- | --- | --- | --- | --- |
| number-symbols-1-3 | "Match numerals 1, 2, 3 to groups" | cardinality | [number-symbols-1-10] | maths | 4 |
| number-symbols-1-10 | "Match numerals 1 to 10 to groups" | number-symbols-1-3 | [] | maths | 5 |
| operations-with-objects | "Add and take away with objects in stories" | cardinality | [] | maths | 5 |
| onset-rime-blending | "Blend an onset and a rime into a word" | which-starts-with | [final-sounds] | language | 5 |
| final-sounds | "Find the letter for the last sound in a known word" | onset-rime-blending | [] | language | 5 |
| measurement-comparison | "Compare longer/shorter and heavier/lighter" | more-less | [] | maths | 5 |

**Edges applied inside Pack 3's `skills.json` only** (Pack 2 diff empty): `cardinality.next` → `[more-less, number-symbols-1-3, operations-with-objects]`; `which-starts-with.next` → `[notice-with-choices, letter-names, onset-rime-blending]`; `more-less.next` → `[shape-names, measurement-comparison]`. Reachability: cardinality → symbols-1-3 → symbols-1-10; cardinality → operations-with-objects; which-starts-with → blending → final-sounds; more-less → measurement-comparison (validator `P-SCHEMA-SKILL-UNREACHABLE` passes for Pack 3). No Pack 2 file was touched to satisfy any edge.

## Sets

- `numeral-tiles-set` — 10 items (`numeral-1 … numeral-10`, deep-blue numeral-alone tiles).
- `blending-words-set` — 12 items (cat, hat, dog, frog, moon, star, car, bee, tree, spoon, book, ball; Pack 2 set-record items copied, 0 new art).
- `measurement-set` — 6 items (long-ribbon, short-ribbon new + spoon, cup, book, green-leaf reuse).
- `letter-tiles-set` — Pack 2's record copied verbatim (10 items, lowercase ids/paths).
- `counting-groups-set` — Pack 2's record copied verbatim (24 items) + `cup-5` on the existing cup picture (count 5) = 25.
- All Pack 3 item ids are lowercase kebab slugs and all asset paths lowercase (drill-verified).

## Path-graph (`lib/path-graph.js`)

6 NEW nodes (`domain`, `min_age`, `entry: false`, `provisional: false`, `title_ref adventure.skill.<snake>.title`, `next` per the table, `lesson_skill_ids` + `playable_lesson_skill_id` **attached** — the Wave 6 attachment pattern). No science node touched; no existing node's `next` array rewritten.

**KNOWN DRIFT (reported, not fixed):** the existing `which-starts-with` path-graph node's `next` is **stale** — it points at `initial-sound-matching`, not at the live skills.json edges (`[notice-with-choices, letter-names, onset-rime-blending]`). Confirmed at wiring: `{"id":"which-starts-with","domain":"language","next":["initial-sound-matching"],"lesson_skill_ids":[],"playable_lesson_skill_id":null}`. **How Pack 3's queue reaches the 6 new nodes:** the engine enumerates `PATH_GRAPH` directly — the breadth filler (`lib/path-queue-engine.js:94`) and the ≥3-domain top-up (`:208`) — and resolves each node's lesson via `playable_lesson_skill_id` (`:20-31`) against the **active** pack's lessons; entry nodes come only from `PATH_ENTRY_SKILL_IDS` (`['point-to','sort-by-one-rule']`, Pack 1). So when Pack 3 is active the 6 nodes resolve to the 6 Pack-3 lessons via breadth/top-up, not via the stale `which-starts-with.next` (which only affects the advancement branch).

## Voice (72 placed; conditionals)

All 72 zip MP3s placed as `assets/voice/{moss,puff}/lesson_<snake>_step_N_{prompt,celebration}.mp3`, `_closing_win`, `_find_prompt` (Moss: L1/L2/L3/L6 = 48; Puff: L4/L5 = 24), each wired via a static import + `PACK_VOICE_REGISTRY['sunny-home-garden-3']` key. Every file's raw-byte sha256 matches the zip manifests; every `manifest.file_hashes` entry matches the validator utf8 scheme.

- **(a) W7-L6 n01/n05** ("Which is longer?") — **distinct recordings** in the zip (`15032bef…` vs `44202b13…`) → **both placed; base stays 72** (the −1 reuse case does not apply).
- **(b) numeral-tile (+10) and ribbon (+2) word-alone labels:** the zip holds **base lines only** — **0** label audio files to place (device TTS fallback, Wave 3 convention).
- **(c) retry cue ("Try again — let us look together!"):** **absent** in Pack 3 `assets/voice/{moss,puff}` and the loader registry (Wave 4/6 conditional, still unresolved). Retry cue stays banner text only. Flagged for the phone test; no audio generated.
- **(d) finale find-prompt reuse: 0** — all six find-prompts are new texts. **Base placed 72.**

## FINALE_CONFIG (session.tsx — 6 entries only)

Appended after `lesson-vehicle-words`; shape = target + tiles + `findPromptRef = lesson.<snake>.find_prompt`. Targets equal each lesson's step-5 target; every tile appears in its lesson's steps (drill-verified). **FinaleNarrator mounts untouched** (Wave 4 fix intact — drill-verified tablet = 1, phone = 1).

## Manifest + pack_sha256

- Recomputed `file_hashes` for the 10 Pack 3 JSON files + 40 images + 72 voice (122 entries; all new):
  - `lessons.json` → `d7c42cfb5d126dddab6ee68c526d570b47050d366a919ea168a055b11d15154d`
  - `skills.json` → `9211d3337dab63043057303586054afa1b3b66fe71be91cb31cb163bede44806`
  - `picture_sets.json` → `b9671514aa703ed99cf52473447e790e39b1e8898c88eb26c89f1a2fede4a50f`
  - `strings.json` → `020ec4647d3f46f21f4541aae72b23e4b86c670cf85cfc036de7e9baeb3b1dba`
  - `characters.json` → `aea602de8506015c2b58a9f2c73c5c0ee8e9cfea06c32b3d3d56e95b69f78af0`
  - 40 images + 72 voice → recorded (zip-provided files also match the delivery zip's raw-byte sha256s).
- **`pack_sha256` value: `917e390b2a0a33d916199a134c32e049c0bfd68cd93424ac4cd2b367551fda64`.**
  - **Derivation (Pack 2 creation precedent, verified):** `dev-harness/pack1-author.js` computes `sha256(file_hashes entries joined as "path:hash" lines)`. I confirmed this reproduces Pack 2's creation-time value exactly (`git show 22eadec:…` → `10b68b81…` = derive(creation file_hashes)); Pack 2's current value (`93e65df5…`) is stale only because `file_hashes` grew after creation and the field was never recomputed. Pack 3's value is derived the same way from Pack 3's `file_hashes`, and is **not** Pack 2's value.
- `version` 0.1.0, `status` draft (the manifest stays draft even when live), `dependencies` `[colour-naming, sizes-big-little, lesson-how-many, lesson-first-sounds, lesson-more-or-less]` (the cross-pack skills + fallback lessons Pack 3 resolves to).

## Gates

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS (also PASS under a local Pack-3 test-switch)
- `node tools/path-divergence-test.js` — PASS (6/6). **Coverage finding:** the harness hard-codes Pack 1 (`packs/sunny-home-garden/lessons.json` + `adventure.json`) and does **not** read the active pointer, so it is pointer-independent and does not cover Pack 3 either way; a local test-switch was still run (flip → Pack 3, `verify.js` + path-divergence PASS, flip back) and **reverted before commit** (`git diff -- packs/active.json` empty; pointer reads `sunny-home-garden-2`).
- validator all-packs — **0 errors** (core, sunny-home-garden, sunny-home-garden-2, **sunny-home-garden-3**, test-switch)
- `expo-doctor` — **19/20 checks pass**; the single failure is **pre-existing dependency patch drift** (`@expo/ui`, `expo`, `expo-audio`, `expo-router`, `react-native-screens` each one patch behind the SDK's expected range) in `package.json`, which this run must not touch ("No dependency changes"). Reported, not fixed.
- All prior drills PASS (lesson-selection, mission-offer, l6-evidence, engine-groups-rows, engine-evidence, w3-evidence, pack-activation, w2-l5-wiring, notice-title-fix, w4-wiring, w5-wiring, w6-wiring, w8-wiring)
- `node dev-harness/w7-wiring-drill.js` — **ALL WAVE 7 WIRING CHECKS PASSED** (6 lessons / 30 steps; one-correct 30/30; fallbacks resolve; the cardinality → symbols-1-3 → symbols-1-10 chain; all 6 skills reachable; sets 10/12/6/10/25; lowercase ids/paths; 72 voice + 40 images resolve; all 39 FINALE_CONFIG refs resolve under their owning pack; Pack 1 diff EMPTY; Pack 2 diff EMPTY; active.json untouched; FinaleNarrator tablet = 1 phone = 1; Pack 2 steps 143 byte-unchanged; pack_sha256 derived)

**Drill regression fixes (4, within the "drills" scope):** `w4`, `w5`, `w6`, `w8` wiring drills each gained a Pack 3 branch in their "FINALE_CONFIG refs resolve under their owning pack" check (previously any non-Pack-2 lesson was assumed Pack 1, so the 6 new Pack-3 refs were misclassified). No wave-relative step snapshot needed pinning this wave.

## What did NOT change

- **Pack 1** — EMPTY diff. **Pack 2** — EMPTY diff (Pack 3 is a new pack; nothing in Pack 2 was edited). Both git-verified.
- **`packs/active.json`** — untouched (reads `sunny-home-garden-2`).
- **Existing path-graph nodes** — none removed, none rewritten (only 6 appended).
- **Pack 2 pre-existing steps** — byte-unchanged (143 steps at HEAD `c55208b`, drill snapshot hash `e8a72b1e…`).
- **FinaleNarrator mounts** — unchanged from Wave 4 (phone = 1, tablet = 1).
- No dependency changes; no dev server; no Pack 1 edits; no child names; the word "wrong" in no Pack 3 child-facing string.

## DoD (founder phone test — REQUIRED, via TEST-SWITCH)

Pack 3 does **not** count as landed until the founder phone test passes. Because Pack 2 stays live, the test uses the test-switch: flip `packs/active.json` to `sunny-home-garden-3` locally, play all six lessons end to end (steps + finale each), flip back to `sunny-home-garden-2`, and verify the pointer reads Pack 2 afterwards (the committed `active.json` reads `sunny-home-garden-2`). On the phone confirm: numeral tiles read correctly at tile size (especially 6 vs 9, and the two-digit 10); the ribbon pair reads as a pure length cue; blending sounds speak as sounds (never letter names); the final-sounds initial-sound traps behave (the initial letter is present but never the target); and the finale find-prompts speak automatically (Wave 4 fix still holding — no tap on the listen element). Pack 3's ACTIVATION (the F2 switch story) is a separate founder decision and is **not** part of this run.
