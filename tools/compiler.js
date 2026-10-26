/**
 * Phase 0 Pure Content-Pack Compiler
 * Purity contract: NO DOM access, NO fetch, NO framework imports, NO Node/OS imports.
 *
 * Accepts TWO authoring input paths and produces BYTE-IDENTICAL canonical pack JSON:
 *   Path A: Structured authoring form input ({ format: 'form', records: [...], strings?: [...] })
 *   Path B: CSV/spreadsheet text or rows ({ format: 'csv', csvText: '...' } or raw CSV string)
 */

/**
 * Deterministically sort all object keys recursively and serialize with 2-space indentation + trailing newline.
 */
export function canonicalizeJson(value) {
  return JSON.stringify(sortKeysDeep(value), null, 2) + '\n';
}

export function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const sorted = {};
    const keys = Object.keys(value).sort();
    for (const k of keys) {
      if (value[k] !== undefined) {
        sorted[k] = sortKeysDeep(value[k]);
      }
    }
    return sorted;
  }
  return value;
}

/**
 * RFC 4180 compliant pure CSV parser.
 * Returns an array of row objects keyed by the header row.
 */
export function parseCsv(csvText) {
  const text = String(csvText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }
  currentRow.push(currentField);
  if (currentRow.length > 1 || currentRow[0] !== '') {
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  const objects = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((cell) => cell.trim() === '')) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] !== undefined ? row[c].trim() : '';
    }
    objects.push(obj);
  }
  return objects;
}

/**
 * Serialize normalized authoring rows into CSV text (useful for round-trip authoring export).
 */
export function rowsToCsv(rows, columns) {
  const cols = columns || [
    'record_type',
    'id',
    'version',
    'locale',
    'age_band',
    'status',
    'tags',
    'created_by',
    'reviewed_by',
    'notes_author',
    'title_ref',
    'primary_skill_id',
    'secondary_skill_ids',
    'interaction_type',
    'character_id',
    'picture_set_id',
    'song_template_id',
    'mission_id',
    'routine_id',
    'estimated_minutes',
    'chunk_budget_minutes',
    'fallback_lesson_id',
    'fallback_picture_id',
    'closing_win_ref',
    'step_1_prompt_ref',
    'step_1_target_item_id',
    'step_1_choice_item_ids',
    'step_1_celebration_ref',
    'step_2_prompt_ref',
    'step_2_target_item_id',
    'step_2_choice_item_ids',
    'step_2_celebration_ref',
    'scaffold_0_prompt_ref',
    'scaffold_0_max_choices',
    'scaffold_1_prompt_ref',
    'scaffold_1_max_choices',
    'scaffold_2_prompt_ref',
    'scaffold_2_max_choices',
    'scaffold_3_prompt_ref',
    'scaffold_3_max_choices',
    'skill_id',
    'parent_script_ref',
    'child_prompt_ref',
    'team_goal_ref',
    'precheck_prompt_ref',
    'cooperative_only',
    'song_id',
    'song_fallback_rule',
    'return_ritual_ref',
    'safety_notes_refs',
    'obj_1_id',
    'obj_1_picture_ref',
    'obj_1_label_ref',
    'obj_1_alt_id',
    'obj_1_alt_picture_ref',
    'obj_1_body_id',
    'obj_1_body_picture_ref',
    'lesson_word_ref',
    'pentatonic_set_id',
    'note_slots_total',
    'child_slots',
    'completion_rule_id',
    'tempo',
    'timbre',
    'name_wordlist_id',
    'wordlist_adjective_refs',
    'wordlist_noun_refs',
    'base_notes'
  ];

  const escapeCell = (val) => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [cols.join(',')];
  for (const r of rows) {
    lines.push(cols.map((c) => escapeCell(r[c])).join(','));
  }
  return lines.join('\n') + '\n';
}

function splitList(val, sep = '|') {
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    const delimiter = trimmed.includes('|') ? '|' : ';';
    return trimmed.split(delimiter).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function toNullableSlug(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'none') return null;
  return s;
}

