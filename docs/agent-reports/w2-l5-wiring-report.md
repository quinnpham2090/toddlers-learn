# W2-L5 wiring report — lesson-what-do-you-see as SCIENCE (Pack 2) — 2026-10-31

## HEAD gate

- HEAD at start: **`5065159`** ("Fix pattern lesson step 2 row so cup is uniquely inferable (AAB prefix) + manifest hash repairs") — matches the prompt gate.
- Tree clean before start except the known untracked strays (`AUDIT-REPORT.md`, `pack2-assets.zip`, `.kilo/`). `packs/active.json` = `sunny-home-garden-2` (Pack 2 live), untouched.
- `pack2-assets.zip` contains exactly the 13 `lesson-what-do-you-see_nNN.mp3` rows (n01–n10, n14–n16); no file missing.
- Temp-patch state matched the prompt exactly before writing (no STOP).

## Decision implemented

**W2-L5 wires as SCIENCE, band-moving WITH the provisional flag** (founder-approved 2026-10-31). The Wave 2 "Domain: language" line was a provisional placeholder; the science research verdict settles it as science. Nothing is filed as language.

## ⚠️ Deviations from the prompt's literal diff list (read this first)

The prompt's diff discipline named only Pack 2 files + `app/session.tsx` and the drill asserted "no code changed except the single FINALE_CONFIG entry". Four gaps made that literal scope impossible to satisfy while also meeting the run's own specs. Each is resolved below and flagged here:

1. **`lib/pack-loader.ts` (voice + image wiring) — required, not in the prompt's list.** The prompt says voice placement follows "EXACTLY the Wave 2 Puff precedent" and requires all 16 voice refs to resolve, and requires the 3 reused labels to "reference the EXISTING Pack 2 Puff label files" ("one registry key serves multiple lessons"). In this codebase voice is resolved by `PACK_VOICE_REGISTRY` and images by `PACK_ASSET_REGISTRY`, both in `lib/pack-loader.ts` (static imports + registry keys). Every prior wiring run changed this file — Wave 2 `3ece202` (`lib/pack-loader.ts | 184 +`) and Wave 3 `151af90` (`lib/pack-loader.ts | 182 +`, message: "loader imports/registries, and 7 FINALE_CONFIG entries"). Without it, voice is silent and the new images do not render. I added exactly: 13 voice imports + 14 registry keys (13 new + `item.red_flower.label` reused from the Pack 1 module) + 2 asset-registry keys.
2. **`dev-harness/engine-evidence-drill.js` (1-line regression fix) — not in the prompt's list.** The new lesson carries per-step `evidence_skill_ids` (the prompt specifies evidence per step). The existing drill asserted per-step evidence is used *only* by the 7 Wave 3 maths lessons, so it failed. I extended its expected set with `lesson-what-do-you-see` (`PER_STEP_EVIDENCE_LESSON_IDS`) and updated the message; the pre-change legacy-output assertions are unchanged. Not a listed gate, but shipped drills must not regress.
3. **`skills.json`: one reachability edge beyond the specified revert.** Applying the prompt's revert verbatim left `name-with-grown-up-choice` with no incoming edge → the validator gate failed with `P-SCHEMA-SKILL-UNREACHABLE`. The temp patches had been the only thing keeping it reachable. I restored the natural L6 chain edge `name-with-grown-up.next_skills: [] → ['name-with-grown-up-choice']`. Verified **zero runtime impact**: `getJourneyStopSkills()` BFS order is byte-identical before/after (the skill was already the next unvisited entry), and `next_skills` has no other runtime consumer outside the validator/loader BFS.
4. **Parent-map "next up" wording — placed as a Pack 2 string (no code change).** See "Parent-map wording" below; the "Next up:" line is generated in `lib/adventure-map.ts`, so the wording was placed in the pack string that line reads.

Net effect on `git diff --stat`: the prompt's listed files **plus** `lib/pack-loader.ts` and `dev-harness/engine-evidence-drill.js`.

## Files created / changed

