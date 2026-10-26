/**
 * Phase 0 Schema-Driven Authoring Form Controller
 * Reads JSON Schema Draft 2020-12 files directly from /packs/schema/*.json,
 * dynamically generates structured form fields from the schema properties/enums/constraints,
 * compiles via pure /tools/compiler.js (both Path A form and Path B CSV),
 * and validates the compiled record against /packs/core context via pure /tools/validator.js.
 */

import { compile, rowsToCsv } from '../../tools/compiler.js';
import { validate, sha256Hex } from '../../tools/validator.js';

const SCHEMA_URLS = {
  lesson: '/packs/schema/lesson.json',
  mission: '/packs/schema/mission.json',
  song_template: '/packs/schema/song_template.json'
};

const DEMO_PRESETS = {
  lesson: {
    id: 'lesson-cozy-words-1',
    record_type: 'lesson',
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
  mission: {
    id: 'mission-cushion-nest',
    record_type: 'mission',
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
  song_template: {
    id: 'cozy-chime-song',
    record_type: 'song_template',
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
};

const state = {
  schemas: {},
  corePack: null,
  currentType: 'lesson',
  lastFormCompiled: null
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

async function loadSchemasAndBasePack() {
  const [lessonSchema, missionSchema, songSchema, manifest, strings, skills, lessons, song_templates, saved_songs, characters, picture_sets, missions, routines, time_concepts] = await Promise.all([
    fetchJson(SCHEMA_URLS.lesson),
    fetchJson(SCHEMA_URLS.mission),
    fetchJson(SCHEMA_URLS.song_template),
    fetchJson('/packs/core/manifest.json'),
    fetchJson('/packs/core/strings.json'),
    fetchJson('/packs/core/skills.json'),
    fetchJson('/packs/core/lessons.json'),
    fetchJson('/packs/core/song_templates.json'),
    fetchJson('/packs/core/saved_songs.json'),
    fetchJson('/packs/core/characters.json'),
    fetchJson('/packs/core/picture_sets.json'),
    fetchJson('/packs/core/missions.json'),
    fetchJson('/packs/core/routines.json'),
    fetchJson('/packs/core/time_concepts.json')
  ]);

  state.schemas = {
    lesson: lessonSchema,
    mission: missionSchema,
    song_template: songSchema
  };

  state.corePack = {
    manifest,
    strings,
    skills,
    lessons,
    song_templates,
    saved_songs,
    characters,
    picture_sets,
    missions,
    routines,
    time_concepts
  };
}

/**
 * Generate form inputs directly from the loaded JSON Schema Draft 2020-12 object.
 */
function renderFormFromSchema(type, presetValues) {
  const schema = state.schemas[type];
  const form = document.getElementById('schema-generated-form');
  const titleEl = document.getElementById('form-schema-title');
  titleEl.textContent = `${schema.title} — Generated from ${SCHEMA_URLS[type]}`;

  const requiredSet = new Set(schema.required || []);
  const props = schema.properties || {};

  const htmlParts = [];
  for (const [propName, propSchema] of Object.entries(props)) {
    const isReq = requiredSet.has(propName);
    const val = presetValues && presetValues[propName] !== undefined ? presetValues[propName] : '';
    const desc = propSchema.description || '';
    const patternNote = propSchema.pattern ? `Pattern: ${propSchema.pattern}` : '';
    const rangeNote = (propSchema.minimum !== undefined || propSchema.maximum !== undefined)
      ? `Range: ${propSchema.minimum ?? '-∞'} to ${propSchema.maximum ?? '+∞'}`
      : '';
    const metaDesc = [desc, patternNote, rangeNote].filter(Boolean).join(' · ');

    htmlParts.push(`<div class="field-group">`);
    htmlParts.push(`<label for="field-${propName}">${propName} ${isReq ? '<span style="color:var(--err);">*</span>' : ''}</label>`);
    if (metaDesc) {
      htmlParts.push(`<div class="desc">${metaDesc}</div>`);
    }

    if (propSchema.const !== undefined) {
      htmlParts.push(
        `<input type="text" id="field-${propName}" data-prop="${propName}" data-kind="const" value="${String(propSchema.const)}" readonly style="background:#eee;" />`
      );
    } else if (Array.isArray(propSchema.enum)) {
      const opts = propSchema.enum
        .map((opt) => `<option value="${opt}" ${ opt === val ? 'selected' : '' }>${opt}</option>`)
        .join('');
      htmlParts.push(`<select id="field-${propName}" data-prop="${propName}" data-kind="enum">${opts}</select>`);
    } else if (propSchema.type === 'integer' || propSchema.type === 'number') {
      const minAttr = propSchema.minimum !== undefined ? `min="${propSchema.minimum}"` : '';
      const maxAttr = propSchema.maximum !== undefined ? `max="${propSchema.maximum}"` : '';
      htmlParts.push(
        `<input type="number" id="field-${propName}" data-prop="${propName}" data-kind="number" ${minAttr} ${maxAttr} value="${val}" />`
      );
    } else if (propSchema.type === 'boolean') {
      htmlParts.push(`
        <select id="field-${propName}" data-prop="${propName}" data-kind="boolean">
          <option value="true" ${val === true ? 'selected' : ''}>true</option>
          <option value="false" ${val === false ? 'selected' : ''}>false</option>
        </select>
      `);
    } else if (propSchema.type === 'array' && propSchema.items && propSchema.items.type === 'string') {
      const joined = Array.isArray(val) ? val.join('|') : String(val || '');
      htmlParts.push(
        `<input type="text" id="field-${propName}" data-prop="${propName}" data-kind="string-array" value="${joined}" placeholder="Pipe-separated values (e.g. a|b)" />`
      );
    } else if (propSchema.type === 'object' || propSchema.type === 'array') {
      const jsonStr = JSON.stringify(val, null, 2);
      htmlParts.push(
        `<textarea id="field-${propName}" data-prop="${propName}" data-kind="json">${jsonStr}</textarea>`
      );
    } else {
      const strVal = val === null ? '' : String(val);
      htmlParts.push(
        `<input type="text" id="field-${propName}" data-prop="${propName}" data-kind="string" value="${strVal}" />`
      );
    }

    htmlParts.push(`</div>`);
  }

  form.innerHTML = htmlParts.join('');
}

function readFormRecord() {
  const form = document.getElementById('schema-generated-form');
  const inputs = form.querySelectorAll('[data-prop]');
  const record = {};

  inputs.forEach((el) => {
    const prop = el.dataset.prop;
    const kind = el.dataset.kind;
    const rawVal = el.value;

    if (kind === 'const') {
      if (rawVal === 'true') record[prop] = true;
      else if (rawVal === 'false') record[prop] = false;
      else record[prop] = rawVal;
    } else if (kind === 'number') {
      record[prop] = Number(rawVal);
    } else if (kind === 'boolean') {
      record[prop] = rawVal === 'true';
    } else if (kind === 'string-array') {
      record[prop] = rawVal.split('|').map((s) => s.trim()).filter(Boolean);
    } else if (kind === 'json') {
      record[prop] = JSON.parse(rawVal);
    } else {
      record[prop] = rawVal.trim() === '' ? null : rawVal.trim();
    }
  });

  if (record.notes_author === null) record.notes_author = '';
  return record;
}

function buildEquivalentCsvForCurrentRecord(rec) {
  if (rec.record_type === 'lesson') {
    const s1 = (rec.steps && rec.steps[0]) || {};
    const s2 = (rec.steps && rec.steps[1]) || {};
    const sc = rec.scaffolds || {};
    return rowsToCsv([
      {
        record_type: 'lesson',
        id: rec.id,
        version: rec.version,
        locale: rec.locale,
        age_band: rec.age_band,
        status: rec.status,
        tags: (rec.tags || []).join('|'),
        created_by: rec.created_by,
        reviewed_by: rec.reviewed_by,
        notes_author: rec.notes_author,
        title_ref: rec.title_ref,
        primary_skill_id: rec.primary_skill_id,
        secondary_skill_ids: (rec.secondary_skill_ids || []).join('|'),
        interaction_type: rec.interaction_type,
        character_id: rec.character_id,
        picture_set_id: rec.picture_set_id,
        song_template_id: rec.song_template_id,
        mission_id: rec.mission_id || '',
        routine_id: rec.routine_id || '',
        estimated_minutes: String(rec.estimated_minutes),
        chunk_budget_minutes: String(rec.chunk_budget_minutes),
        fallback_lesson_id: rec.fallback_lesson_id,
        fallback_picture_id: rec.fallback_picture_id,
        closing_win_ref: rec.closing_win_ref,
        step_1_prompt_ref: s1.prompt_ref || '',
        step_1_target_item_id: s1.target_item_id || '',
        step_1_choice_item_ids: (s1.choice_item_ids || []).join('|'),
        step_1_celebration_ref: s1.celebration_ref || '',
        step_2_prompt_ref: s2.prompt_ref || '',
        step_2_target_item_id: s2.target_item_id || '',
        step_2_choice_item_ids: (s2.choice_item_ids || []).join('|'),
        step_2_celebration_ref: s2.celebration_ref || '',
        scaffold_0_prompt_ref: sc['0']?.prompt_ref || 'scaffold.l0.prompt',
        scaffold_0_max_choices: String(sc['0']?.max_choices ?? 3),
        scaffold_1_prompt_ref: sc['1']?.prompt_ref || 'scaffold.l1.prompt',
        scaffold_1_max_choices: String(sc['1']?.max_choices ?? 2),
        scaffold_2_prompt_ref: sc['2']?.prompt_ref || 'scaffold.l2.prompt',
        scaffold_2_max_choices: String(sc['2']?.max_choices ?? 2),
        scaffold_3_prompt_ref: sc['3']?.prompt_ref || 'scaffold.l3.prompt',
        scaffold_3_max_choices: String(sc['3']?.max_choices ?? 1)
      }
    ]);
  }

  if (rec.record_type === 'mission') {
    const o1 = (rec.objects && rec.objects[0]) || {};
    return rowsToCsv([
      {
        record_type: 'mission',
        id: rec.id,
        version: rec.version,
        locale: rec.locale,
        age_band: rec.age_band,
        status: rec.status,
        tags: (rec.tags || []).join('|'),
        created_by: rec.created_by,
        reviewed_by: rec.reviewed_by,
        notes_author: rec.notes_author,
        title_ref: rec.title_ref,
        skill_id: rec.skill_id,
        parent_script_ref: rec.parent_script_ref,
        child_prompt_ref: rec.child_prompt_ref,
        team_goal_ref: rec.team_goal_ref,
        precheck_prompt_ref: rec.parent_precheck?.prompt_ref || '',
        estimated_minutes: String(rec.estimated_minutes),
        cooperative_only: String(rec.cooperative_only),
        song_id: rec.song_id || '',
        song_fallback_rule: rec.song_fallback_rule,
        return_ritual_ref: rec.return_ritual_ref,
        safety_notes_refs: (rec.safety_notes_refs || []).join('|'),
        obj_1_id: o1.object_id || '',
        obj_1_picture_ref: o1.picture_ref || '',
        obj_1_label_ref: o1.label_ref || '',
        obj_1_alt_id: o1.alternative_object_id || '',
        obj_1_alt_picture_ref: o1.alternative_picture_ref || '',
        obj_1_body_id: o1.fallback_body_action_id || '',
        obj_1_body_picture_ref: o1.fallback_body_picture_ref || ''
      }
    ]);
  }

  return rowsToCsv([
    {
      record_type: 'song_template',
      id: rec.id,
      version: rec.version,
      locale: rec.locale,
      age_band: rec.age_band,
      status: rec.status,
      tags: (rec.tags || []).join('|'),
      created_by: rec.created_by,
      reviewed_by: rec.reviewed_by,
      notes_author: rec.notes_author,
      title_ref: rec.title_ref,
      lesson_word_ref: rec.lesson_word_ref,
      pentatonic_set_id: rec.pentatonic_set_id,
      note_slots_total: String(rec.note_slots_total),
      child_slots: String(rec.child_slots),
      completion_rule_id: rec.completion_rule_id,
      tempo: String(rec.tempo),
      timbre: rec.timbre,
      name_wordlist_id: rec.name_wordlist_id,
      wordlist_adjective_refs: (rec.wordlists?.adjective_refs || []).join('|'),
      wordlist_noun_refs: (rec.wordlists?.noun_refs || []).join('|'),
      base_notes: (rec.base_notes || []).join('|')
    }
  ]);
}

function compileAndValidateFromForm() {
  try {
    const rec = readFormRecord();
    const compiled = compile({ format: 'form', records: [rec] });
    state.lastFormCompiled = compiled;

    document.getElementById('compiled-output-pre').textContent = compiled.json;
    document.getElementById('csv-text-input').value = buildEquivalentCsvForCurrentRecord(rec);

    // Validate in context of the core pack
    const candidatePack = JSON.parse(JSON.stringify(state.corePack));
    const collectionKey = `${rec.record_type}s`;
    if (Array.isArray(candidatePack[collectionKey])) {
      const idx = candidatePack[collectionKey].findIndex((r) => r.id === rec.id);
      const compiledRec = compiled.bundle[collectionKey][0];
      if (idx >= 0) candidatePack[collectionKey][idx] = compiledRec;
      else candidatePack[collectionKey].push(compiledRec);
    }

    const val = validate(candidatePack);
    const statusEl = document.getElementById('author-validation-status');
    if (val.valid) {
      statusEl.innerHTML = `<span class="badge badge-pass">VALIDATOR PASS (0 Errors)</span> <span style="font-size:12px;">SHA-256: <code>${sha256Hex(compiled.json).slice(0, 16)}…</code></span>`;
    } else {
      statusEl.innerHTML = `<span class="badge badge-fail">VALIDATOR BLOCK (${val.error_count} Errors)</span>
        <div style="color:var(--err);font-size:12px;margin-top:6px;">
          ${val.errors.map((e) => `[${e.rule}] ${e.record_id}: ${e.message}`).join('<br/>')}
        </div>`;
    }
  } catch (err) {
    document.getElementById('author-validation-status').innerHTML =
      `<span class="badge badge-fail">PARSE ERROR</span> <span style="font-size:12px;color:var(--err);">${err.message}</span>`;
  }
}

function compileCsvAndCompare() {
  const csvText = document.getElementById('csv-text-input').value;
  const compiledCsv = compile({ format: 'csv', csvText });
  const formJson = state.lastFormCompiled ? state.lastFormCompiled.json : '';
  const identical = formJson === compiledCsv.json;

  const diffEl = document.getElementById('csv-diff-status');
  diffEl.innerHTML = `
    <span class="badge ${identical ? 'badge-pass' : 'badge-fail'}">
      ${identical ? 'BYTE-IDENTICAL WITH PATH A (0 Bytes Diff)' : 'DIFF DETECTED'}
    </span>
    <span style="font-size:12px;margin-left:8px;">
      Form Bytes: <code>${formJson.length}</code> · CSV Bytes: <code>${compiledCsv.json.length}</code> ·
      SHA-256: <code>${sha256Hex(compiledCsv.json).slice(0, 20)}…</code>
    </span>
  `;
}

async function boot() {
  await loadSchemasAndBasePack();

  const select = document.getElementById('schema-type-select');
  select.addEventListener('change', () => {
    state.currentType = select.value;
    renderFormFromSchema(state.currentType, DEMO_PRESETS[state.currentType]);
    compileAndValidateFromForm();
    compileCsvAndCompare();
  });

  document.getElementById('btn-load-demo-preset').addEventListener('click', () => {
    renderFormFromSchema(state.currentType, DEMO_PRESETS[state.currentType]);
    compileAndValidateFromForm();
    compileCsvAndCompare();
  });

  document.getElementById('btn-compile-form').addEventListener('click', () => {
    compileAndValidateFromForm();
  });

  document.getElementById('btn-compile-csv').addEventListener('click', () => {
    compileCsvAndCompare();
  });

  document.getElementById('csv-file-input').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const text = await file.text();
    document.getElementById('csv-text-input').value = text;
    compileCsvAndCompare();
  });

  renderFormFromSchema(state.currentType, DEMO_PRESETS[state.currentType]);
  compileAndValidateFromForm();
  compileCsvAndCompare();
}

boot();
