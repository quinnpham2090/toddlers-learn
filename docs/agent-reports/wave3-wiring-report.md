# Wave 3 wiring report (v3) — Pack 2 mathematics, 7 lessons wired (2026-10-31)

**This report supersedes BOTH the v2 stopped report (commit `a933c99`) and the 2026-10-30 stopped
report (commit `a59306d`).** Both blockers were resolved by **engine commits, not by re-specifying
anything**:

- The 2026-10-30 group/pile blocker → resolved by `210892c` (picture-item `count` groups + pattern
  rows). No new art was added for it.
- The v2 evidence-model blocker → resolved by `d16d845` (per-step `evidence_skill_ids` /
  `evidence_participation`). The evidence rules were **not** re-specified.

Commit: the single commit that adds this file — `git log --oneline -1`.
Message: `Wire Pack 2 Wave 3: 7 mathematics lessons (Moss), 84 voice, 4 new images`

## Files created / changed

- `packs/sunny-home-garden-2/lessons.json` — **7 new lessons** (35 steps) with `row_item_ids` /
  `row_gap_index` (L4) and `evidence_skill_ids` / `evidence_participation` per the spec.
- `packs/sunny-home-garden-2/skills.json` — **10 new skills** (+ the forced reachability link).
- `packs/sunny-home-garden-2/picture_sets.json` — **3 new sets**: `counting-groups-set` (18 count
  items), `pattern-set` (10 items), `colour-sorting-set` (6 items).
- `packs/sunny-home-garden-2/strings.json` — all new lesson/skill/set/item copy.
- `packs/sunny-home-garden-2/manifest.json` — rehashed; deps extended (below).
- `packs/sunny-home-garden-2/assets/` — **4 new images** (beat-loud, beat-soft, beat-rest,
  blue-basket) + **3 reused Pack-1 copies** (blue-flower, red-basket, yellow-basket) + **84 new Moss
  voice files**.
- `lib/pack-loader.ts` — 7 new image imports + asset-registry keys; 84 new Moss voice imports +
  voice-registry keys.
- `app/session.tsx` — 7 new `FINALE_CONFIG` entries (config only).
- `tools/validator.js` — the musical-`beat` carve-out extended to the Wave-3 key families (below).
- `dev-harness/w3-evidence-drill.js` — new proof drill (19 checks).
- `dev-harness/engine-groups-rows-drill.js`, `dev-harness/engine-evidence-drill.js` — 2 assertions
  each re-scoped from "the fields are unused" to "the fields are used only by Wave 3 lessons" (same
  intent: pre-Wave-3 lessons unchanged). Reported in Notes.
- `docs/agent-reports/wave3-wiring-report.md` — this file.

Pack 1: **zero diff**. `packs/active.json`: untouched (Pack 2 NOT active).

## Mechanisms chosen

| Mechanism | Choice |
| --- | --- |
| Count groups (L1, L2a–d) | One item record per (object × count), all sharing the one verified asset (`count: 1|2|3`); assets copied once. 18 items in `counting-groups-set`, **shared by all five counting lessons** (each lesson references exactly one set; no lesson spans two sets). |
| Pattern rows (L4) | `row_item_ids` + `row_gap_index` exactly per the spelled-out table (step 1 gap 3; step 2 gap 2; steps 3–5 no gap). |
| Evidence (per step) | L1 step 5 → `evidence_participation: true`; L2d steps → `['give-n', <give-N>]`; L4 steps → `['pattern-copy']×2, ['pattern-extension'], ['beat-patterns'], ['what-comes-next']`; L2a/b/c + L5 → defaults (primary only). |
| Reuse vs reference | **Copy** (byte-identical) for all record-referenced files: 3 Pack-1 images copied into Pack 2; the 6 reuse *item records* (ball/cup/spoon/book/red-flower/yellow-flower) already existed in Pack 2 and are re-listed in the new sets. |
| Set records created | 3 (above). No set was extended in place. |
| Song slot | Omitted (`song_template_id` absent) per the Wave 1 precedent. |
| Manifest deps | `+ ['sizes-set', 'sorting-set', 'lesson-big-little']` — cross-pack fallback refs for L1 (`lesson-big-little` / `sizes-set`) and L5 (`sorting-set`), mirroring the Wave 1 declared-deps pattern. No other dep changes. |

