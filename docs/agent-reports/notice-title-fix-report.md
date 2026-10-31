# notice-with-choices title_ref fix — report (2026-10-31)

## What this run is

The W2-L5 wiring run (`f9698cb`) flagged, but did not fix, one gap: the `notice-with-choices` node in `lib/path-graph.js` had `title_ref: null`, so the parent map could not resolve a title for that node. The string it needs already ships in Pack 2. This run points the node at it, proves the title resolves, and reports. Nothing else changes.

## Verify-first gates (all pass)

- `git pull --ff-only` — **Already up to date** (no conflicts).
- HEAD — **`8b598dd`** ("Point Pack 2 yellow-cup/green-leaf asset registry at Pack 2 copies"). Matches the required gate.
- `git status --short` — clean apart from the known untracked strays (`AUDIT-REPORT.md`, `pack2-assets.zip`; `.kilo/` runtime state). Nothing else uncommitted or staged.
- `packs/active.json` — **`sunny-home-garden-2`** (Pack 2 live). Untouched by this run.
- Pre-check: the `notice-with-choices` node was `title_ref: null` at line 386; `skill.notice_with_choices.title` already exists in `packs/sunny-home-garden-2/strings.json` = `"Noticing with Choices"`.

## The one-line diff

```diff
--- a/lib/path-graph.js
+++ b/lib/path-graph.js
@@ -383,7 +383,7 @@ export const PATH_GRAPH = Object.freeze([
     min_age: 3,
     entry: false,
     provisional: true,
-    title_ref: null,
+    title_ref: 'skill.notice_with_choices.title',
     next: ['what-do-you-see'],
     catch_up: null,
     consolidation_contexts: ['new-item-set'],
```

Exactly one line, on exactly one node. No string added, edited, or removed; no new copy invented.

## Why this exact value

The parent map resolves a node title via `node.title_ref` (`lib/adventure-map.ts` — the `if (node?.title_ref)` branches in `targetTitle`/`skillTitle`) and falls through when it is `null`. Pointing at the existing Pack 2 skill string is the minimal fix: it reuses founder-approved copy and changes no queue, band, or lesson behaviour, because `title_ref` is display-only — it is never read by the path queue, the bands engine, or lesson selection (proved below).

## Proof (runnable, not reasoning)

New script `dev-harness/notice-title-fix-drill.js` (imports the REAL `lib/path-graph.js` and reads the REAL Pack 2 `strings.json`; resolves the node title exactly as the parent map does: `strings[node.title_ref] ?? node.title_ref` against the active pack).

```
[PASS] notice-with-choices node exists
[PASS] active pack is sunny-home-garden-2 (string source)
[PASS] title_ref is skill.notice_with_choices.title -> skill.notice_with_choices.title
[PASS] resolved title is "Noticing with Choices" -> Noticing with Choices
[PASS] resolved title is not null
[PASS] resolved title is not the raw ref
[PASS] resolved title is not the node id
[PASS] the referenced string already exists in Pack 2 (no new copy invented)
[PASS] no snapshot node disappeared
[PASS] every other node title_ref unchanged (only notice-with-choices differs)
[PASS] node count unchanged from snapshot -> 29 vs 29

ALL NOTICE-TITLE-FIX CHECKS PASSED
```

The "every other node unchanged" check diffs the live node list against a frozen snapshot of every node's `title_ref` captured from HEAD **before** the fix; only `notice-with-choices` (`null` → `skill.notice_with_choices.title`) may differ.

## Gates (all pass)

- `npx tsc --noEmit` — exit 0
- `node tools/verify.js` — PASS (ALL PHASE 0 CHECKS PASSED)
- `node tools/path-divergence-test.js` — PASS, `[PASS] All 6 synthetic profiles produce different queues` + `ALL CHECKS PASSED`
- validator all-packs — **0 errors** (`core`, `sunny-home-garden`, `sunny-home-garden-2`, `test-switch`)
- `node dev-harness/notice-title-fix-drill.js` — **ALL NOTICE-TITLE-FIX CHECKS PASSED**

**title_ref cannot change queue order — proved, not asserted:** `grep -c title_ref` returns **0** for `lib/path-queue.ts`, `lib/path-queue-engine.js`, `lib/bands.js`, and `lib/lesson-selection.js`. The field is read only by `lib/adventure-map.ts` for display, so no queue, band, or lesson-selection behaviour can depend on it; the 6/6 divergence result is therefore unchanged by construction.

## Diff review

`git diff` shows **exactly** the one line in `lib/path-graph.js`. Staged files are only `lib/path-graph.js`, `dev-harness/notice-title-fix-drill.js`, and this report. `AUDIT-REPORT.md`, `pack2-assets.zip`, `.kilo/`, and `packs/active.json` are not staged.

## No other change

- **No other node** changed (snapshot-proven: only `notice-with-choices.title_ref` differs; node count 29 → 29).
- **No other file** changed: no loader change, no session change, no adventure-map change, no manifest change, no Pack 2 JSON change, no Pack 1 change, no `active.json` change, no dependency change, no copy/asset/voice change.

## DoD

Gates green + proof green + report committed and pushed. No dedicated phone test is required for this run: it is a one-line pointer to an already-shipped string, proven by the runnable check, with no layout, lesson, asset, or behaviour change. The title shows up for eyeball confirmation at the next major test session (the Wave 4 test), not as a separate session.
