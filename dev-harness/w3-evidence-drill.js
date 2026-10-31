/**
 * Wave 3 wiring drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the Wave 3 wiring against the REAL records on disk, the REAL shared
 * evidence policy (lib/evidence-policy.js) and the REAL band engine (lib/bands.js):
 *   (a) L1 step-5-only play yields ZERO qualifying subitize evidence; steps 1-4 do qualify
 *   (b) L2d per-step secondaries map correctly (alongside give-n)
 *   (c) L5 play yields NO bandable colour-naming evidence
 *   (d) L4 per-step skills map correctly (no default primary where a list is given)
 * plus completeness (prompt/celebration/voice/image per step), finale-target checks,
 * and source assertions that the session routes evidence through the existing path.
 *
 * lib/pack-loader.ts is TypeScript with JSON import attributes + expo imports and is
 * not Node-importable, so records are read directly (the existing drills' convention).
 */

import fs from 'node:fs';
import path from 'node:path';
import { stepEvidenceEntries, evidenceWeightFor } from '../lib/evidence-policy.js';
import { evaluateBands } from '../lib/bands.js';

const root = process.cwd();
let failures = 0;

function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

const pack2 = 'packs/sunny-home-garden-2/';
const lessons = readJson(pack2 + 'lessons.json');
const pictureSets = readJson(pack2 + 'picture_sets.json');
const skills = readJson(pack2 + 'skills.json');
const manifest = readJson(pack2 + 'manifest.json');
const sessionSource = fs.readFileSync(path.join(root, 'app/session.tsx'), 'utf8');

const W3 = [
  'lesson-see-how-many', 'lesson-give-one', 'lesson-give-two', 'lesson-give-three',
  'lesson-give-just-right', 'lesson-copy-the-pattern', 'lesson-sort-by-colour',
];
const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
const setById = new Map(pictureSets.map((set) => [set.id, set]));
const skillDomain = Object.fromEntries(skills.map((skill) => [skill.id, skill.domain]));
const meta = Object.fromEntries(
  skills.map((skill) => [skill.id, { domain: skill.domain, bandable: true, provisional: false }])
);

// Session output shape for one step (scaffold 0, no help) -> real entries -> real weight.
function entriesForStep(lesson, step, day) {
  const outcome = {
    stepIndex: step.step_index,
    scaffoldLevelAtCompletion: 0,
    completedWithHelp: false,
    evidenceSkillIds: Array.isArray(step.evidence_skill_ids) ? step.evidence_skill_ids : null,
    evidenceParticipation: step.evidence_participation === true,
  };
  return stepEvidenceEntries(outcome, lesson.primary_skill_id).map((entry, index) => ({
    skill_id: entry.skill_id,
    scaffold_level: entry.scaffold_level_at_completion,
    completed_with_help: entry.completed_with_help,
    weight: evidenceWeightFor(entry),
    bandable: true,
    date: `2026-05-${String(day).padStart(2, '0')}T10:00:00.000Z`,
    session_id: `w3-${lesson.id}-${step.step_index}-${index}`,
    format_key: `lesson:${lesson.id}:${step.step_index}:${index}`,
  }));
}

function skillsEvidenced(lesson, step) {
  return stepEvidenceEntries(
    {
      scaffoldLevelAtCompletion: 0,
      completedWithHelp: false,
      evidenceSkillIds: Array.isArray(step.evidence_skill_ids) ? step.evidence_skill_ids : null,
      evidenceParticipation: step.evidence_participation === true,
    },
    lesson.primary_skill_id
  ).map((entry) => entry.skill_id);
}

// ============ (a) L1: step 5 participation-only; steps 1-4 qualify ============
const l1 = lessonById.get('lesson-see-how-many');
const step5Only = evaluateBands(entriesForStep(l1, l1.steps[4], 1), meta).skills;
const step5Subitize = step5Only.find((result) => result.skill_id === 'subitize');
report(
  'L1 step-5-only play yields ZERO qualifying subitize evidence',
  step5Subitize && step5Subitize.qualifying_count === 0,
  `qualifying=${step5Subitize ? step5Subitize.qualifying_count : 'none'}`
);
const steps1to4 = l1.steps.slice(0, 4).flatMap((step, index) => entriesForStep(l1, step, index + 1));
const subitize14 = evaluateBands(steps1to4, meta).skills.find((result) => result.skill_id === 'subitize');
report(
  'L1 steps 1-4 do qualify as subitize evidence',
  subitize14 && subitize14.qualifying_count === 4,
  `qualifying=${subitize14 ? subitize14.qualifying_count : 'none'}`
);
report(
  'L1 step 5 is still a full step (prompt + celebration + voice present)',
  typeof l1.steps[4].prompt_ref === 'string' && typeof l1.steps[4].celebration_ref === 'string'
);

