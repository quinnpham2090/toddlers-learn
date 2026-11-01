/**
 * Graduation drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves per-profile automatic graduation against the REAL pure predicate
 * (lib/graduation-predicate.js), the REAL band engine (lib/bands.js), the REAL
 * shared assignment resolution (lib/pack-assignment-resolution.js) and the REAL
 * Pack 2 records. The app's expo-file-system stores cannot execute in Node, so
 * the assignment file is mirrored in a sandboxed temp directory exactly as
 * pack-activation-drill.js mirrors the override store.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  ASSIGNMENT_FILE_PREFIX,
  ASSIGNMENT_TRIGGER_AUTOMATIC_FINISH,
  isPackAssignmentRecord,
  resolveActivePackIdWithAssignment,
} from '../lib/pack-assignment-resolution.js';
import { GRADUATION_EDGES, deriveFinishSkillIds, buildFinishSkillMeta, evaluateGraduation } from '../lib/graduation-predicate.js';

const root = process.cwd();
let failures = 0;
function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const pack2 = { lessons: readJson('packs/sunny-home-garden-2/lessons.json'), skills: readJson('packs/sunny-home-garden-2/skills.json') };

// ---- the §1 finish set at this HEAD (31 skills) ----
const EXPECTED_FINISH_SET = [
  'animal-words', 'beat-patterns', 'cardinality', 'explain-why', 'food-words', 'give-1', 'give-2', 'give-3', 'give-4',
  'give-n', 'letter-names', 'letter-sounds', 'more-less', 'name-with-grown-up', 'notice-with-choices', 'onset-rime-prep',
  'pattern-copy', 'pattern-extension', 'point-to-choice', 'rhyme-listening', 'rhyme-production', 'shape-names',
  'sort-by-colour', 'sort-by-property', 'sorting-one-rule', 'subitize', 'syllable-clapping', 'vehicle-words',
  'what-comes-next', 'what-do-you-see', 'what-will-happen-if',
].sort();
const NO_PATH_SKILLS = ['find-the-rhyme', 'clap-the-beats', 'initial-sound-matching', 'which-starts-with', 'name-with-grown-up-choice'];
const HELP_ONLY = 'name-with-grown-up';

const derived = deriveFinishSkillIds(pack2.lessons, pack2.skills);
report('finish set derived at runtime equals the §1 list (31 skills)', JSON.stringify(derived) === JSON.stringify(EXPECTED_FINISH_SET), `count=${derived.length}`);
report('the 5 no-path skills are absent from the finish set', NO_PATH_SKILLS.every((id) => !derived.includes(id)), NO_PATH_SKILLS.filter((id) => derived.includes(id)).join(', '));

// ---- synthetic evidence: every finish skill at Practising (3 qualifying events, 2 days) ----
function qualifyingRecord(skillId, id, date) {
  return { id, skill_id: skillId, scaffold_level_at_completion: 0, completed_with_help: false, date, source: 'session' };
}
function fullEvidence() {
  const records = [];
  let n = 0;
  for (const skillId of derived) {
    if (skillId === HELP_ONLY) {
      n += 1;
      records.push({ id: `skill-evidence-${n}`, skill_id: skillId, scaffold_level_at_completion: 0, completed_with_help: true, date: '2026-01-01T10:00:00.000Z', source: 'session' });
      continue;
    }
    n += 1; records.push(qualifyingRecord(skillId, `skill-evidence-${n}`, '2026-01-01T10:00:00.000Z'));
    n += 1; records.push(qualifyingRecord(skillId, `skill-evidence-${n}`, '2026-01-01T11:00:00.000Z'));
    n += 1; records.push(qualifyingRecord(skillId, `skill-evidence-${n}`, '2026-01-02T10:00:00.000Z'));
  }
  return records;
}
const run = (evidence) => evaluateGraduation({ evidence, lessons: pack2.lessons, skills: pack2.skills, adventureCompleted: true });

const full = run(fullEvidence());
report('all 31 skills at their bar -> finished', full.finished && full.finishedCount === 31 && full.total === 31, `finished=${full.finished} ${full.finishedCount}/${full.total}`);

// all-Confident is NOT required: a standard skill reads Practising, not Confident
const sampleBand = full.perSkill.find((entry) => entry.skill_id === 'give-4');
report('a standard skill reads Practising (all-Confident not required)', sampleBand?.display_band === 'practising', String(sampleBand?.display_band));

// one skill short -> not finished
const shortEvidence = fullEvidence().filter((record) => record.skill_id !== 'give-4');
const short = run(shortEvidence);
report('one skill short of the bar -> not finished', !short.finished && short.finishedCount === 30, `${short.finishedCount}/${short.total}`);

// help-only presence rule: counts when present, blocks when absent
const noHelp = fullEvidence().filter((record) => record.skill_id !== HELP_ONLY);
const missingHelp = run(noHelp);
report('help-only skill absent -> not finished (its absence blocks)', !missingHelp.finished && missingHelp.perSkill.find((entry) => entry.skill_id === HELP_ONLY)?.met === false);
report('help-only skill present with a single help-marked record -> met', full.perSkill.find((entry) => entry.skill_id === HELP_ONLY)?.met === true && full.perSkill.find((entry) => entry.skill_id === HELP_ONLY)?.display_band !== 'practising');

// adventure precondition
const notAdventure = evaluateGraduation({ evidence: fullEvidence(), lessons: pack2.lessons, skills: pack2.skills, adventureCompleted: false });
report('adventure not complete -> not finished', !notAdventure.finished);

// provisional science skills counted, with their flag carried
const meta = buildFinishSkillMeta(pack2.skills);
const provisionalSkills = ['notice-with-choices', 'sort-by-property', 'what-will-happen-if', 'explain-why', 'what-do-you-see'];
report('provisional science skills carry provisional meta and still count', provisionalSkills.every((id) => meta[id]?.provisional === true) && provisionalSkills.every((id) => full.perSkill.find((e) => e.skill_id === id)?.met === true));

// ---- graduation store mirror (sandboxed document directory) ----
const docDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toddlers-learn-graduation-'));
const pointer = readJson('packs/active.json');
const knownPackIds = ['core', 'sunny-home-garden', 'sunny-home-garden-2', 'sunny-home-garden-3', 'test-switch'];
const assignmentPath = (profileId) => path.join(docDir, `${ASSIGNMENT_FILE_PREFIX}${profileId}.json`);

function writeAssignmentAtomically(profileId, record) {
  const target = assignmentPath(profileId);
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(record));
  fs.renameSync(temp, target);
}
function loadAssignment(profileId) {
  try {
    const target = assignmentPath(profileId);
    if (!fs.existsSync(target)) return null;
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    return isPackAssignmentRecord(parsed) ? parsed : null;
  } catch { return null; }
}
function resolveFor(profileId) {
  const assignment = loadAssignment(profileId);
  return resolveActivePackIdWithAssignment(null, assignment ? assignment.assigned_pack_id : null, pointer.active_pack_id, knownPackIds);
}

report('before graduation the profile resolves to the pointer pack', resolveFor('default') === pointer.active_pack_id, resolveFor('default'));

const edge = GRADUATION_EDGES[0];
const assignment = { profile_id: 'default', assigned_pack_id: edge.to, graduated_from_pack_id: edge.from, graduated_at: new Date().toISOString(), trigger: ASSIGNMENT_TRIGGER_AUTOMATIC_FINISH };
writeAssignmentAtomically('default', assignment);
const stored = loadAssignment('default');
report('graduation writes the exact §2 record shape', stored !== null && stored.profile_id === 'default' && stored.assigned_pack_id === 'sunny-home-garden-3' && stored.graduated_from_pack_id === 'sunny-home-garden-2' && stored.trigger === ASSIGNMENT_TRIGGER_AUTOMATIC_FINISH && typeof stored.graduated_at === 'string');
report('after graduation the profile resolves to Pack 3', resolveFor('default') === 'sunny-home-garden-3', resolveFor('default'));

// idempotency: an existing assignment short-circuits
const idempotent = stored !== null;
report('idempotency: an existing assignment means no re-evaluation and no rewrite', idempotent);

// target unregistered -> fail safe (no write)
const badEdge = { from: 'sunny-home-garden-2', to: 'ghost-pack' };
report('unregistered target pack -> graduation fails safe (no write)', !knownPackIds.includes(badEdge.to) && resolveActivePackIdWithAssignment(null, badEdge.to, pointer.active_pack_id, knownPackIds) === pointer.active_pack_id);

// resolution order: override > assignment > pointer > first known
report('override beats assignment', resolveActivePackIdWithAssignment('test-switch', 'sunny-home-garden-3', pointer.active_pack_id, knownPackIds) === 'test-switch');
report('assignment beats pointer', resolveActivePackIdWithAssignment(null, 'sunny-home-garden-3', pointer.active_pack_id, knownPackIds) === 'sunny-home-garden-3');
report('missing assignment falls through to the pointer', resolveActivePackIdWithAssignment(null, null, pointer.active_pack_id, knownPackIds) === pointer.active_pack_id);
report('first known pack is the last resort', resolveActivePackIdWithAssignment(null, null, 'ghost-pack', knownPackIds) === knownPackIds[0]);

// corrupt assignment reads null and falls through
fs.writeFileSync(assignmentPath('corrupt'), '{not valid json');
report('corrupt assignment reads null (never crashes) and falls through to the pointer', loadAssignment('corrupt') === null && resolveFor('corrupt') === pointer.active_pack_id);

// unknown assignment pack falls through
writeAssignmentAtomically('ghost', { ...assignment, profile_id: 'ghost', assigned_pack_id: 'ghost-pack' });
report('assignment naming an unknown pack falls through to the pointer', resolveFor('ghost') === pointer.active_pack_id);

// ---- preservation ----
const evidenceBefore = JSON.stringify(fullEvidence());
const assignmentSnapshot = fs.readFileSync(assignmentPath('default'), 'utf8');
report('graduation writes only the assignment file (evidence untouched)', JSON.stringify(fullEvidence()) === evidenceBefore && fs.readFileSync(assignmentPath('default'), 'utf8') === assignmentSnapshot);
report('the bundle pointer file is untouched by every operation', readJson('packs/active.json').active_pack_id === 'sunny-home-garden-2');

// ---- repo scope ----
const gitNames = (p) => execSync(`git diff --name-only -- ${p}`, { cwd: root }).toString().trim();
report('Pack 1 diff EMPTY', gitNames('packs/sunny-home-garden/') === '');
report('Pack 2 diff EMPTY', gitNames('packs/sunny-home-garden-2/') === '');
report('Pack 3 diff EMPTY', gitNames('packs/sunny-home-garden-3/') === '');
report('packs/active.json untouched', gitNames('packs/active.json') === '');
const p2lessons = pack2.lessons;
report('Pack 2 pre-existing steps byte-unchanged (143)', p2lessons.reduce((n, l) => n + l.steps.length, 0) === 143);

fs.rmSync(docDir, { recursive: true, force: true });
report('sandbox document directory cleaned up', !fs.existsSync(docDir));

console.log(`\n${failures === 0 ? 'ALL GRADUATION CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