| File | Change |
| --- | --- |
| `packs/sunny-home-garden-2/lessons.json` | +1 lesson `lesson-what-do-you-see` (5 steps, scaffolds mirrored); `lesson-name-it-together.fallback_lesson_id` → `lesson-what-do-you-see` |
| `packs/sunny-home-garden-2/skills.json` | +2 science skills; 3 temp `next_skills` reverted; +1 reachability edge (`name-with-grown-up → name-with-grown-up-choice`) |
| `packs/sunny-home-garden-2/picture_sets.json` | +1 set `what-do-you-see-set` (7 verbatim items) |
| `packs/sunny-home-garden-2/strings.json` | +26 strings (lesson, 2 skills, set, 2 item labels, adventure.skill wording) |
| `packs/sunny-home-garden-2/manifest.json` | 6 `file_hashes` refreshed + 15 new entries; temp-patch notes revoked; `pack_sha256` unchanged |
| `packs/sunny-home-garden-2/assets/yellow-cup.jpg` | new — byte-identical copy of Pack 1 |
| `packs/sunny-home-garden-2/assets/green-leaf.jpg` | new — byte-identical copy of Pack 1 |
| `packs/sunny-home-garden-2/assets/voice/puff/lesson_what_do_you_see_*.mp3` | 12 new (5 prompts, 5 celebrations, closing win, find prompt) |
| `packs/sunny-home-garden-2/assets/voice/puff/item_green_leaf_label.mp3` | 1 new label |
| `app/session.tsx` | +1 `FINALE_CONFIG` entry (only hunk in the file) |
| `lib/pack-loader.ts` | 13 voice imports + 14 voice-registry keys + 2 asset-registry keys |
| `dev-harness/engine-evidence-drill.js` | expected per-step-evidence lesson set extended (regression fix) |
| `dev-harness/w2-l5-wiring-drill.js` | new drill |
| `docs/agent-reports/w2-l5-wiring-report.md` | this report |

## Temp-patch revert (before → after, all four spots)

| Record | Before | After |
| --- | --- | --- |
| `onset-rime-prep.next_skills` | `["name-with-grown-up","initial-sound-matching"]` | `["initial-sound-matching"]` |
| `initial-sound-matching.next_skills` | `["name-with-grown-up-choice","which-starts-with"]` | `["which-starts-with"]` |
| `which-starts-with.next_skills` | `["name-with-grown-up-choice"]` | `["notice-with-choices"]` |
| `lesson-name-it-together.fallback_lesson_id` | `lesson-first-sounds` | `lesson-what-do-you-see` (fallback_picture_id stays `everyday-objects-set`) |
| `manifest.notes_author` | `…TEMPORARY: notices W2-L5 held …; revoke all three on the W2-L5 pass.` | temp sentence removed (all three revoked) |

## Lesson spec (as wired)

- `id lesson-what-do-you-see`, title "What Do You See?", guide `puff`, age band `3-4`, `tap_choice`, `picture_set_id what-do-you-see-set`, primary `notice-with-choices`, secondary `[what-do-you-see, point-to-choice]`, `fallback_lesson_id lesson-first-sounds`, `fallback_picture_id first-sounds-set`, `song_template_id/mission_id/routine_id null`, `estimated_minutes/chunk_budget_minutes` 5/5 (mirror `lesson-first-sounds`), scaffolds mirrored exactly (L0–L3).
- Steps (2 choices each; exactly one correct; all evidence bandable, no `evidence_participation`):
  1. target `red-flower`, choices `[red-flower, yellow-cup]`, evidence `[notice-with-choices]`
  2. target `book`, choices `[book, ball]`, evidence `[what-do-you-see, point-to-choice]`
  3. target `cup`, choices `[cup, book]`, evidence `[notice-with-choices]`
  4. target `green-leaf`, choices `[green-leaf, ball]`, evidence `[what-do-you-see]`
  5. target `book`, choices `[book, spoon]`, evidence `[point-to-choice]`

## New skill records (Pack 2, domain SCIENCE)

Both follow the `onset-rime-prep` shape (`evidence_needed_to_advance: 3`, `catch_up_variant_of: null`, `is_entry_skill: false`, DRAFT notes):

- `notice-with-choices` — prerequisites `[point-to-choice]`, next `[what-do-you-see]`.
- `what-do-you-see` — prerequisites `[point-to-choice]`, next `[name-with-grown-up]` (lesson-order successor; the path-graph `next` `what-will-happen-if` is the queue's business, not the pack record's — not copied).

## Picture-set provenance (5 Pack 2 verbatim + 2 Pack 1 copies)

