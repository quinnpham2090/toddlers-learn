# Phase 0 Sign-Off Record — Content-Pack Contract, Validator, Compiler & Preview Harness

**Date:** 2026-10-26  
**Repository:** `quinnpham2090/toddlers-learn`  
**Phase:** Phase 0 (Structure First — Content-Pack Contract Only)  
**App Name / Price / Character Names:** Not invented (placeholder IDs `guide` and `words-guide` used strictly for pipeline verification).

---

## 1. What Passed in Phase 0

### A. JSON Schemas (`/packs/schema/*.json` — JSON Schema Draft 2020-12)
- `packs/schema/manifest.json` — Pack version (semver), schema version (semver), `supported_schema_versions`, `locales_available`, `retired_ids` blocklist, `parent_gate_required`, `demo` flag, per-file SHA-256 (`file_hashes`), and aggregate `pack_sha256`.
- `packs/schema/skill.json` — Domain enum, `is_entry_skill`, acyclic `prerequisites`, `next_skills`, `age_band_min`, `evidence_needed_to_advance` (floor: 3), `catch_up_variant_of` (no chains).
- `packs/schema/lesson.json` — 1 primary skill, at most 2 secondary skills, closed `interaction_type` enum, 1–8 steps, required scaffold levels `0`–`3` (`full_task`, `fewer_choices`, `highlight_and_model`, `do_together_final_tap` with `child_final_tap_required: true`), resolving `character_id` and `picture_set_id`, at most one of `mission_id` / `routine_id`, `estimated_minutes <= chunk_budget_minutes`, required `fallback_lesson_id` and `fallback_picture_id`.
- `packs/schema/song_template.json` — `lesson_word_ref`, `pentatonic_set_id`, `note_slots_total` (6–12), `child_slots` (3–4), `completion_rule_id`, `tempo` (60–120), `timbre`, `name_wordlist_id`, `wordlists`.
- `packs/schema/saved_song.json` — On-device user data contract: note events and deterministic wordlist indices (`name_word_indices`) only; zero voice, photo, child name, or free text.
- `packs/schema/character.json` — Placeholder slug IDs, `name_ref`, `species_or_role`, `originality_attestation` (`attester`, `date`, `derivation_statement` >= 20 chars), `appearance`, `voice_profile`, `personality_lines[]` (string_refs only), `world_home_id`.
- `packs/schema/picture_set.json` — `alt_text_parent_ref`, `depiction_tags` (including safety-blocked tags `small_object`, `sharp`, `hot`, `requires_stairs`), item `size_class` and `passes_choke_tube_proxy`.
- `packs/schema/mission.json` — Resolving `skill_id`, `parent_script_ref`, `child_prompt_ref` (<= 20 words), `team_goal_ref`, `parent_precheck`, `parent_gate_required: true`, `estimated_minutes` (1–5), `cooperative_only: true`, `song_id` / `song_fallback_rule`, `return_ritual_ref` (no proof/judgement language), `safety_notes_refs` (>= 1), 1–3 objects each with mandatory 3-level alternative chain (`object_id` -> `alternative_object_id` -> `fallback_body_action_id`).
- `packs/schema/routine.json` — Closed `anchor` enum, `time_of_day` (at most 1 daily anchor per `time_of_day` per pack), cooperative and 3-level alternative object rules.
- `packs/schema/time_concept.json` — Fixed age ladder (`now_next`, `day_night`, `first_then` -> `2-3`; `morning_afternoon_evening`, `before_after` -> `3-4`; `yesterday_today_tomorrow`, `seasons_cycle` -> `4-5`). Clock-minute, month-order, and abstract-duration have no enum value and cannot be authored.
- `packs/schema/strings.json` — Dot-namespaced `string_ref` dictionary per BCP 47 locale; no partial locales allowed.

### B. Pure Validator (`/tools/validator.js`)
- Zero DOM, fetch, Node, or framework imports.
- All 12 rule families enforced and blocking: `P-SCHEMA`, `P-REF`, `P-ORIG`, `P-UNIV`, `P-SAFE`, `P-AGE`, `P-NOFAIL`, `P-COOP`, `P-NOPII`, `P-MEDIA`, `P-GATE`, `P-COPY`.
- Demo pack `/packs/core` (`demo: true`, all records `status: "draft"`) passes with **0 errors**.
- All **7 negative tests** fail as required with named error rules:
  1. `NEG-1` (Dangling skill reference on lesson) -> Failed with `P-REF-DANGLING-SKILL` (`P-REF`), listing `lesson:lesson-cozy-words-1.primary_skill_id` in `referrers`.
  2. `NEG-2` (Mission missing alternative object chain) -> Failed with `P-UNIV-MISSING-ALTERNATIVE` (`P-UNIV`).
  3. `NEG-3` (Mission script containing `"race"` and `"faster than"`) -> Failed with `P-COOP-BANNED-COPY` (`P-COOP`).
  4. `NEG-4` (Record containing a purchase/price field `price_usd`) -> Failed with `P-SCHEMA-BAN-PURCHASE` (`P-SCHEMA`).
  5. `NEG-5` (Lesson reusing retired slug ID `retired-lesson-old-1`) -> Failed with `P-SCHEMA-RETIRED-ID-REUSE` (`P-SCHEMA`).
  6. `NEG-6` (Skill prerequisite graph with a cycle) -> Failed with `P-SCHEMA-SKILL-CYCLE` (`P-SCHEMA`).
  7. `NEG-7` (Pack with partial locale `es-ES` in `locales_available`) -> Failed with `P-SCHEMA-PARTIAL-LOCALE` (`P-SCHEMA`).

