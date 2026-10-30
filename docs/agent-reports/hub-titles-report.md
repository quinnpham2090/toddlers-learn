# Hub node titles + all-done banner honesty — 2026-10-31

## Commit
- This file + `app/index.tsx` only. HEAD parent: e2a8e89.

## What changed (app/index.tsx)
1. Visible node titles on the journey path: every node renders its lesson title
   (`lesson.title_ref`) or, for stops without a lesson, the stop title
   (`stop.title_ref`) under the node. Both refs already existed in pack strings;
   no new copy, no new assets. Titles render for ALL states: current (teal
   #2B6E58), done (ink #33302B), locked (muted #C4BBA5, hollow mark kept,
   disabled kept — F4 untouched).
2. Layout choice: title sits in the same column as the node
   (`nodeWithLabel`, maxWidth 168, centered), fontSize 12.5 (phone) /
   14.5 (tablet), up to 2 lines, marginTop 6. Node sizes (66-96), spacing,
   glyphs, current emphasis, GuideBubble, cards, and buttons are unchanged.
   Per-row growth is ~38pt max (2-line label); the hub keeps its existing
   ScrollView (unchanged behavior); no new scrolling introduced and titles
   stay legible.
3. All-done banner honesty: the top banner pill renders only while a stop is
   actually current (`currentIndex >= 0`); when every lesson is evidenced the
   pill is hidden instead of presenting the last stop's title as current.
   The "You finished all the lessons in ..." banner is unchanged.
4. Tap-to-expand overview card unchanged (still shows stop title + lesson
   title + age band + Start / Play Again).

## Gates
- npx tsc --noEmit — exit 0
- node tools/verify.js — PASS
- node tools/path-divergence-test.js — PASS (6 distinct queues)
- validator all-packs — 0 errors (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- No pack file touched (git diff -- packs/ is empty); active.json untouched.

## DoD (founder phone test)
- Pack 1 hub (after restore) and Pack 2 hub (via test-switch): every node
  labeled and legible; locked nodes hollow + disabled with muted titles;
  all-done state shows no fake current lesson; no scrolling added.