`what-do-you-see-set` (7 items, 0 new art). Item records copied **verbatim** (same `label_ref`, `alt_text_parent_ref`, `asset_path`, `asset_sha256`, `size_class`, `depiction_tags`):

| Item | Source set | Asset | Verified |
| --- | --- | --- | --- |
| red-flower | Pack 2 `colour-sorting-set` | assets/red-flower.jpg | record + manifest hash match |
| book | Pack 2 `pattern-set` | assets/book.jpg | match |
| ball | Pack 2 `pattern-set` | assets/ball.jpg | match |
| cup | Pack 2 `pattern-set` | assets/cup.jpg | match |
| spoon | Pack 2 `pattern-set` | assets/spoon.jpg | match |
| yellow-cup | **Pack 1** `colour-garden-set` | assets/yellow-cup.jpg | copied **byte-identical** (`cmp` clean); new set hash `f034add6…` = validator-scheme hash of the copied bytes |
| green-leaf | **Pack 1** `colour-garden-set` | assets/green-leaf.jpg | copied **byte-identical**; hash `d2519dff…` |

Bank = 7 items (clears the 6+ rule).

## Voice inventory (13 placed + 3 reused = 16 resolving)

Source: `pack2-assets.zip` rows `lesson-what-do-you-see_n01–n10, n14–n16`, placed under `assets/voice/puff/` by the Wave 2 naming convention:

| Zip row | Placed file |
| --- | --- |
| n01–n05 | `lesson_what_do_you_see_step_1..5_prompt.mp3` |
| n06–n10 | `lesson_what_do_you_see_step_1..5_celebration.mp3` |
| n14 | `item_green_leaf_label.mp3` (Green leaf label) |
| n15 | `lesson_what_do_you_see_closing_win.mp3` |
| n16 | `lesson_what_do_you_see_find_prompt.mp3` |

**Reuse mechanism (no duplicate files):** the loader registry key serves the lesson; reused labels point at existing modules —
- `item.red_flower.label` → Pack 1 `item_red_flower_label.mp3` (Pack 2 had no red-flower label file; the Pack 1 file exists and is reused, exactly like Book/Cup).
- `item.book.label` / `item.cup.label` → already-registered Pack 1 modules (no change needed).
- `item.green_leaf.label` → the new placed file (n14).
All 16 refs (10 lesson step refs + closing + find-prompt + 4 labels) resolve through `PACK_VOICE_REGISTRY['sunny-home-garden-2'].puff` to real files (drill-verified).

## Finale (config entry — item 7 of scope)

Added to `FINALE_CONFIG` in `app/session.tsx`, **appended after `lesson-sort-by-colour`** (the Wave 2/3 convention: Pack 2 lessons appended at the end):

```ts
  'lesson-what-do-you-see': {
    targetItemId: 'green-leaf',
    tileItemIds: ['green-leaf', 'book', 'cup'],
    findPromptRef: 'lesson.what_do_you_see.find_prompt',
  },
```

- Resolves via the existing `finaleStep` lookup (the step whose `target_item_id === targetItemId`) → **step 4** (`green-leaf`). All three tiles appear in the lesson's steps (green-leaf = step 4 target; book = steps 2 & 5 target; cup = step 3 target). Find-prompt string + voice resolve. `git diff app/session.tsx` = this one hunk only.

## Parent-map wording (mechanism + placement)

- **Mechanism (verified):** the parent map's "next up" line is generated in `lib/adventure-map.ts` — `Next up: ${targetTitle(item)} — ${nextUpCause(...)}` — where `targetTitle` reads the **path node's `title_ref`** from the ACTIVE pack's strings (falling back to the code `PARENT_SKILL_LABELS`). It is not a lesson-authored string.
- **Placement:** I added the pack string `adventure.skill.what_do_you_see.title` = **"Noticing and pointing to things you see"** to Pack 2 `strings.json` (the ref is the `what-do-you-see` path node's `title_ref`, so the science row's next-up reads `Next up: Noticing and pointing to things you see — …`). No code change. (Pack 2 previously had no `adventure.skill.*` strings, so the science next-up showed a raw ref; this fixes it.)
- **Residual (reported, not invented):** the sibling node `notice-with-choices` has `title_ref: null` in `lib/path-graph.js` (which the prompt forbids touching), so if the science next-up item is that node its label comes from the code `PARENT_SKILL_LABELS` entry. Changing that needs a `lib/adventure-map.ts` edit, outside the prompt's allowed diff — flagged for a follow-up rather than invented here.
- **Provisional labelling (verified, not built):** lesson-evidenced science bands already carry provisional labelling. `lib/path-queue.ts:22-32` sets `meta.provisional = node.provisional` for every path node; `lib/bands.js:254,258` propagates it into each band result; `lib/adventure-map.ts:503` marks the domain row `provisional: domain === 'science'` and `:523` marks skill-band rows `result.provisional === true`; `app/parent-dashboard.tsx:364,367-371,378-380` renders `(early signal)` + the `PROVISIONAL` chip + the science note. Both `notice-with-choices` and `what-do-you-see` are `provisional: true` science nodes, so lesson evidence is covered by the existing mechanism — no new UI.

