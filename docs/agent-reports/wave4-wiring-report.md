# Wave 4 wiring report — 5 maths lessons, 4 skills, 4 images, 60 voice lines — 2026-10-31

## HEAD gate

- HEAD at start: **`d8722ef`** ("Parent map: point notice-with-choices node at existing skill title") — matches the prompt gate.
- `git pull --ff-only`: Already up to date. Tree clean apart from the known untracked strays (`AUDIT-REPORT.md`, `pack2-assets.zip`, `wave4-assets.zip`, `.kilo/`).
- `packs/active.json` = `sunny-home-garden-2` (Pack 2 live) — untouched.
- `wave4-assets.zip` present at repo root; `unzip -t` zero errors; contents = 4 JPGs (circle, square, triangle, rectangle) + 60 MP3s (12 per lesson) + `images/image-manifest.json`, `voice/voice-manifest.csv`, `voice/voice-manifest.json`, `wave4-asset-manifest.json`.

## ⚠️ Deviations from the prompt's literal diff list (read first)

The prompt said the code diff is "loader + session.tsx (5 FINALE entries + finale-voice fix) + drills + report". Three additions were required; all are documented and proven:

1. **`tools/validator.js` (+6 lines) — the Wave 4 L5 step-4 copy contains the musical word "beat".** The validator's competitive-copy rule bans the substring `beat` in every string value, with founder-approved carve-outs for the musical uses (`lesson.clap_the_beats.*`, `lesson.copy_the_pattern.*`, `skill.beat_patterns.*`, `item.beat_loud/soft/rest.*`, `picture_set.pattern.*`). Wave 4's L5 is a new lesson id (`lesson.copy_abc_pattern.*`) whose step-4 prompt/celebration use "beat" ("Keep the beat pattern going! …" / "A rest beat keeps the beat pattern going!"), so the validator failed until I added the same carve-out for `lesson.copy_abc_pattern.`. Competitive "beat" stays banned everywhere else. Without this the validator gate cannot pass.
2. **`dev-harness/engine-evidence-drill.js` (1 line) and `dev-harness/engine-groups-rows-drill.js` (1 line) — regression fixes.** `lesson-copy-abc-pattern` carries per-step `evidence_skill_ids` and `row_item_ids` (both specified by the prompt). Both existing drills hard-asserted those fields were used *only* by the Wave 3 lessons; I extended their expected sets. Shipped drills must not regress.
3. **`packs/sunny-home-garden-2/strings.json`: the 5 parent-map "next up" wordings were added under `lesson.<snake>.parent_map_next_up`** — see "Parent-map wordings" below for why they cannot currently be wired to the parent map.

## Files created / changed

| File | Change |
| --- | --- |
| `packs/sunny-home-garden-2/lessons.json` | +5 lessons (25 steps) |
| `packs/sunny-home-garden-2/skills.json` | +4 skills; `give-3.next_skills` → `[give-n, give-4]` |
| `packs/sunny-home-garden-2/picture_sets.json` | `counting-groups-set` +6 count:4 items; +`shape-names-set` (7 items) |
| `packs/sunny-home-garden-2/strings.json` | +88 strings |
| `packs/sunny-home-garden-2/manifest.json` | 68 `file_hashes` entries updated/added; `pack_sha256` unchanged |
| `packs/sunny-home-garden-2/assets/{circle,square,triangle,rectangle}.jpg` | 4 new images (from zip) |
| `packs/sunny-home-garden-2/assets/voice/moss/lesson_{give_four,how_many,more_or_less,shape_names,copy_abc_pattern}_*.mp3` | 60 new voice files |
| `app/session.tsx` | +5 `FINALE_CONFIG` entries; finale-voice fix (phone mount + tablet dedupe) |
| `lib/pack-loader.ts` | 64 static imports + 60 voice-registry keys + 4 asset-registry keys |
| `tools/validator.js` | +6 (Wave 4 "beat" copy carve-out) |
| `dev-harness/engine-evidence-drill.js`, `dev-harness/engine-groups-rows-drill.js` | 1 line each (regression fixes) |
| `dev-harness/w4-wiring-drill.js` | new drill |
| `docs/agent-reports/wave4-wiring-report.md` | this report |

## Lessons wired (all guide Moss, 3–4, tap_choice, 5/5 min, `song_template_id`/`mission_id`/`routine_id` null, scaffolds mirroring the W3 give lessons)

- **W4-L1 `lesson-give-four`** — primary `give-4`; set `counting-groups-set`; fallback `lesson-give-three` / `counting-groups-set`. 5 steps (cup/spoon/book/flower/ball ×4, 3 choices each), closing win "You gave Moss four things, just right!", find-prompt "Let's find the four balls together!".
- **W4-L2 `lesson-how-many`** — primary `cardinality`; same set; fallback `lesson-give-four`. 5 steps; the counted group is **spoken only** (the prompt voice names it, e.g. "One, two, three cups!"); there is no separate "counted group" rendering field and none was invented; the counted object never appears among the choices (identical-group matching cannot satisfy any prompt).
- **W4-L3 `lesson-more-or-less`** — primary `more-less`; same set; fallback `lesson-how-many`. MORE/LESS alternate M,L,M,L,M; middle group satisfies neither.
- **W4-L4 `lesson-shape-names`** — primary `shape-names`; set `shape-names-set`; fallback `lesson-more-or-less` / `counting-groups-set`. Steps 1–4 pure shape tiles; step 5 world-transfer ("Find something round!" → ball).
- **W4-L5 `lesson-copy-abc-pattern`** — primary `pattern-extension`; set `pattern-set` (the W3 L4 set; not recreated); fallback `lesson-shape-names` / `shape-names-set`. 5 rows incl. the corrected step 5.