## Beat-patterns domain + bank counting (re-confirmed)

- `lib/path-graph.js` already has a `beat-patterns` node with **`domain: 'language'`**. Per the spec
  that mapping WINS → the `beat-patterns` skill record is **language**; the other 9 new skills are
  **mathematics**. **Founder decision on whether to keep the language mapping stands.**
- All 10 new skills already have same-name path nodes; no `PACK_SKILL_TO_PATH` entries were needed
  (the queue falls back to the raw skill id). No mappings invented.
- The validator has **no lesson tile/row bank counter** (the ≥6 bank rule is adventure-only,
  `P-ADV-ITEM-BANK-SIZE`); the "3 tiles + 6 composable rows" is a content plan, not a validator rule.
  No row items were invented.

## Validator change (flagged — beyond the prompt's explicit list)

The 7 new Wave-3 strings that use the musical word "beat" tripped `P-COOP-BANNED-COPY`. All 7 are
musical-beat vocabulary (the beat tiles / beat-patterns lesson), and the founder-specified copy
matches the recorded WAVs (which say "beat"), so rewording would desync display from audio.
I extended the **existing, founder-authorized Wave-2 carve-out** to the Wave-3 key families:

```
lesson.copy_the_pattern.*   skill.beat_patterns.*   item.beat_loud.*
item.beat_soft.*            item.beat_rest.*        picture_set.pattern.*
```

The competitive meaning of "beat" stays banned everywhere else. The 7 keys carved: 
`picture_set.pattern.alt_parent`, `item.beat_loud.label`, `item.beat_soft.label`,
`skill.beat_patterns.title`, `skill.beat_patterns.description`,
`lesson.copy_the_pattern.step_4.prompt`, `lesson.copy_the_pattern.step_4.celebration`.

## Spec-vs-schema conflict resolved (flagged)

The validator caps `secondary_skill_ids` at **2** (`P-SCHEMA-LESSON-SECONDARY-SKILLS`), but the spec
declares 3 secondaries for two lessons. Because `secondary_skill_ids` is **declarative only** (no
runtime use — the per-step `evidence_skill_ids` now carry the real attribution), I trimmed the
declarative lists to the cap:

- `lesson-give-just-right`: `['give-1','give-2','give-3']` → `['give-1','give-2']` (give-3 still
  evidenced on steps 3+5 via `evidence_skill_ids`).
- `lesson-copy-the-pattern`: `['pattern-extension','beat-patterns','what-comes-next']` →
  `['pattern-extension','beat-patterns']` (what-comes-next still evidenced on step 5).

No runtime information is lost. Founder may prefer widening the cap instead — flagged.

## Proof — `dev-harness/w3-evidence-drill.js` (19/19 PASS)

