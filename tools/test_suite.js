/**
 * Phase 0 Negative Tests & Compiler Equivalence Fixtures
 * Pure data module (no DOM, no fetch, no framework imports) shared by CLI verification and the preview harness.
 */

import { validate } from './validator.js';
import { compile, rowsToCsv } from './compiler.js';

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Run all 7 mandatory negative validator tests against a valid base pack.
 * Every negative test MUST fail with a named error rule.
 */
export function runNegativeTests(basePack) {
  const cases = [
    {
      id: 'NEG-1',
      title: '1. Lesson referencing a skill id that does not exist (dangling reference)',
      expected_family: 'P-REF',
      expected_rule: 'P-REF-DANGLING-SKILL',
      mutate(pack) {
        pack.lessons[0].primary_skill_id = 'non-existent-ghost-skill';
      }
    },
    {
      id: 'NEG-2',
      title: '2. Mission with no alternative object (missing Alt chain)',
      expected_family: 'P-UNIV',
      expected_rule: 'P-UNIV-MISSING-ALTERNATIVE',
      mutate(pack) {
        pack.missions[0].objects[0].alternative_object_id = '';
        pack.missions[0].objects[0].alternative_picture_ref = '';
      }
    },
    {
      id: 'NEG-3',
      title: '3. Mission script containing "race" or "faster than" copy',
      expected_family: 'P-COOP',
      expected_rule: 'P-COOP-BANNED-COPY',
      mutate(pack) {
        pack.strings.locales['en-US']['mission.mission_cushion_nest.parent_script'] =
          'Make it a race and see who is faster than their sibling to grab the cushion!';
      }
    },
    {
      id: 'NEG-4',
      title: '4. Any record containing a purchase field or price',
      expected_family: 'P-SCHEMA',
      expected_rule: 'P-SCHEMA-BAN-PURCHASE',
      mutate(pack) {
        pack.lessons[0].price_usd = 4.99;
      }
    },
    {
      id: 'NEG-5',
      title: '5. Lesson reusing a retired slug id',
      expected_family: 'P-SCHEMA',
      expected_rule: 'P-SCHEMA-RETIRED-ID-REUSE',
      mutate(pack) {
        // 'retired-lesson-old-1' is listed in manifest.retired_ids
        pack.lessons[0].id = 'retired-lesson-old-1';
      }
    },
    {
      id: 'NEG-6',
      title: '6. Skill graph with a prerequisite cycle',
      expected_family: 'P-SCHEMA',
      expected_rule: 'P-SCHEMA-SKILL-CYCLE',
      mutate(pack) {
        // everyday-words-entry -> sorting-pairs-next -> everyday-words-entry
        pack.skills[0].prerequisites = ['sorting-pairs-next'];
        pack.skills[1].prerequisites = ['everyday-words-entry'];
      }
    },
    {
      id: 'NEG-7',
      title: '7. Pack with a partial locale (locale listed in locales_available but missing strings)',
      expected_family: 'P-SCHEMA',
      expected_rule: 'P-SCHEMA-PARTIAL-LOCALE',
      mutate(pack) {
        pack.manifest.locales_available = ['en-US', 'es-ES'];
        pack.strings.locales['es-ES'] = {
          'pack.core.title': 'Paquete Demo'
          // Intentionally missing the rest of the required string_refs
        };
      }
    }
  ];

  return cases.map((testCase) => {
    const mutated = cloneDeep(basePack);
    testCase.mutate(mutated);
    const result = validate(mutated);
    const matchedError = result.errors.find(
      (e) => e.rule === testCase.expected_rule || e.family === testCase.expected_family
    );
    const failedAsExpected = result.valid === false && Boolean(matchedError);

    return {
      id: testCase.id,
      title: testCase.title,
      expected_family: testCase.expected_family,
      expected_rule: testCase.expected_rule,
      validator_status: result.status,
      test_passed: failedAsExpected,
      matched_error: matchedError || result.errors[0] || null,
      all_errors: result.errors
    };
  });
}