// ============ (b) L2d: per-step secondaries alongside give-n ============
const l2d = lessonById.get('lesson-give-just-right');
const l2dExpected = [['give-n', 'give-2'], ['give-n', 'give-1'], ['give-n', 'give-3'], ['give-n', 'give-2'], ['give-n', 'give-3']];
const l2dActual = l2d.steps.map((step) => skillsEvidenced(l2d, step));
report(
  'L2d per-step evidence_skill_ids are exactly [give-n + the matching secondary]',
  JSON.stringify(l2dActual) === JSON.stringify(l2dExpected),
  `actual=${JSON.stringify(l2dActual)}`
);
const l2dBands = Object.fromEntries(
  evaluateBands(l2d.steps.flatMap((step, index) => entriesForStep(l2d, step, index + 1)), meta).skills.map((result) => [result.skill_id, result])
);
report(
  'L2d qualifying counts: give-n=5, give-1=1, give-2=2, give-3=2',
  l2dBands['give-n']?.qualifying_count === 5 &&
    l2dBands['give-1']?.qualifying_count === 1 &&
    l2dBands['give-2']?.qualifying_count === 2 &&
    l2dBands['give-3']?.qualifying_count === 2,
  `give-n=${l2dBands['give-n']?.qualifying_count} give-1=${l2dBands['give-1']?.qualifying_count} give-2=${l2dBands['give-2']?.qualifying_count} give-3=${l2dBands['give-3']?.qualifying_count}`
);

// ============ (c) L5: no bandable colour-naming evidence ============
const l5 = lessonById.get('lesson-sort-by-colour');
const l5Entries = l5.steps.flatMap((step, index) => entriesForStep(l5, step, index + 1));
report(
  'L5 emits no colour-naming evidence at all',
  l5Entries.every((entry) => entry.skill_id !== 'colour-naming'),
  `skills=${[...new Set(l5Entries.map((entry) => entry.skill_id))].join(',')}`
);
report(
  'L5 play yields no bandable colour-naming band result',
  !evaluateBands(l5Entries, meta).skills.some((result) => result.skill_id === 'colour-naming')
);

// ============ (d) L4: per-step skills ============
const l4 = lessonById.get('lesson-copy-the-pattern');
const l4Expected = [['pattern-copy'], ['pattern-copy'], ['pattern-extension'], ['beat-patterns'], ['what-comes-next']];
const l4Actual = l4.steps.map((step) => skillsEvidenced(l4, step));
report(
  'L4 per-step evidence_skill_ids are exactly the spec list (no default primary)',
  JSON.stringify(l4Actual) === JSON.stringify(l4Expected),
  `actual=${JSON.stringify(l4Actual)}`
);
const l4Bands = Object.fromEntries(
  evaluateBands(l4.steps.flatMap((step, index) => entriesForStep(l4, step, index + 1)), meta).skills.map((result) => [result.skill_id, result])
);
report(
  'L4 qualifying counts: pattern-copy=2, pattern-extension=1, beat-patterns=1, what-comes-next=1',
  l4Bands['pattern-copy']?.qualifying_count === 2 &&
    l4Bands['pattern-extension']?.qualifying_count === 1 &&
    l4Bands['beat-patterns']?.qualifying_count === 1 &&
    l4Bands['what-comes-next']?.qualifying_count === 1
);
report(
  'L4 step 4 beat-patterns evidence is language-domain (path-graph resolution)',
  skillDomain['beat-patterns'] === 'language',
  `domain=${skillDomain['beat-patterns']}`
);