## Erratum applied

W4-L5 step 5 row is the **corrected** value: `[cup, ball, spoon, cup, ball, spoon, cup, ball, spoon]`, `row_gap_index 8`, target `spoon` (row[8] = spoon). The superseded 8-item/gap-7 draft is not present. Drill-verified: `row[gap] === target` for all 5 rows and every prefix is a full pattern unit plus a partial repeat.

## Skills

| Skill | Description | Prereq | Next | Evidence |
| --- | --- | --- | --- | --- |
| `give-4` | "Give Moss four things" | `give-3` | `cardinality` | 3 |
| `cardinality` | "Answer 'how many?' with the last number counted" | `give-4` | `more-less` | 3 |
| `more-less` | "See which visible group has more, and which has less" | `cardinality` | `shape-names` | 3 |
| `shape-names` | "Name circle, square, triangle, and rectangle shapes, and find shapes in the garden world" | `subitize` | `pattern-extension` | 3 |

All domain maths, `is_entry_skill` false, `age_band_min` 3-4. `give-3.next_skills` → `[give-n, give-4]` (branch; `give-n` still reachable). `pattern-extension → beat-patterns → what-comes-next → []` unchanged. Validator `P-SCHEMA-SKILL-UNREACHABLE` passes.

**⚠️ Finding (schema cap):** the prompt specified **3** declared secondaries for L5 (`pattern-copy`, `beat-patterns`, `what-comes-next`), but the schema/validator caps `secondary_skill_ids` at **2** (`P-SCHEMA-LESSON-SECONDARY-SKILLS`). I declared **2** — `[pattern-copy, beat-patterns]`, mirroring the W3 `lesson-copy-the-pattern` shape — and kept `what-comes-next` as step-5 `evidence_skill_ids` (which the validator only requires to resolve to a pack skill). Reported, not silently dropped.

## Sets

- **`counting-groups-set` EXTENDED** (the extension validates — used, not the new-set fallback): +6 items `ball-4, cup-4, spoon-4, book-4, red-flower-4, yellow-flower-4`, each on its existing single-object JPG with the same `asset_path`/`asset_sha256`, `count: 4`, following the wired count-item label/alt-parent pattern. The original 18 items are unchanged (drill-verified order + ids). 24 items total.
- **`shape-names-set` NEW**: exactly 7 items — `circle, square, triangle, rectangle` (the 4 zip JPGs) + `ball, book, cup`. **Reuse rule used: COPY** — the 3 reuse item records are copied verbatim from `everyday-objects-set` (same `asset_path`, `asset_sha256`); the assets are already manifest-hashed in Pack 2, so no new copies and no new images.
- **W4-L5** reuses `pattern-set` (10 tiles) — no new set, no new images.

## Voice (60 placed; 0 new labels; retry cue absent)

- All 60 zip MP3s placed as `assets/voice/moss/lesson_<snake>_step_N_prompt.mp3`, `..._step_N_celebration.mp3`, `..._closing_win.mp3`, `..._find_prompt.mp3`, each wired via a static import + `PACK_VOICE_REGISTRY['sunny-home-garden-2'].moss` key. Every file's raw-byte sha256 matches `wave4-asset-manifest.json`; every `manifest.file_hashes` entry matches the validator utf8 scheme.

**Conditional findings (confirmed, not invented):**

- **(a) shape word-alone labels:** the zip contains **no** shape label rows → **0** shape label audio (Wave 3 shipped no per-item label audio for tiles; device TTS fallback).
- **(b) group-count word-alone labels:** **0** group label audio (matches the Wave 3 convention — no group label audio).
- **(c) L1-n12 vs L2-n12:** both text "Let's find the four balls together!" but the files are **byte-distinct** (`lesson-give-four_n12.mp3` raw sha `ffd34933…`, `lesson-how-many_n12.mp3` raw sha `cc9f98e8…`). So **both placed**; the base count stays **60** (no reuse, nothing deducted).
- **L2 counted-group display:** **spoken only** — the prompt voice names the counted group; there is no display field, and the evidence does not depend on it.
- **Retry cue:** **no Moss recording of "Try again — let us look together!" exists in Pack 2** (searched `assets/voice/moss`, `assets/voice/puff`, and the loader registry: zero matches). The retry cue remains banner text only, per the Wave 3 convention. Not a blocker for this run, but **flagged for the phone test** as the prompt asked.

## FINALE_CONFIG (session.tsx)

