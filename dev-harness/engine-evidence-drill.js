/**
 * Engine per-step evidence drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the per-step evidence mechanism added this run:
 *   LessonStep.evidence_skill_ids / evidence_participation  ->
 *   lib/evidence-policy.js stepEvidenceEntries()            ->
 *   progress-store record (optional `participation`)        ->
 *   lib/evidence-policy.js evidenceWeightFor()              ->
 *   bands engine isQualifying() exclusion.
 *
 * Uses the REAL shared policy functions (lib/evidence-policy.js, the same module
 * the session and path-queue import), the REAL band engine (lib/bands.js) and the
 * REAL validator (tools/validator.js validate()). lib/pack-loader.ts and
 * lib/path-queue.ts are TypeScript with expo/JSON-attribute imports and are not
 * Node-importable, so record scans read the JSON directly (the same constraint the
 * existing drills work around).
 */

import fs from 'node:fs';
import path from 'node:path';
import { stepEvidenceEntries, evidenceWeightFor, completedWithHelpFor } from '../lib/evidence-policy.js';
import { evaluateBands } from '../lib/bands.js';
import { validate } from '../tools/validator.js';

const root = process.cwd();
let failures = 0;

function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function loadPackDir(dir) {
  const read = (file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const manifest = read('manifest.json');
  const assets = {};
  for (const relPath of Object.keys(manifest.file_hashes)) {
    if (relPath.startsWith('assets/')) assets[relPath] = fs.readFileSync(path.join(dir, relPath), 'utf8');
  }
  return {
    manifest,
    strings: read('strings.json'),
    skills: read('skills.json'),
    lessons: read('lessons.json'),
    song_templates: read('song_templates.json'),
    saved_songs: read('saved_songs.json'),
    characters: read('characters.json'),
    picture_sets: read('picture_sets.json'),
    missions: read('missions.json'),
    routines: read('routines.json'),
    time_concepts: read('time_concepts.json'),
    assets,
  };
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const rulesOf = (result) => new Set(result.errors.map((error) => error.rule));

const packDirs = fs
  .readdirSync('packs', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'schema')
  .map((entry) => entry.name);
const packs = packDirs.map((dirName) => ({ dirName, pack: loadPackDir(path.join('packs', dirName)) }));

// The old (pre-change) weight rule, used to assert existing output is unchanged.
const legacyWeight = (entry) => (entry.completed_with_help ? 'participation' : 'strong');

// ============ (a) no existing step carries the fields; existing output unchanged ============
const flaggedSteps = [];
const existingOutcomeChecks = [];
for (const { dirName, pack } of packs) {
  for (const lesson of pack.lessons) {
    for (const step of lesson.steps) {
      if (step.evidence_skill_ids !== undefined || step.evidence_participation !== undefined) {
        flaggedSteps.push(`${dirName}:${lesson.id}:step${step.step_index}`);
      }
      // existing step -> outcome shape the session would have produced before this change
      const outcome = {
        stepIndex: step.step_index,
        scaffoldLevelAtCompletion: 0,
        completedWithHelp: false,
        evidenceSkillIds: null,
        evidenceParticipation: false,
      };
      const entries = stepEvidenceEntries(outcome, lesson.primary_skill_id);
      const entry = entries[0];
      const keys = Object.keys(entry).sort().join(',');
      existingOutcomeChecks.push(
        entries.length === 1 &&
          entry.skill_id === lesson.primary_skill_id &&
          keys === 'completed_with_help,scaffold_level_at_completion,skill_id' &&
          evidenceWeightFor(entry) === legacyWeight(entry)
      );
    }
  }
}
report(
  'no existing step in any pack carries the new fields',
  flaggedSteps.length === 0,
  `flagged=${flaggedSteps.join(', ') || 'none'}`
);
report(
  'existing lesson steps still emit exactly one entry for the primary skill, unchanged keys/weight',
  existingOutcomeChecks.length > 0 && existingOutcomeChecks.every(Boolean),
  `checked=${existingOutcomeChecks.length}`
);

// ============ (b) evidence_skill_ids -> one entry per skill ============
const multiOutcome = {
  stepIndex: 2,
  scaffoldLevelAtCompletion: 0,
  completedWithHelp: false,
  evidenceSkillIds: ['give-n', 'give-1'],
  evidenceParticipation: false,
};
const multiEntries = stepEvidenceEntries(multiOutcome, 'give-n');
report(
  'a step listing [give-n, give-1] yields one entry per skill (L2d-style)',
  multiEntries.length === 2 &&
    multiEntries[0].skill_id === 'give-n' &&
    multiEntries[1].skill_id === 'give-1' &&
    multiEntries.every((entry) => entry.participation === undefined),
  `entries=${multiEntries.map((entry) => entry.skill_id).join('+')}`
);

// ============ (c) evidence_participation -> non-qualifying, help untouched ============
const participationOutcome = {
  stepIndex: 5,
  scaffoldLevelAtCompletion: 0,
  completedWithHelp: false,
  evidenceSkillIds: null,
  evidenceParticipation: true,
};
const participationEntry = stepEvidenceEntries(participationOutcome, 'subitize')[0];
report(
  'participation entry keeps completed_with_help untouched and adds participation:true',
  participationEntry.completed_with_help === false && participationEntry.participation === true,
  JSON.stringify(participationEntry)
);

const meta = { subitize: { domain: 'maths', bandable: true, provisional: false } };
const participationBands = (count) => {
  const events = [];
  for (let index = 0; index < count; index += 1) {
    const entry = stepEvidenceEntries(participationOutcome, 'subitize')[0];
    events.push({
      skill_id: entry.skill_id,
      scaffold_level: entry.scaffold_level_at_completion,
      completed_with_help: entry.completed_with_help,
      participation: entry.participation,
      weight: evidenceWeightFor(entry),
      bandable: true,
      date: `2026-04-${String(1 + index).padStart(2, '0')}T10:00:00.000Z`,
      session_id: `p${index + 1}`,
      format_key: `f${index + 1}`,
    });
  }
  return evaluateBands(events, meta).skills[0];
};
const oneParticipation = participationBands(1);
const manyParticipation = participationBands(6);
report(
  'participation evidence is excluded by the real band engine (single step)',
  oneParticipation.qualifying_count === 0,
  `qualifying=${oneParticipation.qualifying_count} band=${oneParticipation.display_band}`
);
report(
  'participation evidence stays non-qualifying across 6 spaced runs (L1 step-5 case)',
  manyParticipation.qualifying_count === 0 && manyParticipation.display_band === 'exploring',
  `qualifying=${manyParticipation.qualifying_count} band=${manyParticipation.display_band}`
);

// help signal composes independently (no participation key, still non-qualifying)
const helpEntry = stepEvidenceEntries(
  {
    stepIndex: 1,
    scaffoldLevelAtCompletion: 0,
    completedWithHelp: true,
    evidenceSkillIds: null,
    evidenceParticipation: false,
  },
  'subitize'
)[0];
report(
  'help-marked evidence still yields weight participation with no participation key',
  helpEntry.participation === undefined && evidenceWeightFor(helpEntry) === 'participation',
  JSON.stringify(helpEntry)
);

// L6 evidence_help_only still works (regression) and composes with the new fields
report(
  'L6 evidence_help_only still marks a step completed-with-help',
  completedWithHelpFor({ evidence_help_only: true }, 0) === true &&
    completedWithHelpFor({}, 0) === false
);
const composed = stepEvidenceEntries(
  {
    stepIndex: 1,
    scaffoldLevelAtCompletion: 0,
    completedWithHelp: completedWithHelpFor({ evidence_help_only: true }, 0),
    evidenceSkillIds: null,
    evidenceParticipation: true,
  },
  'name-with-grown-up'
)[0];
report(
  'help-only and participation compose without precedence hacks',
  composed.completed_with_help === true &&
    composed.participation === true &&
    evidenceWeightFor(composed) === 'participation'
);

// ============ (e) validator accepts valid fields, rejects the three bad cases ============
const pack2 = packs.find((entry) => entry.dirName === 'sunny-home-garden-2').pack;
function withStepEvidence(mutate) {
  const pack = clone(pack2);
  const lesson = pack.lessons.find((entry) => entry.id === 'lesson-point-to');
  mutate(lesson.steps[0]);
  return validate(pack);
}

report(
  'validator accepts a valid evidence_skill_ids list (in-pack ids)',
  withStepEvidence((step) => { step.evidence_skill_ids = ['rhyme-listening', 'find-the-rhyme']; }).valid
);
report(
  'validator accepts a declared-dependency skill id (L5 colour-naming case)',
  withStepEvidence((step) => { step.evidence_skill_ids = ['colour-naming']; }).valid
);
report(
  'validator accepts evidence_participation: true',
  withStepEvidence((step) => { step.evidence_participation = true; }).valid
);

const emptySkills = withStepEvidence((step) => { step.evidence_skill_ids = []; });
report(
  'validator rejects an empty evidence_skill_ids array',
  !emptySkills.valid && rulesOf(emptySkills).has('P-SCHEMA-STEP-EVIDENCE-SKILLS'),
  `rules=${[...rulesOf(emptySkills)].join(',')}`
);
const danglingSkills = withStepEvidence((step) => { step.evidence_skill_ids = ['zzz-skill']; });
report(
  'validator rejects an unresolvable evidence_skill_ids entry',
  !danglingSkills.valid && rulesOf(danglingSkills).has('P-SCHEMA-STEP-EVIDENCE-SKILLS'),
  `rules=${[...rulesOf(danglingSkills)].join(',')}`
);
const badParticipation = withStepEvidence((step) => { step.evidence_participation = 'yes'; });
report(
  'validator rejects a non-boolean evidence_participation',
  !badParticipation.valid && rulesOf(badParticipation).has('P-SCHEMA-STEP-EVIDENCE-PARTICIPATION'),
  `rules=${[...rulesOf(badParticipation)].join(',')}`
);

// existing packs still validate with the new rules in place
for (const { dirName, pack } of packs) {
  const result = validate(pack);
  report(`existing pack ${dirName} still validates`, result.valid, `errors=${result.error_count}`);
}

// ============ source assertions (proof cannot drift from the app) ============
const sessionSource = fs.readFileSync(path.join(root, 'app/session.tsx'), 'utf8');
const queueSource = fs.readFileSync(path.join(root, 'lib', 'path-queue.ts'), 'utf8');
report(
  'session keeps exactly one recordStepEvidence call site',
  (sessionSource.match(/recordStepEvidence\(/g) ?? []).length === 1
);
report(
  'session builds entries through the shared stepEvidenceEntries()',
  sessionSource.includes('stepEvidenceEntries(outcome, lessonPrimarySkillId)') &&
    sessionSource.includes('step.evidence_skill_ids') &&
    sessionSource.includes('step.evidence_participation === true')
);
report(
  'path-queue maps weight through the shared evidenceWeightFor()',
  queueSource.includes('evidenceWeightFor(record)')
);

if (failures > 0) {
  console.error(`\n=== ENGINE EVIDENCE DRILL FAILED (${failures}) ===`);
  process.exit(1);
}
console.log('\n=== ENGINE EVIDENCE DRILL PASSED ===');
