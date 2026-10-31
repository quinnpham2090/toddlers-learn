# Wave 3 wiring report — STOPPED (v2 run) at the evidence-model blocker (2026-10-31)

**This report supersedes the 2026-10-30 stopped report (commit a59306d).** The 2026-10-30
group/pile blocker **is resolved** by engine commit `210892c` (picture-item `count` groups +
`LessonStep` pattern rows) — that blocker did **not** stop this run, and no new art was added for
it.

This v2 run stops at a **different, evidence-side blocker**: the lesson evidence model writes
**one skill per lesson** (the lesson's primary) for every step, with weight derived only from the
scaffold. The Wave 3 spec's evidence requirements need **per-step skill attribution** and a
**per-step participation mark**, which the engine does not have. The prompt's binding rule —
"If any half fails, STOP, do not commit" — therefore applies.

**Nothing was wired.** No files copied, no records, no manifest change, no loader/session change,
no staging left, no commit except this report.

## Gates (all passed before the evidence check)

- `git pull --ff-only` — up to date; HEAD `210892c` ✓ (the 2026-10-30 report commit `a59306d` is in
  the tree, report-only, as the prompt notes).
- Tree clean except the known untracked strays (`.kilo/` gitignored, `AUDIT-REPORT.md`,
  `pack2-assets.zip`) ✓
- `packs/active.json` = `sunny-home-garden` (Pack 1 live) ✓
- `pack2-assets.zip` present; `image-manifest.json`, `voice-manifest.json`, `voice-manifest.csv`
  readable ✓

## The blocker (file/line evidence)

The lesson evidence path carries **no per-step skill** and **no per-step weight/participation**:

- `lib/progress-store.ts:16-20` — `NewSkillEvidence` is exactly
  `{ skill_id, scaffold_level_at_completion, completed_with_help }`. No weight, no participation.
- `app/session.tsx:299-303` — `StepOutcome` is exactly
  `{ stepIndex, scaffoldLevelAtCompletion, completedWithHelp }`. No per-step skill.
- `app/session.tsx:1124-1128` — the single `recordStepEvidence` call maps every step outcome to
  `skill_id: lessonPrimarySkillId` (one skill for the whole lesson).
- `lib/pack-loader.ts:387-395` — `LessonStep` has no `skill`/`weight`/`participation` field.
- `lib/pack-loader.ts:426` — `secondary_skill_ids` is declared on the lesson record but is **never
  used for evidence** (the writer only reads the primary).
- The only weight fields in the repo are **adventure-only**
  (`lib/pack-loader.ts:1422-1423` `weight_strong` / `weight_participation`).

### Consequence — the required drill halves cannot pass (run and measured)

I fed the session's real output shape through the real band engine
(`lib/bands.js` `evaluateBands`, no mocks):

```
(a) L1 step-5-only @scaffold0 -> subitize qualifying=1 band=exploring   [spec requires ZERO qualifying]
(b) L2d five steps -> give-n qualifying=5; give-1/2/3 = NO RESULT / NO RESULT / NO RESULT
    [spec requires step2->give-1, steps1+4->give-2, steps3+5->give-3]
(c) L5 play -> colour-naming result: ABSENT (secondaries are never evidenced)
    [spec wants "practised only, not banded"]
```

- **(a) fails:** L1 step 5 is meant to be "participation only (counted, not subitized)". With the
  current engine, step 5 writes the same qualifying `subitize` evidence as steps 1–4 at scaffold 0–1
  (`qualifying=1`). There is no per-step participation field, and the lesson-level
  `evidence_help_only` flag (L6 precedent) would wrongly de-qualify steps 1–4 too.
- **(b) fails:** L2d's primary is `give-n` with secondaries `give-1/2/3`, and the spec wants each
  step attributed to the matching secondary as well. The writer attributes **all** steps to
  `give-n`; `give-1/2/3` receive **no evidence at all** (`NO RESULT`).
- **(c) passes only trivially:** colour-naming is never banded in L5 because secondaries are never
  evidenced at all — a side effect of the primary-only writer, not the designed "practised only, not
  banded" mechanism.

### The prompt's own contract contradicts its drill

The engine contract in this prompt states: *"Groups and rows are DISPLAY ONLY — evidence is
unchanged (one recordStepEvidence call site, keyed by the lesson's primary skill; target matching by
item id)."* The evidence drill in the same prompt requires per-step skill attribution (b) and
per-step participation (a). Both cannot hold at once, so this run stops rather than inventing an
engine change the prompt did not authorize.

## Recommended fix (founder decision) — Option A: per-step evidence metadata

A small, backward-compatible engine addition mirroring the L6 `evidence_help_only` precedent:

1. `LessonStep.evidence_skill_ids?: string[]` — extra skills this step also evidences (default: none;
   the lesson primary is always written as today). Satisfies L2d (`step 2 → ['give-1']`,
   `steps 1+4 → ['give-2']`, `steps 3+5 → ['give-3']`).
2. `LessonStep.evidence_participation?: boolean` — when true, the step's evidence is marked
   participation (never qualifying). Satisfies L1 step 5 and L5's colour-naming
   ("practised only, not banded").
3. Plumb both through `StepOutcome` → `NewSkillEvidence` (add an optional `participation` flag) →
   progress-store record → path-queue weight `'participation'` → `isQualifying()` exclusion (already
   excludes participation). Validator: named rules for the two new optional step fields
   (resolution + boolean type).
4. Display is untouched; the L6 help-only rule is unchanged.

Option B (alternative): re-spec Wave 3's evidence to the engine's one-skill-per-lesson model (drop
the step-5 participation requirement and the per-step secondary attribution), accepting that
`give-1/2/3` and `colour-naming` are declared-but-never-evidenced secondaries.

## What was verified ready for the wiring run (unchanged by this stop)

- All 7 lessons / 35 steps / 84 voice files / 4 new images / 9 reuse copies were **not** touched.
- Previously verified by the 2026-10-30 run and still true: the zip's 4 Wave-3 images and 84 voice
  files are present and sha256-match the zip manifests; `beat-patterns` maps to **language** in
  `lib/path-graph.js` (the spec's check → language wins); the validator has **no** lesson tile/row
  bank counter (the ≥6 rule is adventure-only); all 10 new skills already have same-name path nodes
  and no `PACK_SKILL_TO_PATH` entries are strictly required; the spec file
  `preschool-app-pack2-content/wave3-spec.md` is absent from repo and zip (the inline spec is
  authoritative).
- Also noted for the wiring run: the counting lessons (L1, L2a–d) share one item pool
  (ball/cup/spoon/book/red-flower/yellow-flower × counts 1–3), so **one** `counting-groups-set`
  record can serve all five lessons under the "one picture_set_id per lesson" rule (each lesson
  still references exactly one set; no lesson spans two sets). L4 needs a `pattern-set`
  (7 reused singles + 3 beat tiles); L5 needs a `colour-sorting-set` (3 baskets + 3 flowers).
  Pack 2's manifest dependencies will need `sizes-set`, `sorting-set`, and `lesson-big-little`
  (cross-pack fallback/preview refs), mirroring the Wave 1 declared-deps pattern.

## Confirmations

- Pack 1 untouched (`git diff -- packs/sunny-home-garden/` empty).
- No Pack 2 lessons/skills/records wired; no manifest change; no loader/session/validator change.
- Wave 2 (b) temporary patches still in place (untouched); W3-L3 deferred and NOT wired; W2-L5 still
  held.
- `packs/active.json` untouched (still `sunny-home-garden`; Pack 2 NOT active).
- No dependency changes; no dev server; no staging; nothing committed except this report.

## DoD

Unchanged from the prompt, and **blocked**: no phone test is possible because no lessons were wired.
The Wave 3 wiring run cannot proceed until the evidence-model decision (Option A or B) is made.
