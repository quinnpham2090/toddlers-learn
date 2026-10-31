# Mission offer rotation relax — report (2026-10-31)

Commit: the single commit that adds this file — `git log --oneline -1`.
Message: `Relax mission offer block to back-to-back days only (single-mission skills no longer starved)`

## Old vs new block condition (exact)

**OLD (rejected):** a candidate was blocked iff `candidate === lastOfferedMissionId`, with no
reference to when it was offered — so a single-mission skill (Tidy Team for `sorting-one-rule`) was
offered once and then refused indefinitely.

**NEW:** a candidate is blocked iff **both** hold:

```
candidate === lastOfferedMissionId
AND lastOfferDayKey is exactly ONE CALENDAR DAY before todayKey
    (local YYYY-MM-DD arithmetic via Date.UTC day numbers — month/year boundaries included)
```

- If `lastOfferDayKey` is `null` → no block.
- "Back-to-back" = consecutive **calendar** days, never visit-days (no visit history exists or was
  invented).
- The day cap is unchanged (an offer already made today → `null`).
- Everything else unchanged: age gate 3–4, skill preference primary-first, sorted deterministic pick,
  no-match → `null` with the day **not** consumed, and the helper stays **pure** (a null result writes
  nothing).

Implementation: `lib/mission-offer.js` gained a private `dayNumber`/`isPreviousCalendarDay` pair and
the loop's filter became
`(id) => !(backToBack && id === lastOfferedMissionId)` where `backToBack` is computed once from
`lastOfferDayKey`/`todayKey`.

## Files changed

| File | Change |
| --- | --- |
| `lib/mission-offer.js` | the block condition + a doc-comment update (the only logic change) |
| `dev-harness/mission-offer-drill.js` | 2 cases re-scoped + the 7 worked examples added |
| `docs/agent-reports/mission-offer-rotation-relax-report.md` | this new report |

**No state-shape change and no signature change:** `lib/mission-offer-state.ts` and
`lib/mission-offer.d.ts` are **untouched** (`git diff` empty for both); the rule is derived entirely
from the existing `last_offer_day_key` + `last_offered_mission_id` + `todayKey`. No pack changes
(`git diff -- packs/` empty). No hub/Together/flow changes.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (6 distinct queues)
- validator all-packs — 0 errors (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `node dev-harness/lesson-selection-drill.js` — PASS
- `node dev-harness/mission-offer-drill.js` — PASS (**26/26**)

## Drill: changed cases named

1. **`rotation alternates between the two sizes missions` (case b) — RE-SCOPED, same intent.** The
   old case passed only `lastOfferedMissionId` (no day key), which under the relaxed rule means "no
   back-to-back" and would have picked the same mission. It now passes the previous day's key
   (`DAY1`/`DAY2`), so it still asserts alternation with the correct new inputs.
2. **`the only mission for a skill is NOT offered twice in a row` (case c) — REPLACED, not dropped.**
   It asserted the old **indefinite** block (no day key). It is superseded by the binding worked
   examples below, which cover both the back-to-back block and the gap that breaks it.
3. **Added: the 7 binding worked examples** (all pass):
   - ex 1 day 1 sorting → Tidy Team
   - ex 2 day 2 sorting → `null` (back-to-back; day not consumed, state unchanged)
   - ex 3 day 3 sorting → Tidy Team again (the skipped day broke the row)
   - ex 4 sizes alternation: Table Helpers → Watering Team → Table Helpers
   - ex 5 a 4-day gap → the same mission is allowed again
   - ex 6 a second lesson the same day → `null` (day cap unchanged)
   - ex 7a `2026-10-31` → `2026-11-01` → BLOCKED (month boundary); ex 7b `2026-10-30` → `2026-11-01`
     → ALLOWED

All other cases (skill preference, primary-first, no-match, purity, hub-writes-only-on-offer,
same-day cap, age gate, state separation, dismiss, completion, trigger placement, cold-start,
alongside-the-button, ParentGate reuse) still pass unchanged.

## Drill output (tail)

```
[PASS] worked ex 1: day 1 sorting offers Tidy Team
[PASS] worked ex 2: day 2 sorting offers NOTHING (back-to-back; day not consumed, state unchanged)
[PASS] worked ex 3: day 3 sorting offers Tidy Team again (the skipped day broke the row)
[PASS] worked ex 4: sizes missions alternate across consecutive days -> mission-table-helpers -> mission-water-plants -> mission-table-helpers
[PASS] worked ex 5: a 4-day gap allows the same mission again
[PASS] worked ex 6: a second lesson the same day offers nothing (day cap unchanged)
[PASS] worked ex 7a: last offer 2026-10-31, today 2026-11-01 -> BLOCKED (month boundary)
[PASS] worked ex 7b: last offer 2026-10-30, today 2026-11-01 -> ALLOWED
=== MISSION OFFER DRILL PASSED ===
```

## Confirmations

- Packs untouched (`git diff -- packs/` empty); no bands, queue, unlock, child-map, parent-map, hub
  layout, Together-flow, or briefing/pre-check changes.
- No new dependencies, no new state fields, no new records; the offer state file format is unchanged.
- `packs/active.json` untouched (still `sunny-home-garden-2`); staging removed; nothing committed
  except this run's files.

## DoD — stated honestly

The multi-day sequence (day 1 → day 2 → day 3, the gap case, and the month boundary) is **drill-proven,
not phone-proven**: a phone test cannot span three days in one sitting. **No 3-day phone test is
claimed.** The founder's already-owed combined phone test remains the device DoD for the card flow in
general: play a path lesson → the card appears alongside the next lesson → dismiss → next lesson one
tap away with no re-offer that day → accept on a later day → the full mission flow with pre-check →
return lands on the path → recorded in `together-completions.json` with no band or queue movement.
