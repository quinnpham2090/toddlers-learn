# Pack 2 mission inventory port — report (2026-10-31)

Commit: the single commit that adds this file — `git log --oneline -1`.
Message: `Port Pack 1 mission + routine inventory into live Pack 2 (records, strings, pictures, songs)`

Pack 2 (`sunny-home-garden-2`, **LIVE**) now carries the mission inventory the interleaving build
needs. Everything added is a **verbatim copy** from Pack 1 — no new copy, art, voice, or records; no
code changes.

## Files created / changed (Pack 2 only)

| File | Change |
| --- | --- |
| `packs/sunny-home-garden-2/missions.json` | 3 records copied verbatim (`mission-tidy-team`, `mission-table-helpers`, `mission-water-plants`) |
| `packs/sunny-home-garden-2/routines.json` | 1 record copied verbatim (`routine-goodnight-garden`) |
| `packs/sunny-home-garden-2/strings.json` | 96 keys added verbatim (full closure below) |
| `packs/sunny-home-garden-2/picture_sets.json` | `home-things-set` copied verbatim (23 items) — Pack 2 already had 10 sets, none of them this one |
| `packs/sunny-home-garden-2/song_templates.json` | 2 templates copied verbatim (`our-colour-song`, `our-goodnight-song`) |
| `packs/sunny-home-garden-2/manifest.json` | **23 `file_hashes` entries added only** |
| `packs/sunny-home-garden-2/assets/*.jpg` | **23 asset files copied** (same filenames) |

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS (`ALL PHASE 0 CHECKS PASSED`)
- `node tools/path-divergence-test.js` — PASS (6 distinct queues)
- validator all-packs — **0 errors** (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `node dev-harness/lesson-selection-drill.js` — PASS

## Closure proof

### The 4 records (verbatim, incl. `status: "draft"`, `notes_author` DRAFT text, and `pack-1` provenance tags)
`mission-tidy-team` (skill `sorting-one-rule`) · `mission-table-helpers` (skill `sizes-big-little`) ·
`mission-water-plants` (skill `sizes-big-little`) · `routine-goodnight-garden` (skill
`sizes-big-little`). No field promoted, rewritten, or "fixed".

### Copied string keys — **96 total** (verbatim values; collision check: **none**; 0 already present)

| Group | Count | Keys |
| --- | --- | --- |
| `item.*` (23 items × label + alt_parent) | 46 | `item.<object>.label` + `item.<object>.alt_parent` for laundry_basket, cardboard_box, flat_towel, soft_toy, book_stack, clean_socks, plastic_plate, paper_plate, placemat, plastic_cup, paper_cup, cloth_napkin, paper_towel_sheet, tea_towel, watering_can, damp_cloth, indoor_plant, outdoor_plant, night_lamp, closed_curtains, quiet_book, song_time_card, helping_hands |
| `mission.tidy_team.*` | 9 | title, parent_script, child_prompt, team_goal, return_ritual, precheck, safety_1..3 |
| `mission.table_helpers.*` | 10 | as above + safety_4 |
| `mission.water_plants.*` | 9 | as above (safety_1..3) |
| `routine.goodnight_garden.*` | 6 | title, parent_script, child_prompt, team_goal, return_ritual, safety_1 |
| `picture_set.home_things.*` | 2 | title, alt_parent |
| `song.our_colour_song.*` / `song.our_goodnight_song.*` | 2 + 2 | title, lesson_word each |
| `song.wordlist.*` | 10 | colour_red/yellow/blue/green + object_cup/spoon/book/ball/sock/leaf |

Every key was verified present in Pack 1 strings with a value, and **no key already existed in Pack 2
with a different value** (the prompt's collision STOP condition did not fire).

### Pictures — `home-things-set` + 23 assets
- Set copied verbatim (set `title_ref`/`alt_text_parent_ref` + per-item `label_ref`/
  `alt_text_parent_ref` included in the 96 keys above).
- **All 23 `.jpg` files copied**; each copy verified **byte-identical** to Pack 1 (utf8-content
  sha256) **and** equal to the item's `asset_sha256` in the copied set.
- The mission/routine objects reference exactly 23 distinct picture ids
  (`laundry-basket … helping-hands`); all 23 exist in the copied set (verified).
- **Runtime picture lookup confirmed (static):** `app/mission.tsx:35-43` `pictureItemsById()` builds
  its map from `getPictureSets()` — **all sets of the ACTIVE pack** — and the mission objects resolve
  by item id (`alternative_object_id` / `fallback_body_action_id`). With Pack 2 live, the copied set
  supplies all 23 ids, so resolution succeeds. No second picture mechanism was invented.

### Songs — 2 templates in-pack
- `our-colour-song` and `our-goodnight-song` copied verbatim into Pack 2's previously empty
  `song_templates.json` (note-pattern records; no audio files).
- Closed refs: `title_ref` + `lesson_word_ref` (2 each) and `wordlists.adjective_refs` (4) +
  `wordlists.noun_refs` (6) — all 14 in the 96 keys above.
- **No record copy needed beyond the templates:** `pentatonic_set_id` (`c_major_pentatonic`) and
  `completion_rule_id` (`resolve_to_tonic`) are **code constants** (`lib/song-completion.ts`,
  `lib/pack-loader.ts:542/565` + `packs/schema/song_template.json` enums), not pack records.
- **Runtime song lookup confirmed (static):** `getSongTemplates()` = `getActivePack().songTemplates`
  (`lib/pack-loader.ts`), so the templates now resolve in the live pack. The mission/routine screens
  themselves never read `song_id` (verified: no `song_id` usage in `app/`), so the templates matter
  for the songbook/composer and for the validator. **No manifest-dep shortcut was used for songs.**

### Skill resolution — `sizes-big-little` via the existing dep
Pack 2's manifest already listed `sizes-big-little` in `dependencies`, and the validator resolves the
two `sizes-big-little` mission/routine `skill_id` refs through it — **validator all-packs = 0
errors** (evidence: the Pack 2 `PASS (0 errors)` line above). No new Pack 2 skill record was authored
(that would touch the path graph). `sorting-one-rule` already existed in Pack 2 skills.

### Manifest diff — `file_hashes` additions ONLY
- **23 entries added** (`assets/laundry-basket.jpg` … `assets/helping-hands.jpg`), total now 250.
- `version` (`0.1.0`), `status` (`draft`), `dependencies`, and `notes_author` **unchanged** — verified
  programmatically (the manifest minus `file_hashes` is byte-identical before/after).

## Notes

- **`pack_sha256` left as-is** (`93e65df5…`) per the prompt's "file_hashes additions ONLY" and "the
  manifest diff (file_hashes additions ONLY)". Consequence, stated plainly: the manifest's
  `pack_sha256` — and the live pointer's `active_pack_sha256` — are now **stale relative to the added
  `file_hashes`**. The validator only format-checks `pack_sha256`, and the pointer hash is
  informational (established at activation), so nothing breaks; a follow-up should recompute both.
- `name_wordlist_id: "colour-object-wordlist"` appears only in the song templates — not a pack
  record, not validated, not read at runtime. Pack 1 ships it the same way, so this is **not a new
  gap**; copied verbatim.
- The hub's Together lane gating is unchanged; this run is data-only.

## Confirmations

- **Pack 1 untouched** (`git diff -- packs/sunny-home-garden/` empty).
- **No code changed** — `git diff` touches only Pack 2 JSON + the 23 new assets.
- No record promoted (all stay `draft`), no record or copy invented; no dependencies changed; no
  version bump.
- `packs/active.json` **untouched** (still `sunny-home-garden-2`).
- Staging removed; nothing committed except this run's files.

## DoD — founder phone test on the LIVE pointer

Open the Together lane (after the M4 unlock): the **3 missions + 1 routine** are listed → open a
mission → briefing, pre-check, pictures and song all render → return ritual lands back on the path →
**no band or queue movement** (check the parent map). The interleaving build is a **separate next
run**.