```
[PASS] L1 step-5-only play yields ZERO qualifying subitize evidence -> qualifying=0
[PASS] L1 steps 1-4 do qualify as subitize evidence -> qualifying=4
[PASS] L1 step 5 is still a full step (prompt + celebration + voice present)
[PASS] L2d per-step evidence_skill_ids are exactly [give-n + the matching secondary]
[PASS] L2d qualifying counts: give-n=5, give-1=1, give-2=2, give-3=2
[PASS] L5 emits no colour-naming evidence at all -> skills=sort-by-colour
[PASS] L5 play yields no bandable colour-naming band result
[PASS] L4 per-step evidence_skill_ids are exactly the spec list (no default primary)
[PASS] L4 qualifying counts: pattern-copy=2, pattern-extension=1, beat-patterns=1, what-comes-next=1
[PASS] L4 step 4 beat-patterns evidence is language-domain (path-graph resolution) -> domain=language
[PASS] completeness: every step has prompt/celebration voice + resolvable items -> all present
    lesson-see-how-many: steps=5 voices=12 set=counting-groups-set
    lesson-give-one: steps=5 voices=12 set=counting-groups-set
    lesson-give-two: steps=5 voices=12 set=counting-groups-set
    lesson-give-three: steps=5 voices=12 set=counting-groups-set
    lesson-give-just-right: steps=5 voices=12 set=counting-groups-set
    lesson-copy-the-pattern: steps=5 voices=12 set=pattern-set
    lesson-sort-by-colour: steps=5 voices=12 set=colour-sorting-set
[PASS] completeness: 84 Wave 3 moss voice files on disk -> found=84
[PASS] completeness: the 7 new/reused image files exist and are hashed in the pack manifest
[PASS] completeness: every Wave 3 voice file is hashed in the pack manifest
[PASS] every Wave 3 FINALE_CONFIG target equals its lesson step-5 target
       -> see-how-many->book-3 give-one->ball-1 give-two->red-flower-2 give-three->cup-3
          give-just-right->red-flower-3 copy-the-pattern->ball sort-by-colour->blue-basket
[PASS] session keeps exactly one recordStepEvidence call site
[PASS] session routes evidence through stepEvidenceEntries()
```

**Completeness proof (verified, not asserted):** all 4 new images + 3 reused copies were
sha256-checked byte-identical to their sources; all 84 voice files sha256-match the zip's
`voice-manifest.json`; every step's target and choices resolve inside its lesson's single picture
set; every voice file is hashed in the pack manifest.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (6 distinct queues)
- validator all-packs — 0 errors (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `node dev-harness/lesson-selection-drill.js` — PASS
- `node dev-harness/w3-evidence-drill.js` — PASS (19/19)
- `node dev-harness/engine-groups-rows-drill.js` — PASS (regression)
- `node dev-harness/l6-evidence-drill.js` — PASS (regression)
- `node dev-harness/engine-evidence-drill.js` — PASS (regression)

**Manifest:** `pack_sha256 = 93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a`
(227 files hashed; v0.1.0, draft, band 2-5; deps as above).

## Notes

- **Two prior-drill assertions re-scoped** (not hidden): `engine-groups-rows-drill.js` and
  `engine-evidence-drill.js` each asserted "the new fields are unused by any data". This run
  legitimately makes them used, so those assertions now assert the same intent against pre-Wave-3
  data — count items live only in `counting-groups-set`, rows only in `lesson-copy-the-pattern`, and
  the per-step evidence fields are used only by Wave 3 lessons (4 of the 7 use defaults). The
  "pre-Wave-3 lesson steps unchanged" check still passes over all **63** pre-existing steps.
- **Forced reachability link** (reported, not a semantic claim): `sorting-one-rule.next_skills`
  gained `'subitize'` so the new maths chain is reachable from the pack's entry skill
  (`P-SCHEMA-SKILL-UNREACHABLE` otherwise, because `subitize`'s prereq `sizes-big-little` is a Pack-1
  skill). Maths → maths, no cross-domain link invented.
- **Within-band age note (per spec):** L2c (`give-3`) and L4's AAB/ABB steps are library-age-4
  content wired at band 3-4 with **no gate mechanism**, as instructed.
- **W3-L3 (`lesson-match-the-number`) deferred** and NOT wired; its numeral images/voice remain
  uncopied. **W2-L5 still held**; its 13 voice files remain uncopied. The Wave 2 (b) temporary
  patches (L4→W2-L6 next-skills, W2-L6 fallback → lesson-first-sounds) are **untouched**.
- **Label narration:** the 84-file inventory has no label audio; W3 targets' label narration
  therefore falls back to device TTS (the shared label keys used by the reuse items resolve under
  Moss with no recording). Reported, not "fixed" by generating audio.

## DoD

Founder's phone test via the test-switch procedure: all 7 Wave 3 lessons (groups and pattern rows
are seen on device for the first time here) + regression (2 Wave 1 + 5 Wave 2 lessons) + the L6
parent-map check, then restore `packs/active.json` and play one Pack 1 lesson. No demo lesson was
invented for the engine runs.
