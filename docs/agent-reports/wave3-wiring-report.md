# Wave 3 wiring report — STOPPED at the binding group/pile check (2026-10-31)

## Outcome

**STOPPED before wiring anything.** The binding "Group / pile check" fails: the lesson/session
schema cannot represent a repeated-picture group. Per the spec's own rule, the honest fallback is
new group/pile pictures and the spec must be re-counted before art — so nothing was copied, wired,
or committed except this report.

No pack data, code, or assets were changed. `git diff -- packs/` is empty.

## Gates (all passed before the check)

- `git pull --ff-only` — up to date; HEAD `384b08b` (L6 evidence fix) ✓
- Tree clean except the known untracked strays (`.kilo/` now gitignored, `AUDIT-REPORT.md`,
  `pack2-assets.zip`) ✓
- `packs/active.json` = `sunny-home-garden` (Pack 1 live) ✓
- `pack2-assets.zip` present; `image-manifest.json`, `voice-manifest.json`, `voice-manifest.csv`
  readable ✓

## The blocker (file/line evidence)

The M3 "pile" precedent does repeat ONE verified picture N times — but only inside the adventure:

- `app/adventure.tsx:174-187` — `ApplePile({count})` renders `Array.from({length: count})` copies of
  `assets/adv_apple.jpg`. Adventure-only, and hardcoded to the apple picture (not general-purpose).
- Adventure pile items are adventure-schema items with `display: 'apple_pile'` + `count: N` and
  `asset_path: null` (`packs/sunny-home-garden/adventure.json`, items `pile-1/2/3`), driven by the
  adventure-only variant field `show_pile_count` (`lib/pack-loader.ts:1414`).

The lesson/session path has no equivalent:

- `lib/pack-loader.ts:387-393` — `LessonStep` is exactly `{step_index, prompt_ref, target_item_id,
  choice_item_ids, celebration_ref}`. There is no row/group/count/sequence field.
- `lib/pack-loader.ts:511-520` — `PictureSetItem` has no `display`/`count`; `asset_path` is a
  required string (one asset per item).
- `app/session.tsx:652-683` — `PictureGrid` renders exactly one `PictureChoice` per item.
- `app/session.tsx:534-540` — `PictureChoice` renders a single `<Image source={asset}>` per tile.
- `app/session.tsx:928-930` — `itemsById` is a `Map` keyed by `item_id`, so repeating an item id in
  `choice_item_ids` collapses to one tile (no duplicate rendering).

So a tile showing "two balls" (one ball picture drawn twice) is not expressible in a lesson.

## Scope of the block

- **W3-L1 `lesson-see-how-many`** (subitize groups) — every step's tiles are N copies of one object.
  **Blocked.**
- **W3-L2a/b/c/d `lesson-give-one` / `give-two` / `give-three` / `give-just-right`** (give piles) —
  every step's tiles are N-item piles of one object. **Blocked.**
- **W3-L4 `lesson-copy-the-pattern`** — related gap: the steps need a visible "model row" / "growing
  row" sequence with one empty spot. `LessonStep` has no row/sequence field and the session renders
  only the choice tiles, so the row display is also not expressible. **Blocked** (same root cause:
  the lesson engine renders single pictures only).
- **W3-L5 `lesson-sort-by-colour`** — fully representable today (single pictures as choices: three
  baskets, single flowers). Not blocked on its own — but the run is defined as all 7 lessons and the
  spec says STOP on the group check failure, so nothing was wired.

## What the re-count needs (founder decision)

Two honest options, both outside this run's scope:

**Option A — new group/pile art (and pattern-row art).** Re-count the image budget:
- L1 + L2a–d share the same need: one picture per (object × count). Distinct objects in the spec:
  ball, cup, spoon, book, red-flower (5) × counts {1,2,3} = **15 group images**, plus
  **3** if the yellow-flower variant group object is kept → **18**.
- L4 pattern rows: model AB + model AAB + growing AB + growing beats + growing ABB ≈ **5–6 row
  images** (the 3 beat tiles are already in the zip).
- L5: no new art beyond `blue-basket` (in the zip).
- Net: the spec's "Images: 0 NEW" for L1/L2a–d becomes ~15–18 new; L4 gains ~5–6; total ≈ **21–24
  new images** instead of 4.

**Option B — extend the lesson engine** to support composed groups and pattern rows (mirror
`ApplePile` into the lesson path: e.g. an item-level `count`/`display` and a `LessonStep` row field).
That is a session + item-schema change, which this run was explicitly told not to invent.

Until one option is chosen, L1, L2a–d, and L4 cannot be wired.

## Verified-ready assets (so the re-count can proceed)

From `pack2-assets.zip` (staged outside `packs/`, verified, then removed):

- **4 new images present + sha256-verified** against `image-manifest.json`:
  `beat-loud.jpg`, `beat-soft.jpg`, `beat-rest.jpg`, `blue-basket.jpg` (all OK).
- **84 new voice files present + sha256-verified** against `voice-manifest.json`:
  `lesson-see-how-many`, `lesson-give-one`, `lesson-give-two`, `lesson-give-three`,
  `lesson-give-just-right`, `lesson-copy-the-pattern`, `lesson-sort-by-colour` — 12 each
  (n01–n12), 0 hash failures.
- **13 held/deferred files present in the zip but NOT copied**: `lesson-what-do-you-see_*` (W2-L5,
  still held) and `lesson-match-the-number_*` (W3-L3, deferred by founder approval).

## Other findings for the report

- **Spec file location:** `preschool-app-pack2-content/wave3-spec.md` is **not present** in the repo
  or the zip (searched the tree and the archive). The run used the complete inline spec from the task
  brief (all 35 prompts, celebrations, closing wins, finale prompts, image/voice inventory).
- **Beat-patterns domain check (done, as required):** `lib/path-graph.js` already has a
  `beat-patterns` node with **`domain: 'language'`**. Per the spec, that mapping WINS — if W3-L4 is
  ever wired, its `beat-patterns` skill record must be **language**, not maths. **Founder decision
  flagged.**
- **Path-graph mappings:** all 10 new skills already have same-name path nodes (subitize, give-1,
  give-2, give-3, give-n, pattern-copy, pattern-extension, beat-patterns, what-comes-next,
  sort-by-colour) — domains maths for all except `beat-patterns` (language). Because the pack skill
  ids equal the node ids, no `PACK_SKILL_TO_PATH` entries are strictly required (the path-queue
  falls back to the raw skill id); `PACK_SKILL_TO_PATH` currently holds only the five id-changing
  mappings. `sort-by-colour` node domain is maths (matches the spec).
- **Beat-patterns bank counting:** not evaluated in the engine — the validator has no lesson
  tile/row bank counter; the ≥6 bank rule is adventure-errand-only (`P-ADV-ITEM-BANK-SIZE`). So the
  spec's "3 tiles + 6 composable rows" is a content plan, not a validator rule. Reported, not invented.
- **Wave 2 (b) temporary patches still in place** (untouched, as required): L4 skills' next-skills
  point to W2-L6 skills; W2-L6's `fallback_lesson_id` is `lesson-first-sounds`. W2-L5 remains held.

## Confirmations

- Pack 1 untouched: `git diff -- packs/sunny-home-garden/` empty.
- Wave 1 and Wave 2 Pack 2 lessons untouched; `packs/active.json` never staged or committed
  (still `sunny-home-garden`; Pack 2 NOT active).
- No dependency changes; no dev server; staging removed.
- Nothing was staged or committed except this report file; `.kilo/`, `AUDIT-REPORT.md`,
  `pack2-assets.zip` were never staged.
