# Wave 2 wiring report (W2-L5 held) — 2026-10-30

## Scope
- Wired: 5 lessons (words-that-sound-the-same, finish-the-rhyme, clap-the-beats, first-sounds, name-it-together) + 10 new skill records + 4 new picture sets + strings for every ref.
- HELD per founder decision (option b): W2-L5 lesson-what-do-you-see (0 records, 0 files). Blocking reason: lib/path-graph.js maps both its skills (what-do-you-see, notice-with-choices) to domain science with provisional: true (lines 367-371, 381-385) — the Wave 2 binding domain check forbids a science stop; the decision is deferred to the science research pass or a founder re-filing that reconciles the adventure usage.

## Temporary patches (revert when W2-L5 lands)
1. L4 skills next_skills -> W2-L6 skills: onset-rime-prep -> [name-with-grown-up (new temp) + initial-sound-matching (graph-chain fix)]; initial-sound-matching -> [name-with-grown-up-choice (temp) + which-starts-with (chain)]; which-starts-with -> [name-with-grown-up-choice (temp)]. Normal targets: notice-with-choices / what-do-you-see.
2. L6 fallback_lesson_id -> lesson-first-sounds (normal: lesson-what-do-you-see). fallback_picture_id stays everyday-objects-set.
3. All three recorded in manifest notes_author; revoke on the W2-L5 pass.

## Validator carve-out (Decision 1, founder-authorized)
- Verified real in-tree W2-L3 key families and values:
  - `lesson.clap_the_beats.step_1.celebration` = "You tapped 1 beat — cup has 1 beat!"
  - `lesson.clap_the_beats.step_2.celebration` = "You tapped 1 beat — book has 1 beat!"
  - `lesson.clap_the_beats.closing_win` = "You clapped every beat!"
  - `picture_set.beat_dots.title` = "Beat Cards"
  - `item.beats_1.label` = "One beat."
- Carve-outs added (musical-beat vocabulary only; competitive uses stay banned): sKey.startsWith("lesson.clap_the_beats.") OR "picture_set.beat_dots." OR "item.beats_1." — each verified exclusive to lesson-clap-the-beats (beat-dots-set referenced by no other lesson; beats_1 item exists only in beat-dots-set).

## Decision 2 — L6 evidence number rationale
- evidence_needed_to_advance = 3 on name-with-grown-up / name-with-grown-up-choice is SCHEMA-ONLY (the validator floor, P-SCHEMA-SKILL-EVIDENCE-FLOOR, requires a number >= 3 on every skill). The bands engine never reads this field; isQualifying() excludes completed_with_help records. Caveat stated plainly: the generic lesson flow writes completed_with_help = (scaffoldLevel === 3), so L0-L2 completions write strong-looking records; the no-banding guarantee for L6 therefore rests on the founder banding decision (flagged, not decided here), not on a mechanism.

## Beats wiring (W2-L3 shape)
- beat-dots-set = 8 items per the spec bank: 5 spoken-word items (beats-1-cup, beats-1-book, beats-2-flower, beats-2-garden, beats-3-banana — each labeled with its word; audio: Cup/Book = Pack 1 registry references, Flower/Garden/Banana = zip files) + 3 dot-card items (beats-1/2/3, labels "One beat."/"Two beats."/"Three beats." — never targets, never narrated). Step targets = word items (per-step label narration works); choices render the same three dot cards; FINALE target = beats-3-banana (step 5 target; finaleStep lookup finds it).

## Frog label dedup
- W2-L1-n12 and W2-L4-n15 are both the word "Frog!"; one file placed (W2-L4 take), one registry key (item.frog.label) serves both lessons. W2-L1-n12 zip row intentionally unused.

## Manifest
- pack_sha256: 5e6326503375952e4c28e287e966245dcf08785dea2bb6b3884660878453c05b
- dependencies: colour-naming, sizes-big-little (Pack 1 ladder refs, Wave 1 pattern) + lesson-hello-cup (W2-L1 cross-pack fallback).
- 136 file entries, hashes via the validator utf8-content scheme.