## Manifest (Pack 2 only)

- `pack_sha256` **left EXACTLY as-is**: `93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a` — deliberate (no code computes/compares it; no derivation reproduces it; never invent a value).
- `version` 0.1.0, `status` draft, `dependencies`, `title_ref`/`summary_ref`, `gating` all unchanged.
- Temp-patch notes revoked (see above).
- Hash entries (validator utf8-content scheme), recomputed from current bytes:

| Entry | Old → New |
| --- | --- |
| `lessons.json` | `80c64d0e…` → `76c96d5cf4e3a6bc90d1599e2dc035a761c943a22223d503922ef03efec82488` |
| `skills.json` | `36f0be11…` → `cfaf7199a2d87c1923681d825e6f3ccaec66df2569142e6632a2ba801c7b26b5` |
| `picture_sets.json` | `d27de897…` → `1dba8267cb54b4414aa2195301da400a26989d6a7112d842a342d097ea473e0a` |
| `strings.json` | `5ef53cfb…` → `fc50d3d4c0b6980881b8e78fa934f876de90d2c0916b5bf5e59a04d7a5a10f26` |
| `assets/yellow-cup.jpg` | new → `f034add67362fdb5a68a31ca3d3c5debd0a76aaf92073bb8b7ea8bc23ae16c20` |
| `assets/green-leaf.jpg` | new → `d2519dff90f433f30da1cf03c1214fa470b6e977abde6a95590787a5413aca12` |
| 13 × `assets/voice/puff/…` | new → recorded (prompts `43a7fe2a…`,`96bb4668…`,`ab985b30…`,`7bd52758…`,`0622ba31…`; celebrations `1e995983…`,`60604d14…`,`4e00712b…`,`c2fe9419…`,`505feadd…`; closing `800c7db5…`; find-prompt `f0ad48da…`; green-leaf label `68e9dacc…`) |

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — ALL PHASE 0 CHECKS PASSED
- `node tools/path-divergence-test.js` — PASS (all 6 synthetic profiles produce different queues)
- validator all-packs — **0 errors** (core, sunny-home-garden, sunny-home-garden-2, test-switch; `packs/schema/` is schemas, not validated as a pack)
- `node dev-harness/lesson-selection-drill.js` — PASS
- `node dev-harness/mission-offer-drill.js` — PASS (26/26, regression; helper untouched)
- `node dev-harness/w2-l5-wiring-drill.js` — **ALL W2-L5 WIRING CHECKS PASSED** (new)
- Regressions re-run: `l6-evidence-drill` PASS, `engine-groups-rows-drill` PASS, `engine-evidence-drill` PASS (after the 1-line expectation update), `w3-evidence-drill` PASS, `pack-activation-drill` PASS

`git diff -- packs/sunny-home-garden/` **empty** (Pack 1 untouched); `git diff -- packs/active.json` **empty**; no staging before commit.

## DoD (founder phone test, one sitting, live pointer)

- Play `lesson-what-do-you-see` end to end: 5 steps + finale finding the green leaf (Puff; 7-item picture set; voice for prompts/celebrations/closing/find-prompt/labels).
- Parent map: the science row shows the noticing bands WITH the PROVISIONAL chip + `(early signal)` + the science note; next-up reads "Next up: Noticing and pointing to things you see — …" when the science item is the `what-do-you-see` node.
- W2-L6 (`lesson-name-it-together`) still reachable after it (L4 → L5 → L6 fallback chain intact).
- No regressions in neighbouring lessons.
- **Not claimed:** any multi-day or queue-order phone test — drills prove the chain, the device proves the lesson.