/**
 * Run the automated compiler equivalence test:
 * Compiles the exact same Lesson, Mission, and Song Template through Path A (authoring form structure)
 * and Path B (CSV/spreadsheet upload) and diffs the output byte-for-byte.
 */
export function runCompilerEquivalenceTest() {
  // Path A: structured authoring form records
  const formInput = {
    format: 'form',
    records: [
      {
        record_type: 'lesson',
        id: 'lesson-cozy-words-1',
        version: '0.1.0',
        locale: 'en-US',
        age_band: '2-3',
        status: 'draft',
        tags: ['demo', 'words', 'entry'],
        created_by: 'phase0-architect',
        reviewed_by: 'phase0-reviewer',
        notes_author: 'DEMO lesson 1: primary everyday-words-entry, linked to mission-cushion-nest.',
        title_ref: 'lesson.lesson_cozy_words_1.title',
        primary_skill_id: 'everyday-words-entry',
        secondary_skill_ids: ['sorting-pairs-next'],
        interaction_type: 'tap_choice',
        character_id: 'words-guide',
        picture_set_id: 'household-cozy-set',
        song_template_id: 'cozy-chime-song',
        mission_id: 'mission-cushion-nest',
        routine_id: null,
        estimated_minutes: 3,
        chunk_budget_minutes: 4,
        fallback_lesson_id: 'lesson-fallback-calm',
        fallback_picture_id: 'fallback-generic-set',
        closing_win_ref: 'lesson.lesson_cozy_words_1.closing_win',
        steps: [
          {
            step_index: 1,
            prompt_ref: 'lesson.lesson_cozy_words_1.step_1.prompt',
            target_item_id: 'soft-cushion',
            choice_item_ids: ['soft-cushion', 'warm-cup', 'wooden-block'],
            celebration_ref: 'lesson.lesson_cozy_words_1.step_1.celebration'
          },
          {
            step_index: 2,
            prompt_ref: 'lesson.lesson_cozy_words_1.step_2.prompt',
            target_item_id: 'cozy-blanket',
            choice_item_ids: ['cozy-blanket', 'folded-towel', 'wooden-block'],
            celebration_ref: 'lesson.lesson_cozy_words_1.step_2.celebration'
          }
        ],
        scaffolds: {
          '0': { level: 0, mode: 'full_task', prompt_ref: 'scaffold.l0.prompt', max_choices: 3, highlight_target: false, model_demonstration: false, child_final_tap_required: true },
          '1': { level: 1, mode: 'fewer_choices', prompt_ref: 'scaffold.l1.prompt', max_choices: 2, highlight_target: false, model_demonstration: false, child_final_tap_required: true },
          '2': { level: 2, mode: 'highlight_and_model', prompt_ref: 'scaffold.l2.prompt', max_choices: 2, highlight_target: true, model_demonstration: true, child_final_tap_required: true },
          '3': { level: 3, mode: 'do_together_final_tap', prompt_ref: 'scaffold.l3.prompt', max_choices: 1, highlight_target: true, model_demonstration: true, child_final_tap_required: true }
        }
      },
      {
        record_type: 'mission',
        id: 'mission-cushion-nest',
        version: '0.1.0',
        locale: 'en-US',
        age_band: '2-5',
        status: 'draft',
        tags: ['demo', 'cooperative', 'device_down'],
        created_by: 'phase0-architect',
        reviewed_by: 'phase0-reviewer',
        notes_author: 'DEMO cooperative mission with all 3 alternative levels.',
        title_ref: 'mission.mission_cushion_nest.title',
        skill_id: 'everyday-words-entry',
        parent_script_ref: 'mission.mission_cushion_nest.parent_script',
        child_prompt_ref: 'mission.mission_cushion_nest.child_prompt',
        team_goal_ref: 'mission.mission_cushion_nest.team_goal',
        parent_precheck: {
          required: true,
          prompt_ref: 'mission.mission_cushion_nest.precheck',
          space_clear_check: true,
          adult_present_check: true
        },
        parent_gate_required: true,
        estimated_minutes: 3,
        cooperative_only: true,
        song_id: 'cozy-chime-song',
        song_fallback_rule: 'use_lesson_song_template',
        return_ritual_ref: 'mission.mission_cushion_nest.return_ritual',
        safety_notes_refs: ['mission.mission_cushion_nest.safety_1'],
        objects: [
          {
            object_id: 'soft-cushion',
            picture_ref: 'soft-cushion',
            label_ref: 'item.soft_cushion.label',
            alternative_object_id: 'folded-towel',
            alternative_picture_ref: 'folded-towel',
            fallback_body_action_id: 'pretend-pillow-hands',
            fallback_body_picture_ref: 'pretend-pillow-hands'
          }
        ]
      },
      {
        record_type: 'song_template',
        id: 'cozy-chime-song',
        version: '0.1.0',
        locale: 'en-US',
        age_band: '2-5',
        status: 'draft',
        tags: ['demo', 'music', 'pentatonic'],
        created_by: 'phase0-architect',
        reviewed_by: 'phase0-reviewer',
        notes_author: 'DEMO pentatonic song template with 8 total slots and 3 child slots.',
        title_ref: 'song.cozy_chime_song.title',
        lesson_word_ref: 'song.cozy_chime_song.lesson_word',
        pentatonic_set_id: 'c_major_pentatonic',
        note_slots_total: 8,
        child_slots: 3,
        completion_rule_id: 'resolve_to_tonic',
        tempo: 84,
        timbre: 'wooden_marimba',
        name_wordlist_id: 'cozy-nature-wordlist',
        wordlists: {
          adjective_refs: ['song.wordlist.adj_sunny', 'song.wordlist.adj_gentle', 'song.wordlist.adj_breezy'],
          noun_refs: ['song.wordlist.noun_meadow', 'song.wordlist.noun_lantern', 'song.wordlist.noun_pebble']
        },
        base_notes: ['C4', 'D4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4']
      }
    ]
  };

  // Path B: CSV spreadsheet representation of the exact same content
  const csvRows = [
    {
      record_type: 'lesson',
      id: 'lesson-cozy-words-1',
      version: '0.1.0',
      locale: 'en-US',
      age_band: '2-3',
      status: 'draft',
      tags: 'demo|words|entry',
      created_by: 'phase0-architect',
      reviewed_by: 'phase0-reviewer',
      notes_author: 'DEMO lesson 1: primary everyday-words-entry, linked to mission-cushion-nest.',
      title_ref: 'lesson.lesson_cozy_words_1.title',
      primary_skill_id: 'everyday-words-entry',
      secondary_skill_ids: 'sorting-pairs-next',
      interaction_type: 'tap_choice',
      character_id: 'words-guide',
      picture_set_id: 'household-cozy-set',
      song_template_id: 'cozy-chime-song',
      mission_id: 'mission-cushion-nest',
      routine_id: '',
      estimated_minutes: '3',
      chunk_budget_minutes: '4',
      fallback_lesson_id: 'lesson-fallback-calm',
      fallback_picture_id: 'fallback-generic-set',
      closing_win_ref: 'lesson.lesson_cozy_words_1.closing_win',
      step_1_prompt_ref: 'lesson.lesson_cozy_words_1.step_1.prompt',
      step_1_target_item_id: 'soft-cushion',
      step_1_choice_item_ids: 'soft-cushion|warm-cup|wooden-block',
      step_1_celebration_ref: 'lesson.lesson_cozy_words_1.step_1.celebration',
      step_2_prompt_ref: 'lesson.lesson_cozy_words_1.step_2.prompt',
      step_2_target_item_id: 'cozy-blanket',
      step_2_choice_item_ids: 'cozy-blanket|folded-towel|wooden-block',
      step_2_celebration_ref: 'lesson.lesson_cozy_words_1.step_2.celebration',
      scaffold_0_prompt_ref: 'scaffold.l0.prompt',
      scaffold_0_max_choices: '3',
      scaffold_1_prompt_ref: 'scaffold.l1.prompt',
      scaffold_1_max_choices: '2',
      scaffold_2_prompt_ref: 'scaffold.l2.prompt',
      scaffold_2_max_choices: '2',
      scaffold_3_prompt_ref: 'scaffold.l3.prompt',
      scaffold_3_max_choices: '1'
    },
    {
      record_type: 'mission',
      id: 'mission-cushion-nest',
      version: '0.1.0',
      locale: 'en-US',
      age_band: '2-5',
      status: 'draft',
      tags: 'demo|cooperative|device_down',
      created_by: 'phase0-architect',
      reviewed_by: 'phase0-reviewer',
      notes_author: 'DEMO cooperative mission with all 3 alternative levels.',
      title_ref: 'mission.mission_cushion_nest.title',
      skill_id: 'everyday-words-entry',
      parent_script_ref: 'mission.mission_cushion_nest.parent_script',
      child_prompt_ref: 'mission.mission_cushion_nest.child_prompt',
      team_goal_ref: 'mission.mission_cushion_nest.team_goal',
      precheck_prompt_ref: 'mission.mission_cushion_nest.precheck',
      estimated_minutes: '3',
      cooperative_only: 'true',
      song_id: 'cozy-chime-song',
      song_fallback_rule: 'use_lesson_song_template',
      return_ritual_ref: 'mission.mission_cushion_nest.return_ritual',
      safety_notes_refs: 'mission.mission_cushion_nest.safety_1',
      obj_1_id: 'soft-cushion',
      obj_1_picture_ref: 'soft-cushion',
      obj_1_label_ref: 'item.soft_cushion.label',
      obj_1_alt_id: 'folded-towel',
      obj_1_alt_picture_ref: 'folded-towel',
      obj_1_body_id: 'pretend-pillow-hands',
      obj_1_body_picture_ref: 'pretend-pillow-hands'
    },
    {
      record_type: 'song_template',
      id: 'cozy-chime-song',
      version: '0.1.0',
      locale: 'en-US',
      age_band: '2-5',
      status: 'draft',
      tags: 'demo|music|pentatonic',
      created_by: 'phase0-architect',
      reviewed_by: 'phase0-reviewer',
      notes_author: 'DEMO pentatonic song template with 8 total slots and 3 child slots.',
      title_ref: 'song.cozy_chime_song.title',
      lesson_word_ref: 'song.cozy_chime_song.lesson_word',
      pentatonic_set_id: 'c_major_pentatonic',
      note_slots_total: '8',
      child_slots: '3',
      completion_rule_id: 'resolve_to_tonic',
      tempo: '84',
      timbre: 'wooden_marimba',
      name_wordlist_id: 'cozy-nature-wordlist',
      wordlist_adjective_refs: 'song.wordlist.adj_sunny|song.wordlist.adj_gentle|song.wordlist.adj_breezy',
      wordlist_noun_refs: 'song.wordlist.noun_meadow|song.wordlist.noun_lantern|song.wordlist.noun_pebble',
      base_notes: 'C4|D4|E4|G4|A4|G4|E4|C4'
    }
  ];

  const csvText = rowsToCsv(csvRows);
  const compiledForm = compile(formInput);
  const compiledCsv = compile({ format: 'csv', csvText });

  const byteIdentical = compiledForm.json === compiledCsv.json;
  let firstDiffIndex = -1;
  if (!byteIdentical) {
    const maxLen = Math.max(compiledForm.json.length, compiledCsv.json.length);
    for (let i = 0; i < maxLen; i++) {
      if (compiledForm.json[i] !== compiledCsv.json[i]) {
        firstDiffIndex = i;
        break;
      }
    }
  }

  return {
    byte_identical: byteIdentical,
    form_byte_length: compiledForm.json.length,
    csv_byte_length: compiledCsv.json.length,
    first_diff_index: firstDiffIndex,
    csv_text: csvText,
    compiled_json: compiledForm.json
  };
}