// ============ completeness: prompt/celebration/voice/image per step ============
const voiceDir = pack2 + 'assets/voice/moss/';
const perLesson = [];
let missing = [];
for (const id of W3) {
  const lesson = lessonById.get(id);
  const snake = id.replace('lesson-', '').replace(/-/g, '_');
  const set = setById.get(lesson.picture_set_id);
  const setItemIds = new Set((set?.items ?? []).map((item) => item.item_id));
  let voiceCount = 0;
  for (const step of lesson.steps) {
    const promptVoice = `${voiceDir}lesson_${snake}_step_${step.step_index}_prompt.mp3`;
    const celebrationVoice = `${voiceDir}lesson_${snake}_step_${step.step_index}_celebration.mp3`;
    if (!fs.existsSync(path.join(root, promptVoice))) missing.push(promptVoice);
    if (!fs.existsSync(path.join(root, celebrationVoice))) missing.push(celebrationVoice);
    if (!setItemIds.has(step.target_item_id)) missing.push(`${id}:step${step.step_index}:target`);
    for (const choice of step.choice_item_ids) {
      if (!setItemIds.has(choice)) missing.push(`${id}:step${step.step_index}:choice:${choice}`);
    }
    voiceCount += 2;
  }
  const closingVoice = `${voiceDir}lesson_${snake}_closing_win.mp3`;
  const findVoice = `${voiceDir}lesson_${snake}_find_prompt.mp3`;
  if (!fs.existsSync(path.join(root, closingVoice))) missing.push(closingVoice);
  if (!fs.existsSync(path.join(root, findVoice))) missing.push(findVoice);
  voiceCount += 2;
  perLesson.push(`${id}: steps=${lesson.steps.length} voices=${voiceCount} set=${lesson.picture_set_id}`);
}
report('completeness: every step has prompt/celebration voice + resolvable items', missing.length === 0, missing.join(', ') || 'all present');
console.log('    ' + perLesson.join('\n    '));

const w3VoiceFiles = fs.readdirSync(path.join(root, voiceDir)).filter((name) => W3.some((id) => name.startsWith('lesson_' + id.replace('lesson-', '').replace(/-/g, '_') + '_')));
report('completeness: 84 Wave 3 moss voice files on disk', w3VoiceFiles.length === 84, `found=${w3VoiceFiles.length}`);
const newImages = ['blue-flower.jpg', 'red-basket.jpg', 'yellow-basket.jpg', 'beat-loud.jpg', 'beat-soft.jpg', 'beat-rest.jpg', 'blue-basket.jpg'];
report(
  'completeness: the 7 new/reused image files exist and are hashed in the pack manifest',
  newImages.every((name) => fs.existsSync(path.join(root, pack2 + 'assets/' + name)) && manifest.file_hashes['assets/' + name] !== undefined)
);
report(
  'completeness: every Wave 3 voice file is hashed in the pack manifest',
  w3VoiceFiles.every((name) => manifest.file_hashes['assets/voice/moss/' + name] !== undefined)
);

// ============ finale targets = step-5 targets ============
const finaleBlock = sessionSource.slice(sessionSource.indexOf('const FINALE_CONFIG'), sessionSource.indexOf('};', sessionSource.indexOf('const FINALE_CONFIG')));
const finaleTargets = Object.fromEntries(
  [...finaleBlock.matchAll(/'([a-z-]+)':\s*\{\s*targetItemId:\s*'([a-z0-9-]+)'/g)].map((match) => [match[1], match[2]])
);
const finaleMismatch = W3.filter((id) => finaleTargets[id] !== lessonById.get(id).steps[4].target_item_id);
report(
  'every Wave 3 FINALE_CONFIG target equals its lesson step-5 target',
  finaleMismatch.length === 0,
  finaleMismatch.length ? `mismatch=${finaleMismatch.join(',')}` : W3.map((id) => `${id}->${finaleTargets[id]}`).join(' ')
);

// ============ source assertions ============
report('session keeps exactly one recordStepEvidence call site', (sessionSource.match(/recordStepEvidence\(/g) ?? []).length === 1);
report('session routes evidence through stepEvidenceEntries()', sessionSource.includes('stepEvidenceEntries(outcome, lessonPrimarySkillId)'));

if (failures > 0) {
  console.error(`\n=== W3 WIRING DRILL FAILED (${failures}) ===`);
  process.exit(1);
}
console.log('\n=== W3 WIRING DRILL PASSED ===');
