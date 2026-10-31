# Mission interleaving — report (2026-10-31)

**This report supersedes the v1 STOP report (commit `d6641e6`).** v1 stopped at gate 4 because the
live pack had no mission inventory; the port run (`7dbacb4`) landed the 3 missions + 1 routine in
Pack 2, so this run built the feature.

Commit: the single commit that adds this file — `git log --oneline -1`.
Message: `Mission interleaving: post-path-lesson Together offer card (selection, day cap, rotation)`

## Files created / changed (code only)

| File | Change |
| --- | --- |
| `lib/mission-offer.js` + `.d.ts` | **new** — pure selection helper (the single source of truth; the drill imports the same function) |
| `lib/mission-offer-state.ts` | **new** — persisted per-profile offer state (mirrors `lib/path-state.ts`) |
| `lib/path-lesson-signal.ts` | **new** — in-memory "a path lesson just completed" signal |
| `app/session.tsx` | +2 lines: on a completed POST-ADVENTURE PATH session, mark the completion signal with the lesson's skill ids (primary first) |
| `app/index.tsx` | offer selection in the focus effect + `MissionOfferCard` + styles + 2 code-only labels |
| `app/together.tsx` | accepts `?offer=<missionId>` and pre-selects it through the **existing** `pending` → `ParentGate` → `/mission` flow |
| `dev-harness/mission-offer-drill.js` | **new** proof drill (19 checks) |
| `docs/agent-reports/mission-interleaving-report.md` | this file |

No pack file changed (`git diff -- packs/` empty). `lib/mission-unlock.ts` and the mission route's
own unlock backstop are untouched.

## The behavior (as built)

- **Trigger:** only a completed **post-adventure PATH** session sets the signal (`pathSelection?.active`
  in `app/session.tsx`) — never the adventure, never between steps, never a pre-path lesson, never a
  cold start (the signal is **in-memory only**, `lib/path-lesson-signal.ts`, cleared on consume).
- **Placement:** ONE `MissionOfferCard` in the hub's action section, rendered **alongside** the
  next-lesson `StartButton` (`{missionOfferId && guide ? …}` after `<StartButton>`); the Start button
  is never replaced. The card is a `GuideBubble` invitation (`"Play together?"`) + the mission title
  (existing pack string) + `Open` / `"Not now"`.
- **Frequency cap:** at most one offer per visit-day, keyed by the **existing**
  `adventureLocalDateKey(new Date())` (`lib/adventure-store.ts:47` — the same helper path-queue and
  adventure use). The day is consumed at **offer** time (`recordMissionOffer`), so a dismiss is simply
  `setMissionOfferId(null)` — no re-offer that day, no completion record.
- **Which mission:** `selectMissionOffer` iterates the completed lesson's skills **primary first**;
  within a skill it drops the last-offered mission id (so two same-skill missions alternate =
  least-recently-offered, and a single-mission skill is never offered twice in a row); no match →
  `null`, and because the helper is **pure** nothing is written, so the day is **not** consumed.
- **Age gate:** the app's **existing** age signal — `adventureAge(loadAdventureQuestionnaire())`
  (`lib/adventure-parent.ts:75-77`, the parent questionnaire's age, already used by path-queue and the
  placement map) — gated to **3–4**, plus the mission's own `age_band` must include the child's age.
  No new age question was invented and age is not inferred from lesson history.
- **Tap:** the card pushes `/together?offer=<missionId>`; `app/together.tsx` sets its existing
  `pending` target from the param, so the **existing** ParentGate → briefing → pre-check →
  device-down → return ritual runs unchanged. No second briefing flow was built. The alternative
  chain stays always available, and the mission route's unlock backstop is intact.
- **Completion:** unchanged — `app/mission.tsx` still writes exactly one `recordCompletion(...)`; no
  band, queue, unlock, or path-session effect.

### Offer state (new, separate from completions)

