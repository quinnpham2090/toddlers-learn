# Mission interleaving — STOPPED at gate 4 (mission inventory), report only (2026-10-31)

**Nothing was written.** Gates 1–3 passed, but gate 4 fails: the **live** pack has **no mission
inventory**. Per the gate — "If the active pack's inventory differs, STOP and report — do NOT invent
missions, routines, art, or voice to fill a gap" — this run stops before any code change.

## Gates

| Gate | Result |
| --- | --- |
| `git pull --ff-only`; HEAD = `cff136f` | PASS |
| Tree clean except the known untracked strays (`.kilo/` gitignored, `AUDIT-REPORT.md`, `pack2-assets.zip`) | PASS |
| `packs/active.json` = `sunny-home-garden-2` (Pack 2 LIVE) | PASS |
| Mission/routine inventory of the ACTIVE pack matches the design (3 missions + 1 routine) | **FAIL — STOP** |

## The blocker (verified in code and data)

The design was verified against 3 missions + 1 routine, but the **active** pack has none:

- `packs/sunny-home-garden-2/missions.json` → `[]` (0 missions)
- `packs/sunny-home-garden-2/routines.json` → `[]` (0 routines)
- `lib/pack-loader.ts:1499-1509` — `getMissions()` = `getActivePack().missions` and `getRoutines()` =
  `getActivePack().routines`, so with Pack 2 live both return **empty**. The Together screen therefore
  shows no missions and no routines.
- The inventory the design was verified against lives in **Pack 1**
  (`packs/sunny-home-garden/`): `mission-tidy-team` (skill `sorting-one-rule`),
  `mission-table-helpers` and `mission-water-plants` (skill `sizes-big-little`) — all age band `3-4`,
  `estimated_minutes: 3`, `parent_precheck.required: true`, `parent_gate_required: true` — plus
  `routine-goodnight-garden` (skill `sizes-big-little`).

### Consequence for the feature

With Pack 2 live, the offer has **zero candidates**: every completed lesson's skills would match no
`mission.skill_id`. Only `sorting-one-rule` exists among the mission skills in Pack 2 (`sizes-big-little`
is a Pack-1 skill), and **none** of the Wave 3 lesson skills (`subitize`, `give-1/2/3/n`,
`pattern-copy`, `pattern-extension`, `beat-patterns`, `what-comes-next`, `sort-by-colour`) has any
mission at all. So the design's mappings ("after a sorting lesson → Tidy Team"; "after a sizes lesson →
Table Helpers or Watering Team") cannot occur on the live pack, and the offer card would never appear.

## What a fix would involve (founder decision — not done here)

Porting/authoring the mission + routine content into Pack 2 is a **content pass**, not this run:

- copy the 3 mission + 1 routine records into Pack 2, plus every string ref they need
  (`title_ref`, `parent_script_ref`, `child_prompt_ref`, `team_goal_ref`, `return_ritual_ref`,
  pre-check prompts, routine refs) — the validator requires all of them to resolve in-pack;
- resolve `skill_id`: `sorting-one-rule` already exists in Pack 2, but `sizes-big-little` does not
  (it would need a Pack-2 skill record or a declared dependency);
- the validator also caps `child_prompt_ref` at 20 words and bans judgement language in
  `return_ritual_ref` — any authored copy must satisfy those;
- rehash the Pack 2 manifest afterwards.

**Options:** (a) do that content pass, then run this feature; (b) build the offer mechanism now and
accept it offers nothing until (a) lands (the selection/cap/state machinery is still fully
drill-testable with synthetic inputs); (c) revert the live pointer to Pack 1 — the founder's call, and
explicitly out of scope for this run ("do not flip it").

## §4 (routines) — verified: ALREADY SATISFIED, nothing to change

The design assumed M4 hid the entire Together lane. Code check:

- `app/together.tsx:150` — `routinesSection` is defined **unconditionally**.
- `app/together.tsx:130` — only `missionsSection` is gated (`const missionsSection = showMissions ? …`).
- `app/together.tsx:201` (phone) / `:183-186` (tablet) — `routinesSection` renders regardless.

So routines are already visible whenever the Together screen is reachable; §4 needs no change, and no
gate hiding routines was found elsewhere. (Noted for completeness: the hub's Together card itself is
gated on `missionsEnabled && missionsOpen` from the M4 pass, so with Pack 2 live and no missions the
lane still opens for routines once the M4 unlock is met.)

## Confirmations

- Nothing written or changed: no code, no packs, no validator, no manifest; tree clean.
- `packs/` untouched; `packs/active.json` untouched (still `sunny-home-garden-2`); bands / queue /
  unlock / maps untouched; no staging created; nothing committed except this report.

## DoD

Blocked. The founder's phone test cannot exercise the feature until the live pack has mission content
(option a) — or the mechanism is built knowingly inert (option b). The three known riders from the
activation run remain in place (W2-L5 held, W3-L3 deferred, Wave 2 (b) temporary patches).