5 entries appended after `lesson-what-do-you-see` (existing W2-L5 convention): target + tiles + `findPromptRef` = `lesson.<snake>.find_prompt`. Targets equal each lesson's step-5 target; every tile appears in its lesson's steps (drill-verified).

## Finale-voice fix (fold-in, code-only)

- **Phone layout:** was missing entirely — the non-tablet return now mounts **exactly one** `<FinaleNarrator>` under `phase === 'finale' && finaleConfig`, with the tablet props (`text={getString(finaleConfig.findPromptRef)}`, `stringKey={finaleConfig.findPromptRef}`, `speakerId={character?.id ?? null}`). This is the whole fix: during the finale phase the regular `Narrator` receives null speech, so without this mount the find-prompt never auto-plays on phones.
- **Tablet layout:** the duplicate block was removed — it now mounts **exactly one** `FinaleNarrator` (was two identical conditional blocks at HEAD). Drill-verified: tablet=1, phone=1, both under the finale-phase condition with identical props.
- **Ref resolution:** all **24** `FINALE_CONFIG` `findPromptRef`s resolve to a string + a registered voice file **under their owning pack** — **20 Pack 2** (active) + **4 Pack 1** (`lesson.hello_cup`, `lesson.red_flower_yellow_flower`, `lesson.where_does_this_go`, `lesson.big_little` — Pack 1 lessons, not in Pack 2, resolving under Pack 1's registry/strings). No fallback invented. (The prompt's "all 24 under the active pack" is only literally true per-owning-pack; flagged.)
- `handleListenAgain` unchanged; no new voice files; no string/lesson/asset changes ride along.

## Parent-map wordings (mechanism + placement)

The parent map's "next up" line is generated in `lib/adventure-map.ts` (`targetTitle(item)` reads the **path node's `title_ref`** from the active pack). Wave 4 adds **no path nodes** (the prompt forbids a path-graph change), so the new maths skills never appear in the parent map's next-up, and the 5 wordings have no mechanism to read them. I added them as strings under `lesson.<snake>.parent_map_next_up` (all resolve) and **report the gap** rather than invent a mechanism or edit `lib/path-graph.js`. No other node or file changed.

## Manifest (Pack 2 only)

- `pack_sha256` **left EXACTLY as-is**: `93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a`.
- Recomputed `file_hashes` (validator utf8-content scheme) for the 4 JSON files + 4 images + 60 voice files (68 entries; 64 new):
  - `lessons.json` → `23082b7b664282a38deb40e2e491e010d54b931f7de72789c81b75026dafd750`
  - `skills.json` → `d53dce8b61a2f80166139c874a63dbf3eb256cd500252000e6516cf624241b16`
  - `picture_sets.json` → `7b82d62a5dff024aae84ba184f89bcc1d41e550bcd1be0667744719827ca6d62`
  - `strings.json` → `98cc2245e92fcd015a84554249436dc7eda92928a8b27a601f95159f841792c5`
  - 4 images + 60 voice files → recorded (all also match the delivery zip's raw-byte sha256s).
- 329 total entries. `version` 0.1.0 / `status` draft / `dependencies` unchanged.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (all 6 synthetic profiles produce different queues)
- validator all-packs — **0 errors** (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `lesson-selection-drill` PASS · `mission-offer-drill` PASS · `l6-evidence-drill` PASS · `engine-groups-rows-drill` PASS · `engine-evidence-drill` PASS · `w3-evidence-drill` PASS · `pack-activation-drill` PASS · `w2-l5-wiring-drill` PASS · `notice-title-fix-drill` PASS
- `node dev-harness/w4-wiring-drill.js` — **ALL WAVE 4 WIRING CHECKS PASSED**
- **Diff review:** Pack 1 EMPTY; `active.json` untouched; code diff = `lib/pack-loader.ts` + `app/session.tsx` (5 FINALE entries + phone mount + tablet dedupe) + `tools/validator.js` (+6, documented above) + 3 drills + report; data diff = Pack 2 JSON + assets only.

## What did NOT change

- **Pack 1** — no record, string, or asset change (`git diff -- packs/sunny-home-garden/` empty).
- **`packs/active.json`** — untouched.
- **Pre-existing steps** — byte-unchanged (73 steps across 15 lessons; drill snapshot hash `4db6c396…`). **Discrepancy reported:** the prompt said "63 pre-existing steps"; the actual count is **73** (98 total − 25 Wave 4).
- `pack_sha256`, Pack 2 `version`/`status`/`dependencies`, and `lib/path-graph.js` — unchanged.

## DoD (founder phone test — REQUIRED)

Play all 5 lessons end to end on the live pointer (steps + finale each): confirm the counted groups render (L2), the shape tiles render (L4), the ABC rows render (L5), and confirm the finale find-prompt **speaks automatically on the phone** at a lesson's finale (no tap on the listen element) — that is the finale-voice fix's proof. Confirm a Moss retry-cue recording exists before the test: **it does not exist in Pack 2** (reported above) — the retry cue is banner text only. The wave counts as landed only after the phone test passes.