`mission-offer-state-<profile>.json`:
`{ profile_id, last_offer_day_key, last_offered_mission_id, saved_date }` — profile-keyed like
`path-state`, validated on load, defaulting safely. It never touches
`together-completions.json` (the drill asserts the two files are disjoint).

## Proof — `dev-harness/mission-offer-drill.js` (19/19 PASS)

Uses the **real** helper on the **real** live-pack records, plus source assertions for the
store/caller boundaries.

```
[PASS] live pack offers exactly the ported 3 missions (2 share sizes-big-little)
[PASS] a sorting lesson offers Tidy Team
[PASS] a sizes lesson offers a sizes mission
[PASS] primary skill wins over secondary (primary first)
[PASS] rotation alternates between the two sizes missions -> mission-table-helpers -> mission-water-plants -> mission-table-helpers
[PASS] the only mission for a skill is NOT offered twice in a row -> null
[PASS] a lesson whose skill has no mission offers nothing -> null
[PASS] the selection helper is pure (no I/O), so a null result cannot consume a day
[PASS] the hub records the offer ONLY when a mission was selected
[PASS] a second offer on the same visit-day is refused -> null
[PASS] a later day may offer again
[PASS] age gate: only 3-4 offers (2 and 5 refused)
[PASS] offer state is a separate file from together-completions.json
[PASS] the dismiss handler only clears the card (no completion write)
[PASS] mission completion writes exactly one completion and no band/queue evidence
[PASS] the completion signal is set only for post-adventure PATH sessions
[PASS] the completion signal is in-memory only (no cold-start offer)
[PASS] the offer card renders alongside the next-lesson button (never instead)
[PASS] tapping the offer reuses the Together ParentGate flow (no second briefing flow)
```

## §4 (routines) — verified: ALREADY SATISFIED, nothing changed

Re-confirmed against code: `app/together.tsx:150` defines `routinesSection` **unconditionally**, and
it renders at `:201` (phone) / `:183-186` (tablet); only `missionsSection` is gated (`:130`,
`showMissions`). So routines are already visible whenever the Together screen is reachable — §4 needs
no change, and **no other gate hiding routines was found**.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (6 distinct queues)
- validator all-packs — 0 errors (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `node dev-harness/lesson-selection-drill.js` — PASS
- `node dev-harness/mission-offer-drill.js` — PASS (19/19)

## Notes / flagged consequences

- **Single-mission skill:** `sorting-one-rule` has only Tidy Team, so a sorting lesson on two
  consecutive days offers nothing on the second day (the literal "never twice in a row" rule). The
  day is not consumed by the refusal. Flagged, not worked around.
- **Age gate default:** `adventureAge` returns `3` when no questionnaire exists, which is inside the
  3–4 band — so an un-questionnaired profile on an established path can receive offers. Reported as
  the consequence of reusing the existing signal rather than inventing a new one.
- **Code-only copy:** the card's two new labels (`"Play together?"`, `"Not now"`) are UI constants in
  `app/index.tsx`, not pack strings; the mission title comes from the existing pack string.

## Confirmations

- **Packs untouched** (`git diff -- packs/` empty); no missions, routines, lessons, skills,
  picture-sets, strings, or manifest changed.
- **Bands, queue, unlock, child-map, parent-map unchanged**; `lib/mission-unlock.ts` and the mission
  route's unlock backstop untouched; the Together briefing/pre-check/device-down/return flow itself
  unchanged (only the offer param + card added around it).
- No dependency changes; no dev server; `packs/active.json` untouched (still `sunny-home-garden-2`);
  staging removed.

## DoD — founder phone test on the LIVE pointer

Play a path lesson → the card appears **alongside** (never instead of) the next lesson → dismiss it →
the next lesson is still one tap away and there is **no re-offer that day** → on a later day accept it
→ the full mission flow runs (ParentGate → briefing → pre-check → device-down → return) → the return
lands back on the path → the mission is recorded in `together-completions.json` with **no band or
queue movement** (check the parent map). This test also covers the ported mission flow: the Together
lane must list the **3 missions + 1 routine**, and the mission's briefing, pictures, and song must
render.
