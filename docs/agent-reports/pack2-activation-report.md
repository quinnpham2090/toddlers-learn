# Pack 2 activation — live pointer flip (2026-10-31)

**Flip commit:** `2260a5a` — "Switch live pack to Sunny Home Garden 2 (Pack 2)" (packs/active.json
only, 9 insertions / 9 deletions, mirroring the Pack 1 live switch `bedab4c`).
**Report commit:** the separate commit that adds this file.

Pack 2 (`sunny-home-garden-2`) is now the live pack. The committed pointer **is** the activation —
the runtime override mechanism (`lib/pack-activation.ts` / override store) was **not** used.

## Pointer values

| Field | Old (Pack 1, now `previous_*`) | New (active) |
| --- | --- | --- |
| `*_pack_id` | `sunny-home-garden` | `sunny-home-garden-2` |
| `*_pack_path` | `/packs/sunny-home-garden` | `/packs/sunny-home-garden-2` |
| `*_pack_version` | `1.0.0` | `0.1.0` |
| `*_pack_sha256` | `5badf83a32dac93b2f6caf68d7152bd5df13c814d156034b5db65140f2df94a8` | `93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a` |
| `updated_at` | `2026-10-27T20:03:02.211Z` | `2026-10-31T17:43:42.633Z` |

- The Pack 1 values were read from the live `packs/active.json` at run time and matched the expected
  Pack 1 pointer (id `sunny-home-garden`, path `/packs/sunny-home-garden`, version `1.0.0`, sha
  `5badf83a…`) before writing.
- The Pack 2 version (`0.1.0`) and `pack_sha256` were read **live** from
  `packs/sunny-home-garden-2/manifest.json` and **freshly verified** by recomputing every
  `file_hashes` entry from the actual files and re-deriving `pack_sha256` (validator's
  utf8-content scheme): recomputed `93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a`
  — **matches the committed manifest**, 227 files, **no stale entries**. No hash was copied from
  chat or an old report.
- Pack 2's manifest **version/status untouched**: stays `0.1.0` / `draft` (exactly as Pack 1's
  manifest stayed `draft` at its live switch).

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS (`ALL PHASE 0 CHECKS PASSED`)
- validator all-packs — 0 errors (core, sunny-home-garden, sunny-home-garden-2, test-switch)
- `node dev-harness/lesson-selection-drill.js` — PASS
- `packs/active.json` parses (valid JSON; read back and confirmed).
- **Loader resolution (static confirmation, no app sighting claimed):** with
  `active_pack_id = sunny-home-garden-2`, `lib/pack-loader.ts` contains the matching
  `PACK_REGISTRY`, `PACK_ASSET_REGISTRY`, and `PACK_VOICE_REGISTRY` entries — so
  `getActivePackId()` → `getActivePack()` resolves the live pack to Pack 2.

## Confirmations

- **Diff is pointer-only:** the flip commit changed exactly `packs/active.json` (9 insertions / 9
  deletions); nothing else was staged or committed.
- Pack 1 data untouched (`git diff -- packs/sunny-home-garden/` empty); Pack 2 data untouched (no
  pack file changed by this run); manifest version/status untouched.
- No code, validator, or dependency changes; no dev server; staging removed; the untracked strays
  (`AUDIT-REPORT.md`, `pack2-assets.zip`, `.kilo/`) were never staged.

## Known riders (flagged, unchanged by this run)

1. **W2-L5 stays held** (`lesson-what-do-you-see` not wired; its 13 voice files remain uncopied).
2. **W3-L3 (`lesson-match-the-number`) stays deferred** (numeral images/voice remain uncopied).
3. **Wave 2 (b) temporary patches are still in place:** L4 skills' `next_skills` point to W2-L6
   skills, and W2-L6's `fallback_lesson_id` is `lesson-first-sounds`. They revert only when W2-L5
   lands.

## DoD — founder phone test on the LIVE pointer

No test-switch restore afterwards. On the phone: the app opens on **Pack 2**, a Wave 3 lesson plays
(groups and pattern rows visible), and the hub shows the **Pack 2 path**. Rollback if the test
fails: revert this flip commit (`git revert 2260a5a`) or use the in-app `rollbackPack` to
`previous_pack_id` — do not leave a broken live pointer up.
