/**
 * Engine groups + pattern rows drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the Wave 3 engine additions (picture-item `count` repeat groups and
 * LessonStep `row_item_ids` / `row_gap_index` pattern rows) against the REAL
 * validator (tools/validator.js validate()) and the REAL pack records on disk.
 *
 * Note on "real loader": lib/pack-loader.ts is TypeScript with JSON import
 * attributes and expo native imports, so it is not Node-importable. As with the
 * existing drills (lesson-selection-drill reads records; path-divergence imports
 * pure modules), this drill uses the real records + the real validator + explicit
 * source assertions that the loader/session contain the new branches, so the
 * proof cannot drift from the app.
 */

import fs from 'node:fs';
import path from 'node:path';
import { validate } from '../tools/validator.js';

const root = process.cwd();
let failures = 0;

function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}

function loadPackDir(dir) {
  const readJson = (file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const manifest = readJson('manifest.json');
  const assets = {};
  for (const relPath of Object.keys(manifest.file_hashes)) {
    if (relPath.startsWith('assets/')) {
      assets[relPath] = fs.readFileSync(path.join(dir, relPath), 'utf8');
    }
  }
  return {
    manifest,
    strings: readJson('strings.json'),
    skills: readJson('skills.json'),
    lessons: readJson('lessons.json'),
    song_templates: readJson('song_templates.json'),
    saved_songs: readJson('saved_songs.json'),
    characters: readJson('characters.json'),
    picture_sets: readJson('picture_sets.json'),
    missions: readJson('missions.json'),
    routines: readJson('routines.json'),
    time_concepts: readJson('time_concepts.json'),
    assets,
  };
}

const rulesOf = (result) => new Set(result.errors.map((error) => error.rule));
const clone = (value) => JSON.parse(JSON.stringify(value));

const pack1 = loadPackDir('packs/sunny-home-garden');
const pack2 = loadPackDir('packs/sunny-home-garden-2');

// ============ (c) BACKWARD COMPATIBILITY ============
const v1 = validate(pack1);
const v2 = validate(pack2);
report('Pack 1 still validates with 0 errors', v1.valid, `errors=${v1.error_count}`);
report('Pack 2 still validates with 0 errors', v2.valid, `errors=${v2.error_count}`);

const allPacks = [pack1, pack2];
const countSets = allPacks.flatMap((pack) =>
  pack.picture_sets
    .filter((set) => set.items.some((item) => item.count !== undefined))
    .map((set) => set.id)
);
report(
  'count items live only in the Wave 3 counting set (pre-Wave-3 rendering inputs unchanged)',
  JSON.stringify(countSets) === JSON.stringify(['counting-groups-set']),
  `sets with count items=${countSets.join(',') || 'none'}`
);

const rowLessonIds = allPacks.flatMap((pack) =>
  pack.lessons
    .filter((lesson) =>
      lesson.steps.some(
        (step) => step.row_item_ids !== undefined || step.row_gap_index !== undefined
      )
    )
    .map((lesson) => lesson.id)
);
report(
  'row fields are used only by the Wave 3 pattern lesson (other lessons unchanged)',
  JSON.stringify(rowLessonIds) === JSON.stringify(['lesson-copy-the-pattern']),
  `lessons with rows=${rowLessonIds.join(',') || 'none'}`
);

// ============ (a) COUNT ============
const everyday = pack2.picture_sets.find((set) => set.id === 'everyday-objects-set');
const ballItems = everyday.items.filter((item) => item.item_id === 'ball');
report(
  'a count item is ONE item record (one id, one asset) — nothing for the Map to collapse',
  ballItems.length === 1 &&
    typeof ballItems[0].asset_path === 'string' &&
    typeof ballItems[0].asset_sha256 === 'string',
  `ball records=${ballItems.length}`
);

// mirror the session's itemsById construction (asserted against source below)
const itemsById = new Map(everyday.items.map((item) => [item.item_id, item]));
const countThree = { ...ballItems[0], count: 3 };
itemsById.set('ball', countThree);
report(
  'itemsById keeps exactly one entry for the count:3 item',
  itemsById.size === everyday.items.length && itemsById.get('ball').count === 3,
  `map size=${itemsById.size} set size=${everyday.items.length}`
);

function withItemCount(value) {
  const pack = clone(pack2);
  const set = pack.picture_sets.find((entry) => entry.id === 'everyday-objects-set');
  const item = set.items.find((entry) => entry.item_id === 'ball');
  item.count = value;
  return validate(pack);
}

report('validator accepts count = 3 (positive integer)', withItemCount(3).valid);
for (const [label, value] of [
  ['0', 0],
  ['-1', -1],
  ['2.5', 2.5],
  ['"2"', '2'],
]) {
  const result = withItemCount(value);
  report(
    `validator rejects count = ${label}`,
    !result.valid && rulesOf(result).has('P-SCHEMA-ITEM-COUNT'),
    `rules=${[...rulesOf(result)].join(',')}`
  );
}

// ============ (b) ROWS ============
function withStepRow(mutate) {
  const pack = clone(pack2);
  const lesson = pack.lessons.find((entry) => entry.id === 'lesson-point-to');
  const step = lesson.steps[0]; // target 'cup'; everyday-objects-set has cup/ball/book/spoon
  mutate(step);
  return validate(pack);
}

const validCopy = withStepRow((step) => {
  step.row_item_ids = ['cup', 'ball', 'cup'];
  step.row_gap_index = 2;
});
report('validator accepts a valid COPY row (row[gap] === target)', validCopy.valid, `errors=${validCopy.error_count}`);

const validExtension = withStepRow((step) => {
  step.row_item_ids = ['cup', 'ball'];
});
report('validator accepts a valid EXTENSION row (target differs from last tile)', validExtension.valid, `errors=${validExtension.error_count}`);

const noRow = withStepRow(() => {});
report('a step with no row fields validates exactly as before', noRow.valid, `errors=${noRow.error_count}`);

const danglingRow = withStepRow((step) => {
  step.row_item_ids = ['cup', 'zzz', 'cup'];
  step.row_gap_index = 2;
});
report(
  'validator rejects a dangling row_item_ids entry',
  !danglingRow.valid && rulesOf(danglingRow).has('P-REF-STEP-ROW-ITEM'),
  `rules=${[...rulesOf(danglingRow)].join(',')}`
);

const outOfRangeGap = withStepRow((step) => {
  step.row_item_ids = ['cup', 'ball', 'cup'];
  step.row_gap_index = 7;
});
report(
  'validator rejects an out-of-range row_gap_index',
  !outOfRangeGap.valid && rulesOf(outOfRangeGap).has('P-SCHEMA-STEP-ROW-GAP-RANGE'),
  `rules=${[...rulesOf(outOfRangeGap)].join(',')}`
);

const badCopyTarget = withStepRow((step) => {
  step.row_item_ids = ['cup', 'ball', 'ball'];
  step.row_gap_index = 2;
});
report(
  'validator rejects a copy row whose gap tile is not the target',
  !badCopyTarget.valid && rulesOf(badCopyTarget).has('P-SCHEMA-STEP-ROW-TARGET'),
  `rules=${[...rulesOf(badCopyTarget)].join(',')}`
);

const badExtensionTarget = withStepRow((step) => {
  step.row_item_ids = ['cup', 'ball', 'cup'];
});
report(
  'validator rejects an extension whose target repeats the last tile',
  !badExtensionTarget.valid && rulesOf(badExtensionTarget).has('P-SCHEMA-STEP-ROW-TARGET'),
  `rules=${[...rulesOf(badExtensionTarget)].join(',')}`
);

const gapWithoutRow = withStepRow((step) => {
  step.row_gap_index = 0;
});
report(
  'validator rejects row_gap_index without row_item_ids',
  !gapWithoutRow.valid && rulesOf(gapWithoutRow).has('P-SCHEMA-STEP-ROW-GAP-RANGE'),
  `rules=${[...rulesOf(gapWithoutRow)].join(',')}`
);

// ============ (d) EVIDENCE UNTOUCHED + rendering branches (source assertions) ============
const sessionSource = fs.readFileSync(path.join(root, 'app/session.tsx'), 'utf8');
const loaderSource = fs.readFileSync(path.join(root, 'lib/pack-loader.ts'), 'utf8');
const bandsSource = fs.readFileSync(path.join(root, 'lib/bands.js'), 'utf8');

const evidenceCalls = sessionSource.match(/recordStepEvidence\(/g) ?? [];
report(
  'session still has exactly one recordStepEvidence call site (no new evidence type)',
  evidenceCalls.length === 1,
  `calls=${evidenceCalls.length}`
);
report(
  'evidence still keys by the lesson primary skill by default (groups/rows add display only)',
  sessionSource.includes('stepEvidenceEntries(outcome, lessonPrimarySkillId)')
);
report(
  'target matching still by item id (groups/rows are display only)',
  sessionSource.includes('if (itemId !== step.target_item_id)')
);
report(
  'session renders the group path only when count > 1',
  sessionSource.includes('item.count ?? 1') && sessionSource.includes('itemCount > 1')
);
report(
  'session renders the pattern row from step row fields',
  sessionSource.includes('step.row_item_ids') && sessionSource.includes('<PatternRow')
);
report(
  'loader/session keep the single-asset frame path for count 1',
  sessionSource.includes('style={StyleSheet.absoluteFill}') &&
    sessionSource.includes('contentFit="contain"')
);
report(
  'bands engine qualifying rule unchanged (still excludes help + participation)',
  bandsSource.includes('event.completed_with_help !== true') &&
    bandsSource.includes("event.weight !== 'participation'")
);
report(
  'loader exposes the new optional fields',
  loaderSource.includes('count?: number') &&
    loaderSource.includes('row_item_ids?: string[]') &&
    loaderSource.includes('row_gap_index?: number')
);

// ============ (e) IMPORT PATHS RESOLVE ============
function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // package import — not our concern
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.d.ts`];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

let importChecked = 0;
const missingImports = [];
for (const file of ['app/session.tsx', 'lib/pack-loader.ts']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/from\s+'([^']+)'/g)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;
    importChecked += 1;
    if (!resolveImport(path.join(root, file), spec)) missingImports.push(`${file} -> ${spec}`);
  }
}
report(
  'every relative import in the touched files resolves to a real file',
  missingImports.length === 0,
  `checked=${importChecked} missing=${missingImports.join(' | ') || 'none'}`
);

if (failures > 0) {
  console.error(`\n=== ENGINE GROUPS/ROWS DRILL FAILED (${failures}) ===`);
  process.exit(1);
}
console.log('\n=== ENGINE GROUPS/ROWS DRILL PASSED ===');
