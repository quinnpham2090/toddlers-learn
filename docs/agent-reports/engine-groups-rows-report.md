# Lesson engine: groups + pattern rows — report (2026-10-31)

Commit: the single commit that adds this file — `git log --oneline -1`.
Message: `Lesson engine: picture-item count groups + LessonStep pattern rows (display only)`

## Files created / changed

- `lib/pack-loader.ts` — types only: `PictureSetItem.count?: number`; `LessonStep.row_item_ids?: string[]`, `LessonStep.row_gap_index?: number`.
- `app/session.tsx` — `PictureChoice` count-aware render; new `PatternRow` component; row state + interaction in `handleChoose`/`handleNext`; fit-math row reserve; styles.
- `tools/validator.js` — five new named rules (below). No existing rule weakened.
- `dev-harness/engine-groups-rows-drill.js` — new proof drill (28 checks).
- `docs/agent-reports/engine-groups-rows-report.md` — this file.

No Pack 1 changes, no Pack 2 lesson/skill/record changes, no adventure changes, no bands/queue changes,
no dependency changes, `packs/active.json` untouched.

## EXACT field contract (handoff for the Wave 3 wiring prompt)

### 1. `PictureSetItem.count?: number` — default `1`
- Semantics: the choice tile renders the item's **single asset `count` times** as a mini-row of
  thumbnails **inside the one tile**. Still ONE item — one `item_id`, one `asset_path`, one
  `asset_sha256` — so there is no duplicate-id / `itemsById` Map collapse.
- `count` absent or `1` → **exactly today's single `<Image style={StyleSheet.absoluteFill}>`** render
  (zero visual change for every existing lesson).
- `count > 1` → wrapping centred row, up to **3 thumbnails per row**, each `floor(92 / min(count,3))%`
  wide with `aspectRatio: 1`, `gap: 4`; the frame keeps `overflow: hidden` and centres them.
- Choice/target semantics **unchanged**: tapping a group tile chooses its `item_id`; matching is by
  item id exactly as today.
- Validator: `count` must be a **positive integer (≥ 1)** when present.

### 2. `LessonStep.row_item_ids?: string[]`
- Ordered item ids forming the pattern row displayed **above the choice tiles, step phase only**.
- Must have **≥ 2** entries; **every entry must resolve to an item in the lesson's `picture_set_id`
  set** (not the pack-wide map).

### 3. `LessonStep.row_gap_index?: number`
- **Copy steps:** the index of the empty slot. Rendered as a hollow neutral slot (`#C4BBA5` outline)
  until the correct tap fills it. The row is the full pattern, i.e. `row_item_ids[row_gap_index]`
  **is** the expected tile and must equal `target_item_id`.
- **Extension steps:** omit `row_gap_index`; the row renders complete and the correct tap **appends**
  the chosen tile at the end.
- Validator: integer within `[0, row_item_ids.length - 1]`; and `row_item_ids[row_gap_index] ===
  target_item_id` (copy) / `target_item_id !== last row tile` (extension).

### Interaction (display only — no evidence change)
- `rowChoice` state is set in `handleChoose` on the **correct** tap, immediately before
  `setPhase('celebration')`, and reset in `handleNext`.
- Copy: the gap slot fills with the row's tile at the gap index (which equals the target).
- Extension: the row appends the chosen tile.
- Celebration → advance timing, the 900 ms pause, the fallback timer, and the finale phase are
  **untouched**. Wrong tap = gentle retry only; the row does not change.
- Evidence is **unchanged**: one `recordStepEvidence` call site, keyed by the lesson's primary skill;
  target matching by item id. Groups and rows are **display only, never a new evidence type**.

### Fit-screen (no new scrolling)
- `rowReserve = rowTile + 20` is added to `fixedHeight` inside the existing tile-size loop.
- `rowTile = clamp(floor((contentWidth - 8*(slots-1)) / slots), 24, 46 phone / 56 tablet)`, where
  `slots = row_item_ids.length + 1` for extension steps (reserves the appended tile).
- When no row fields are present the render tree is **byte-identical** to before (the `playColumn`
  wrapper only appears when a row exists).

## Validator field policy finding

The validator checks **named fields only** and never iterates unknown keys — so `count` and the row
fields would have been **silently ignored** (no allowlist needed, and none added). Because the spec
requires enforcement, this run **added five new named rules** (existing rules untouched):