function toInt(val, fallback) {
  const n = Number.parseInt(String(val), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(val, fallback = true) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  return fallback;
}

/**
 * Normalize a single authoring entry (from either Form Path A or CSV Path B) into its exact schema record.
 */
export function normalizeRecord(raw) {
  const type = String(raw.record_type || '').trim();
  const base = {
    id: String(raw.id || '').trim(),
    record_type: type,
    version: String(raw.version || '0.1.0').trim(),
    locale: String(raw.locale || 'en-US').trim(),
    age_band: String(raw.age_band || '2-5').trim(),
    status: String(raw.status || 'draft').trim(),
    tags: splitList(raw.tags),
    created_by: String(raw.created_by || '').trim(),
    reviewed_by: String(raw.reviewed_by || '').trim(),
    notes_author: String(raw.notes_author || '').trim()
  };

  if (type === 'lesson') {
    const steps = normalizeLessonSteps(raw);
    const scaffolds = normalizeLessonScaffolds(raw);
    return sortKeysDeep({
      ...base,
      title_ref: String(raw.title_ref || '').trim(),
      primary_skill_id: String(raw.primary_skill_id || '').trim(),
      secondary_skill_ids: splitList(raw.secondary_skill_ids),
      interaction_type: String(raw.interaction_type || 'tap_choice').trim(),
      character_id: String(raw.character_id || 'guide').trim(),
      picture_set_id: String(raw.picture_set_id || '').trim(),
      song_template_id: String(raw.song_template_id || '').trim(),
      mission_id: toNullableSlug(raw.mission_id),
      routine_id: toNullableSlug(raw.routine_id),
      estimated_minutes: toInt(raw.estimated_minutes, 3),
      chunk_budget_minutes: toInt(raw.chunk_budget_minutes, 4),
      fallback_lesson_id: String(raw.fallback_lesson_id || '').trim(),
      fallback_picture_id: String(raw.fallback_picture_id || '').trim(),
      closing_win_ref: String(raw.closing_win_ref || '').trim(),
      steps,
      scaffolds
    });
  }

  if (type === 'mission') {
    const objects = normalizeMissionObjects(raw);
    const parentPrecheck = raw.parent_precheck && typeof raw.parent_precheck === 'object'
      ? {
          required: toBool(raw.parent_precheck.required, true),
          prompt_ref: String(raw.parent_precheck.prompt_ref || '').trim(),
          space_clear_check: toBool(raw.parent_precheck.space_clear_check, true),
          adult_present_check: toBool(raw.parent_precheck.adult_present_check, true)
        }
      : {
          required: true,
          prompt_ref: String(raw.precheck_prompt_ref || '').trim(),
          space_clear_check: true,
          adult_present_check: true
        };

    return sortKeysDeep({
      ...base,
      title_ref: String(raw.title_ref || '').trim(),
      skill_id: String(raw.skill_id || '').trim(),
      parent_script_ref: String(raw.parent_script_ref || '').trim(),
      child_prompt_ref: String(raw.child_prompt_ref || '').trim(),
      team_goal_ref: String(raw.team_goal_ref || '').trim(),
      parent_precheck: parentPrecheck,
      parent_gate_required: toBool(raw.parent_gate_required, true),
      estimated_minutes: toInt(raw.estimated_minutes, 3),
      cooperative_only: toBool(raw.cooperative_only, true),
      song_id: toNullableSlug(raw.song_id),
      song_fallback_rule: String(raw.song_fallback_rule || 'use_lesson_song_template').trim(),
      return_ritual_ref: String(raw.return_ritual_ref || '').trim(),
      safety_notes_refs: splitList(raw.safety_notes_refs),
      objects
    });
  }

  if (type === 'song_template') {
    const wordlists = raw.wordlists && typeof raw.wordlists === 'object'
      ? {
          adjective_refs: splitList(raw.wordlists.adjective_refs),
          noun_refs: splitList(raw.wordlists.noun_refs)
        }
      : {
          adjective_refs: splitList(raw.wordlist_adjective_refs),
          noun_refs: splitList(raw.wordlist_noun_refs)
        };

    return sortKeysDeep({
      ...base,
      title_ref: String(raw.title_ref || '').trim(),
      lesson_word_ref: String(raw.lesson_word_ref || '').trim(),
      pentatonic_set_id: String(raw.pentatonic_set_id || 'c_major_pentatonic').trim(),
      note_slots_total: toInt(raw.note_slots_total, 8),
      child_slots: toInt(raw.child_slots, 3),
      completion_rule_id: String(raw.completion_rule_id || 'resolve_to_tonic').trim(),
      tempo: toInt(raw.tempo, 84),
      timbre: String(raw.timbre || 'wooden_marimba').trim(),
      name_wordlist_id: String(raw.name_wordlist_id || '').trim(),
      wordlists,
      base_notes: splitList(raw.base_notes)
    });
  }

  if (type === 'skill') {
    return sortKeysDeep({
      ...base,
      title_ref: String(raw.title_ref || '').trim(),
      description_ref: String(raw.description_ref || '').trim(),
      domain: String(raw.domain || 'language').trim(),
      is_entry_skill: toBool(raw.is_entry_skill, false),
      prerequisites: splitList(raw.prerequisites),
      next_skills: splitList(raw.next_skills),
      age_band_min: String(raw.age_band_min || '2-3').trim(),
      evidence_needed_to_advance: toInt(raw.evidence_needed_to_advance, 3),
      catch_up_variant_of: toNullableSlug(raw.catch_up_variant_of)
    });
  }

  if (type === 'routine') {
    return sortKeysDeep({
      ...base,
      title_ref: String(raw.title_ref || '').trim(),
      anchor: String(raw.anchor || 'tidy_together').trim(),
      time_of_day: String(raw.time_of_day || 'evening').trim(),
      skill_id: String(raw.skill_id || '').trim(),
      parent_script_ref: String(raw.parent_script_ref || '').trim(),
      child_prompt_ref: String(raw.child_prompt_ref || '').trim(),
      team_goal_ref: String(raw.team_goal_ref || '').trim(),
      cooperative_only: toBool(raw.cooperative_only, true),
      song_id: toNullableSlug(raw.song_id),
      song_fallback_rule: String(raw.song_fallback_rule || 'use_lesson_song_template').trim(),
      return_ritual_ref: String(raw.return_ritual_ref || '').trim(),
      safety_notes_refs: splitList(raw.safety_notes_refs),
      objects: normalizeMissionObjects(raw)
    });
  }

  return sortKeysDeep({ ...raw, ...base });
}

function normalizeLessonSteps(raw) {
  if (Array.isArray(raw.steps) && raw.steps.length > 0) {
    return raw.steps.map((st, idx) => ({
      step_index: toInt(st.step_index, idx + 1),
      prompt_ref: String(st.prompt_ref || '').trim(),
      target_item_id: String(st.target_item_id || '').trim(),
      choice_item_ids: splitList(st.choice_item_ids),
      celebration_ref: String(st.celebration_ref || '').trim()
    }));
  }

  const steps = [];
  for (let i = 1; i <= 8; i++) {
    const pRef = raw[`step_${i}_prompt_ref`];
    const tId = raw[`step_${i}_target_item_id`];
    if (pRef && String(pRef).trim() && tId && String(tId).trim()) {
      steps.push({
        step_index: i,
        prompt_ref: String(pRef).trim(),
        target_item_id: String(tId).trim(),
        choice_item_ids: splitList(raw[`step_${i}_choice_item_ids`]),
        celebration_ref: String(raw[`step_${i}_celebration_ref`] || '').trim()
      });
    }
  }
  return steps;
}

function normalizeLessonScaffolds(raw) {
  if (raw.scaffolds && typeof raw.scaffolds === 'object' && raw.scaffolds['0']) {
    return {
      '0': {
        level: 0,
        mode: 'full_task',
        prompt_ref: String(raw.scaffolds['0'].prompt_ref || 'scaffold.l0.prompt').trim(),
        max_choices: toInt(raw.scaffolds['0'].max_choices, 3),
        highlight_target: false,
        model_demonstration: false,
        child_final_tap_required: true
      },
      '1': {
        level: 1,
        mode: 'fewer_choices',
        prompt_ref: String(raw.scaffolds['1'].prompt_ref || 'scaffold.l1.prompt').trim(),
        max_choices: toInt(raw.scaffolds['1'].max_choices, 2),
        highlight_target: false,
        model_demonstration: false,
        child_final_tap_required: true
      },
      '2': {
        level: 2,
        mode: 'highlight_and_model',
        prompt_ref: String(raw.scaffolds['2'].prompt_ref || 'scaffold.l2.prompt').trim(),
        max_choices: toInt(raw.scaffolds['2'].max_choices, 2),
        highlight_target: true,
        model_demonstration: true,
        child_final_tap_required: true
      },
      '3': {
        level: 3,
        mode: 'do_together_final_tap',
        prompt_ref: String(raw.scaffolds['3'].prompt_ref || 'scaffold.l3.prompt').trim(),
        max_choices: toInt(raw.scaffolds['3'].max_choices, 1),
        highlight_target: true,
        model_demonstration: true,
        child_final_tap_required: true
      }
    };
  }

  return {
    '0': {
      level: 0,
      mode: 'full_task',
      prompt_ref: String(raw.scaffold_0_prompt_ref || 'scaffold.l0.prompt').trim(),
      max_choices: toInt(raw.scaffold_0_max_choices, 3),
      highlight_target: false,
      model_demonstration: false,
      child_final_tap_required: true
    },
    '1': {
      level: 1,
      mode: 'fewer_choices',
      prompt_ref: String(raw.scaffold_1_prompt_ref || 'scaffold.l1.prompt').trim(),
      max_choices: toInt(raw.scaffold_1_max_choices, 2),
      highlight_target: false,
      model_demonstration: false,
      child_final_tap_required: true
    },
    '2': {
      level: 2,
      mode: 'highlight_and_model',
      prompt_ref: String(raw.scaffold_2_prompt_ref || 'scaffold.l2.prompt').trim(),
      max_choices: toInt(raw.scaffold_2_max_choices, 2),
      highlight_target: true,
      model_demonstration: true,
      child_final_tap_required: true
    },
    '3': {
      level: 3,
      mode: 'do_together_final_tap',
      prompt_ref: String(raw.scaffold_3_prompt_ref || 'scaffold.l3.prompt').trim(),
      max_choices: toInt(raw.scaffold_3_max_choices, 1),
      highlight_target: true,
      model_demonstration: true,
      child_final_tap_required: true
    }
  };
}

function normalizeMissionObjects(raw) {
  if (Array.isArray(raw.objects) && raw.objects.length > 0) {
    return raw.objects.map((o) => ({
      object_id: String(o.object_id || '').trim(),
      picture_ref: String(o.picture_ref || '').trim(),
      label_ref: String(o.label_ref || '').trim(),
      alternative_object_id: String(o.alternative_object_id || '').trim(),
      alternative_picture_ref: String(o.alternative_picture_ref || '').trim(),
      fallback_body_action_id: String(o.fallback_body_action_id || '').trim(),
      fallback_body_picture_ref: String(o.fallback_body_picture_ref || '').trim()
    }));
  }

  const objects = [];
  for (let i = 1; i <= 3; i++) {
    const objId = raw[`obj_${i}_id`];
    if (objId && String(objId).trim()) {
      objects.push({
        object_id: String(objId).trim(),
        picture_ref: String(raw[`obj_${i}_picture_ref`] || objId).trim(),
        label_ref: String(raw[`obj_${i}_label_ref`] || '').trim(),
        alternative_object_id: String(raw[`obj_${i}_alt_id`] || '').trim(),
        alternative_picture_ref: String(raw[`obj_${i}_alt_picture_ref`] || '').trim(),
        fallback_body_action_id: String(raw[`obj_${i}_body_id`] || '').trim(),
        fallback_body_picture_ref: String(raw[`obj_${i}_body_picture_ref`] || '').trim()
      });
    }
  }
  return objects;
}

/**
 * Compile authoring input from either Path A (form) or Path B (CSV) into deterministic pack JSON.
 *
 * @param {object|string} input
 *   - Path A (form): { format: 'form', records: Array<object> } or single form record object
 *   - Path B (csv):  { format: 'csv', csvText: string } or raw CSV string
 * @returns {{ bundle: object, json: string, files: Record<string, string> }}
 */
export function compile(input) {
  let rawRecords = [];

  if (typeof input === 'string') {
    // Raw CSV text
    rawRecords = parseCsv(input);
  } else if (input && typeof input === 'object') {
    if (input.format === 'csv' || typeof input.csvText === 'string') {
      rawRecords = parseCsv(input.csvText || '');
    } else if (Array.isArray(input.records)) {
      rawRecords = input.records;
    } else if (Array.isArray(input)) {
      rawRecords = input;
    } else if (input.record_type) {
      rawRecords = [input];
    }
  }

  const normalized = rawRecords.map(normalizeRecord);

  // Group by collection in deterministic order and sort each collection by `id`
  const grouped = {
    lessons: [],
    missions: [],
    routines: [],
    skills: [],
    song_templates: []
  };

  for (const rec of normalized) {
    if (rec.record_type === 'lesson') grouped.lessons.push(rec);
    else if (rec.record_type === 'mission') grouped.missions.push(rec);
    else if (rec.record_type === 'routine') grouped.routines.push(rec);
    else if (rec.record_type === 'skill') grouped.skills.push(rec);
    else if (rec.record_type === 'song_template') grouped.song_templates.push(rec);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.id.localeCompare(b.id));
  }

  // Filter out empty collections if compiling a subset, or keep present collections canonical
  const bundle = {};
  for (const key of Object.keys(grouped).sort()) {
    if (grouped[key].length > 0) {
      bundle[key] = grouped[key];
    }
  }

  const sortedBundle = sortKeysDeep(bundle);
  const json = canonicalizeJson(sortedBundle);

  const files = {};
  for (const [colName, arr] of Object.entries(sortedBundle)) {
    files[`${colName}.json`] = canonicalizeJson(arr);
  }

  return {
    bundle: sortedBundle,
    json,
    files
  };
}