### C. Pure Compiler (`/tools/compiler.js`)
- Zero DOM, fetch, Node, or framework imports.
- Compiles Path A (structured authoring form input) and Path B (CSV/spreadsheet input) into canonical sorted JSON:
  - Path A output: `5998` bytes (`SHA-256: e8f8a9210ea06c283f981679845d2aed6eb7b3a2f1e035d393c5cf240dfaa9ae`)
  - Path B output: `5998` bytes (`SHA-256: e8f8a9210ea06c283f981679845d2aed6eb7b3a2f1e035d393c5cf240dfaa9ae`)
  - Byte-for-byte diff: **0 bytes difference (BYTE-IDENTICAL)**.

### D. Dev-Only Preview Harness (`/app/preview/`) & Schema Authoring Form (`/app/author/`)
- Preview harness loads `/packs/core`, validates all records, plays lesson `lesson-cozy-words-1` end-to-end across scaffold ladder `L0 -> L1 -> L2 -> L3` where the child always makes the final tap, emits zero wrong/fail events, and ends on a win (`"We explored our cozy words together and finished with a song!"`).
- Demonstrates data degradation rules (missing audio -> synth speech from `strings.json`; missing character model -> `guide`; both fail -> narration + generic fallback picture; broken mission -> suppressed and never offered).
- Demonstrates atomic pointer activation and 1-click rollback on `/packs/active.json`:
  - Initial pointer: `active_pack_id: "core"`, `active_pack_version: "0.1.0"`, `previous_pack_id: null`
  - After candidate activation: `active_pack_id: "core-v0-2-candidate"`, `active_pack_version: "0.2.0"`, `previous_pack_id: "core"`
  - After failed validation attempt: aborted atomically; pointer remained `core-v0-2-candidate`
  - After 1-click rollback: `active_pack_id: "core"`, `active_pack_version: "0.1.0"`, `previous_pack_id: null`
- Authoring form (`/app/author/`) dynamically generates its form inputs from `/packs/schema/*.json` and compiles both Form (Path A) and CSV (Path B) inputs through `/tools/compiler.js`.

---

## 2. What Remains Open for Founder Content Authoring

1. **Production Pack Content Creation:** `/packs/core` is strictly a `demo: true` / `status: "draft"` pipeline verification pack using placeholder IDs (`guide`, `words-guide`). Real characters, originality attestations, lessons, missions, routines, and multi-locale translations will be authored through `/app/author/` or spreadsheet CSVs compiled via `/tools/compiler.js`.
2. **App Name & Character Names:** Intentionally left `TBD` / placeholder-only per Phase 0 scope.
3. **Audio & Illustration Production Assets:** Replace placeholder SVG shapes in `/packs/core/assets/` with final original illustrations and recorded voice audio (while retaining synth speech and `guide` model fallbacks).

---

## 3. Next Steps for Kilo (Handoff Instructions)

1. **CLI Wrapping of Pure Tools:**
   - Wrap `/tools/validator.js` (`validate(pack)`) and `/tools/compiler.js` (`compile(input)`) into command-line executables (e.g., `bin/validate-pack` and `bin/compile-pack`) for CI/CD gating without modifying their pure core logic.
2. **Expo App Scaffold (Phase 1 — After Phase 0 Sign-Off):**
   - Follow the frozen **APP BUILD** specification in the project prompt:
     - Scaffold with `npx create-expo-app@latest toddlers-learn --template default` (React Native + Expo managed workflow, TypeScript, Expo Router).
     - Configure `app.json` with `"ios": { "supportsTablet": true }` and responsive `useWindowDimensions` layouts (`> 768px` = 2-column/tablet layout).
     - Add `eas.json` with `development`, `preview`, and `production` profiles.
     - Use only Expo Go-compatible libraries installed via `npx expo install`.
   - Build screens **one at a time** in the mandated order, running `npx tsc --noEmit` after each screen and pausing for phone verification:
     1. Child hub world
     2. Lesson/game session (chunks + scaffold ladder L0–L3 + closing ritual)
     3. Song composer + songbook
     4. Mission briefing + return ritual
     5. Parent dashboard + end-of-day note (bands, not scores)
     6. Parent gate area (settings, sharing, deletion, export)
   - Never embed content in code; load all content exclusively from validated local pack JSON files via `/packs/active.json`.
   - Do not include `/app/preview/` in any shipping mobile bundle.