| Rule | Meaning |
| --- | --- |
| `P-SCHEMA-ITEM-COUNT` | picture item `count` must be a positive integer (≥1) when present |
| `P-SCHEMA-STEP-ROW-IDS` | `row_item_ids` must be an array of ≥2 item ids when present |
| `P-REF-STEP-ROW-ITEM` | every `row_item_ids` entry resolves to an item in the lesson's picture set |
| `P-SCHEMA-STEP-ROW-GAP-RANGE` | `row_gap_index` is an integer in range; also fires when it is present without `row_item_ids` |
| `P-SCHEMA-STEP-ROW-TARGET` | copy: `row[gap] === target`; extension: `target !== last row tile` |

Note (stated plainly): the extension half of `P-SCHEMA-STEP-ROW-TARGET` is a **decidable sanity
check** (the continuation differs from the last shown tile), not full pattern-semantics validation.
A future lesson that legitimately continues with the same tile (e.g. AAA → A) would need this rule
relaxed.

## Proof — `dev-harness/engine-groups-rows-drill.js` (28/28 PASS)

Uses the **real** validator (`validate()`), the **real** pack records on disk, and explicit
**source assertions** for the session/loader branches. (`lib/pack-loader.ts` is TypeScript with JSON
import attributes + expo native imports, so it is not Node-importable — the same constraint the
existing drills work around by reading records directly.)

Key results:
```
[PASS] Pack 1 still validates with 0 errors
[PASS] Pack 2 still validates with 0 errors
[PASS] no existing picture item carries the new count field (rendering inputs unchanged)
[PASS] no existing lesson step carries the new row fields (no layout change)
[PASS] a count item is ONE item record (one id, one asset) — nothing for the Map to collapse
[PASS] itemsById keeps exactly one entry for the count:3 item
[PASS] validator accepts count = 3 (positive integer)
[PASS] validator rejects count = 0 / -1 / 2.5 / "2"        (P-SCHEMA-ITEM-COUNT)
[PASS] validator accepts a valid COPY row (row[gap] === target)
[PASS] validator accepts a valid EXTENSION row (target differs from last tile)
[PASS] a step with no row fields validates exactly as before
[PASS] validator rejects a dangling row_item_ids entry     (P-REF-STEP-ROW-ITEM)
[PASS] validator rejects an out-of-range row_gap_index     (P-SCHEMA-STEP-ROW-GAP-RANGE)
[PASS] validator rejects a copy row whose gap tile is not the target   (P-SCHEMA-STEP-ROW-TARGET)
[PASS] validator rejects an extension whose target repeats the last tile (P-SCHEMA-STEP-ROW-TARGET)
[PASS] validator rejects row_gap_index without row_item_ids (P-SCHEMA-STEP-ROW-GAP-RANGE)
[PASS] session still has exactly one recordStepEvidence call site (no new evidence type)
[PASS] evidence still keys by lesson primary skill (unchanged shape)
[PASS] target matching still by item id (groups/rows are display only)
[PASS] session renders the group path only when count > 1
[PASS] session renders the pattern row from step row fields
[PASS] loader/session keep the single-asset frame path for count 1
[PASS] bands engine qualifying rule unchanged (still excludes help + participation)
[PASS] loader exposes the new optional fields
[PASS] every relative import in the touched files resolves to a real file -> checked=388 missing=none
```

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (6 distinct queues)
- validator all-packs — 0 errors (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `node dev-harness/lesson-selection-drill.js` — PASS
- `node dev-harness/l6-evidence-drill.js` — PASS (L6 mechanism regression)
- `node dev-harness/engine-groups-rows-drill.js` — PASS (28/28)

## Confirmations

- Pack 1 untouched (`git diff -- packs/sunny-home-garden/` empty).
- No Pack 2 lessons/skills/records wired (Pack 2 data diff empty).
- `app/adventure.tsx` NOT modified; bands engine / path-queue NOT modified.
- `packs/active.json` untouched (still `sunny-home-garden`; Pack 2 NOT active).
- No dependency changes; no dev server; staging removed; nothing committed except this run's files.

## DoD note

This run has **no phone-test step**: the engine changes nothing visible until a lesson uses groups or
rows — no existing lesson renders differently and no new lesson is wired here. Visual proof rides
with the NEXT run's combined phone test (Wave 3 wiring + engine rendering + the L6 parent-map check)
via the test-switch procedure. No demo/test lesson was invented.
