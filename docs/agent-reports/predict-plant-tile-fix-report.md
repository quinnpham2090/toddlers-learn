# Blank plant tile fix (Pack 2 predict lesson) + loader-map completeness guard — 2026-11-01

## HEAD gate

- HEAD at start: **`07fa003`** ("Build per-profile automatic graduation (Pack 2 -> Pack 3)") — matches the prompt gate.
- `git pull --ff-only`: Already up to date. Tree clean apart from the known untracked strays plus `docs/agent-reports/pack3-test-switch-assist-report.md` (written in a previous run at the founder's request; untracked, unstaged, untouched).
- `packs/active.json` read `sunny-home-garden-2` — untouched by this run.

## Diagnosis confirmation (all three true)

- **(a) The file exists:** `packs/sunny-home-garden-2/assets/outdoor-plant.jpg` (46,177 bytes).
- **(b) Hashes match:** validator-scheme sha256 `b3b03f8f9c351aa92b2e22cdcf1f2d3aef458a297835675d6501d8e8d49ee8be` — matches the manifest `file_hashes` entry **and** both set records that reference it (`home-things-set`, `predict-set`).
- **(c) The Pack 2 loader map had no entry:** the only `outdoor-plant` import + map entry in `lib/pack-loader.ts` belonged to **Pack 1's** map (`import outdoorPlantJpg from '../packs/sunny-home-garden/assets/outdoor-plant.jpg'`, `'assets/outdoor-plant.jpg': outdoorPlantJpg`). Pack 2's `PACK_ASSET_REGISTRY` block had none, so `getPackAsset('sunny-home-garden-2', 'assets/outdoor-plant.jpg')` returned `undefined` and the choice tile rendered blank. A Pack 2 loader gap, not a missing asset and not a graduation regression.

## The fix (map entries only — no pack files)

In `lib/pack-loader.ts`:

1. `import sunny2OutdoorPlantJpg from '../packs/sunny-home-garden-2/assets/outdoor-plant.jpg';` (placed with the other Pack 2 image imports).
2. `'assets/outdoor-plant.jpg': sunny2OutdoorPlantJpg,` added to Pack 2's map in `PACK_ASSET_REGISTRY` (Pack 2's block only — Pack 1's and Pack 3's maps untouched).

**No pack file changed** (`git diff -- packs/` empty); no pointer change; no session rendering change; no other lesson change. The whole code diff is `lib/pack-loader.ts` (+46 lines).

## Systemic guard + the additional gap it surfaced

New `dev-harness/loader-map-completeness-drill.js` extracts each pack's `PACK_ASSET_REGISTRY` keys from the real source (brace matching) and asserts every `asset_path` referenced by that pack's `picture_sets.json` item records resolves in that pack's map.

**It found 22 more missing Pack 2 entries — all the same gap class** (file already in `packs/sunny-home-garden-2/assets/`, `home-things-set` already references it, map entry missing; `watering-can` is also referenced by `explain-set`). All 22 were fixed in this run (map entries + imports only — no new files, no new records), because each satisfies the spec's same-class criterion:

| pack | asset_path | referenced by | file exists |
| --- | --- | --- | --- |
| sunny-home-garden-2 | `assets/laundry-basket.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/cardboard-box.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/flat-towel.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/soft-toy.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/book-stack.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/clean-socks.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/plastic-plate.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/paper-plate.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/placemat.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/plastic-cup.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/paper-cup.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/cloth-napkin.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/paper-towel-sheet.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/tea-towel.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/watering-can.jpg` | home-things-set, explain-set | yes |
| sunny-home-garden-2 | `assets/damp-cloth.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/indoor-plant.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/night-lamp.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/closed-curtains.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/quiet-book.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/song-time-card.jpg` | home-things-set | yes |
| sunny-home-garden-2 | `assets/helping-hands.jpg` | home-things-set | yes |

These were the same Wave 6 / mission-port copy gap as `outdoor-plant` (records copied, loader entries never added). **23 Pack 2 map entries fixed in total** (outdoor-plant + these 22). No other pack had a missing entry (core, Pack 1, Pack 3 and test-switch all pass: 7 / 53 / 38 / 7 asset paths checked).

**Drill fix (within the "drills" scope, reported):** the first version of the completeness drill matched only quoted pack-map keys, so it falsely flagged `core` (whose map key is unquoted, `core: {`). The drill now accepts unquoted keys too; `core` passes with its 9 assets already mapped. No product code changed for that.

## Gates

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS
- `node tools/path-divergence-test.js` — PASS (6/6)
- validator all-packs — **0 errors** (core, Pack 1, Pack 2, Pack 3, test-switch)
- `expo-doctor` — **no new failures** (19/20; the same pre-existing dependency patch drift; no dependency changes)
- All prior drills PASS (lesson-selection, mission-offer, l6-evidence, engine-groups-rows, engine-evidence, w3-evidence, pack-activation, w2-l5-wiring, notice-title-fix, w4-wiring, w5-wiring, w6-wiring, w8-wiring, w7-wiring, graduation)
- `node dev-harness/loader-map-completeness-drill.js` — **ALL LOADER-MAP COMPLETENESS CHECKS PASSED**
- **Pack 1 diff EMPTY, Pack 2 diff EMPTY, Pack 3 diff EMPTY; `packs/active.json` untouched.**

## What did NOT change

- No pack file (lessons, skills, sets, strings, manifest, assets) — `git diff -- packs/` empty.
- No pointer change; no session rendering change; no other lesson change.
- No dependency changes; no dev server.

## DoD (founder phone test — REQUIRED)

Replay `lesson-what-will-happen-if` step 2: the plant tile now shows the plant picture alongside the ball picture, and tapping the plant celebrates ("The plant gets wet!"). No other lesson, step, or tile changes. This fix is independent of the graduation build — it repairs a pre-existing Wave 6 loader gap that the graduation phone test surfaced.
