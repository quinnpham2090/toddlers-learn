# Mission rotation relax + pattern step-2 fix — report (2026-10-31)

**Header:** the rotation relax landed **separately** in commit `0dde22e` ("Relax mission offer block
to back-to-back days only"); its report is
`docs/agent-reports/mission-offer-rotation-relax-report.md`. **THIS run applied Fix 2 only** (the
`lesson-copy-the-pattern` step-2 data fix + the manifest hash work below). No code was changed in
this run.

Commit: the single commit that adds this file — `git log --oneline -1`.
Message: `Fix pattern lesson step 2 row so cup is uniquely inferable (AAB prefix) + manifest hash repairs`

## Fix 2 — step 2 before / after

**Before** (`packs/sunny-home-garden-2/lessons.json`, `lesson-copy-the-pattern`, step 2):

```json
{ "step_index": 2,
  "prompt_ref": "lesson.copy_the_pattern.step_2.prompt",
  "target_item_id": "cup",
  "choice_item_ids": ["cup", "ball", "spoon"],
  "celebration_ref": "lesson.copy_the_pattern.step_2.celebration",
  "row_item_ids": ["ball", "ball", "cup"],
  "row_gap_index": 2,
  "evidence_skill_ids": ["pattern-copy"] }
```

**After:**

```json
{ "step_index": 2,
  "prompt_ref": "lesson.copy_the_pattern.step_2.prompt",
  "target_item_id": "cup",
  "choice_item_ids": ["cup", "ball", "spoon"],
  "celebration_ref": "lesson.copy_the_pattern.step_2.celebration",
  "row_item_ids": ["ball", "ball", "cup", "ball", "ball", "cup"],
  "row_gap_index": 5,
  "evidence_skill_ids": ["pattern-copy"] }
```

- **Visible prefix before the gap:** `["ball", "ball", "cup", "ball", "ball"]` — a full AAB unit
  (`ball, ball, cup`) plus a partial repeat (`ball, ball`), so the next item is **uniquely `cup`**,
  exactly as step 1's prefix (`red-flower, yellow-flower, red-flower`) establishes ABAB.
- **Gap index:** `5` (within range of a 6-item row).
- **`row[gap] === target`:** `row[5] === "cup" === target_item_id` → **true**.
- Unchanged: `target_item_id` (`cup`), `choice_item_ids`, `evidence_skill_ids`, the prompt/celebration
  strings and voice, and **every other step** of the lesson (verified programmatically: all lessons
  other than this one are byte-identical, and the other four steps of this lesson are untouched).
- The target was **not** changed to `ball` (that would destroy the AAB teaching — rejected).

Validator row rules pass on the new row: `P-SCHEMA-STEP-ROW-GAP-RANGE` and
`P-SCHEMA-STEP-ROW-TARGET` are satisfied (validator all-packs = 0 errors, below).

## Manifest — hash entries only (`pack_sha256` deliberately left as-is)

`file_hashes` updated for **6 entries** (recomputed from the **current** file bytes, validator
utf8-content scheme):

| Entry | Old (stale) → New |
| --- | --- |
| `lessons.json` | `139b00a95922…` → `80c64d0ea169081691fac0877f082b4f1af85bb4dd086d0ac3edb5849646fa3d` |
| `missions.json` | `37517e5f3dc6…` → `aa5f7e193f77bea6e315e4c9cb934f55713b4fa92d8099c936a2453b6222fed2` |
| `picture_sets.json` | `883b43ad0ded…` → `d27de897982d26a39fe5f80d19541650ed0ff916bec11c381bc7c9ab04236ef1` |
| `routines.json` | `37517e5f3dc6…` → `5e6f9bf2e62470979927c14aaea9ec18d3a586edde87f72f5b3354aebf518c50` |
| `song_templates.json` | `37517e5f3dc6…` → `9465ae685dcbf116336ad4d60b47f0dbe3430967020ba56d771c396f97e1bc88` |
| `strings.json` | `eab609caa1e7…` → `5ef53cfb6557a2c5b7974b74885f2d9db36d5750afb549bfa57033d3cb3ff772` |

The 5 repairs are exactly the stale set the prompt predicted (missions, picture_sets, routines,
song_templates, strings — all left stale by the port run; note their old values are the **empty-array**
file hashes, e.g. `37517e5f3dc6…` for the three files the port filled). Pre-run verification also
confirmed `characters.json`, `lessons.json` (pre-fix), `saved_songs.json`, `skills.json`, and
`time_concepts.json` were **live** — the stale set matched the prompt exactly, so no STOP applied.

**`pack_sha256` stays EXACTLY as-is:** `93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a`.
Deliberate, founder-visible decision — not an oversight. Reasons (verified): it was set once at Pack 2
creation (`22eadec`) and never updated through Waves 1–3, the port, or activation; **no code in the
repo computes or compares it** (only type declarations and a validator **format** check at
`tools/validator.js:695-696`); and no derivation from pack contents reproduces it. Inventing a
"recomputed" value without a formula would be worse than keeping the known value.

Nothing else in the manifest changed: `version` `0.1.0`, `status` `draft`, `dependencies`, and
`notes_author` (incl. the W2-L5 held / temp-patch notices) are untouched (asserted in-script).

## Files changed

| File | Change |
| --- | --- |
| `packs/sunny-home-garden-2/lessons.json` | step 2 `row_item_ids` + `row_gap_index` only (5 lines) |
| `packs/sunny-home-garden-2/manifest.json` | 6 `file_hashes` entries (`pack_sha256` unchanged) |
| `docs/agent-reports/mission-rotation-relax-plus-pattern-fix-report.md` | this combined report (new) |

No code changed; Pack 1 untouched; `packs/active.json` untouched; no new copy/art/voice/records.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (6 distinct queues)
- validator all-packs — 0 errors (core, sunny-home-garden, **sunny-home-garden-2**, test-switch)
- `node dev-harness/lesson-selection-drill.js` — PASS
- `node dev-harness/mission-offer-drill.js` — PASS (**26/26**, regression; the helper was not touched)

Diff scope: `packs/sunny-home-garden-2/lessons.json` + `packs/sunny-home-garden-2/manifest.json`
(+ this report). `git diff -- packs/active.json` empty; staging removed.

## Confirmations

- **Pack 1 untouched** (`git diff -- packs/sunny-home-garden/` empty); the ONLY pack change is the
  step-2 row + gap and the manifest hash entries in Pack 2.
- **No code changes** (the relax rule in `lib/mission-offer.js` was not touched); no bands, queue,
  unlock, child-map, or parent-map changes; no state-shape change; no new dependencies/records.
- `packs/active.json` untouched (still `sunny-home-garden-2`); staging removed.

## DoD — phone-verifiable in one sitting

Play `lesson-copy-the-pattern` **step 2** and confirm the row now shows **ball, ball, cup, ball, ball,
[empty]**, so `cup` is the inferable answer (previously `ball, ball, [empty]`, which did not uniquely
infer `cup`).

The multi-day mission-offer sequence is **not** part of this run and is **not** phone-claimed here: the
relax half landed separately in `0dde22e` and is **drill-proven only** (a phone cannot span three days
in one sitting). The founder's already-owed combined phone test for the card flow (card appears
alongside the next lesson, dismiss, accept → mission flow → return landing → no band/queue movement)
remains the device DoD for that feature.
