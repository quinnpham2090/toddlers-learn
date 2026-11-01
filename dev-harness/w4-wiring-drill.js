/**
 * Wave 4 wiring drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the Wave 4 wiring against the REAL live Pack 2 records, the REAL
 * validator hash scheme, the REAL raw-byte sha256s from the delivery zip
 * manifests, and the REAL source files the runtime reads (lib/pack-loader.ts
 * registries, app/session.tsx FINALE_CONFIG + the finale-voice fix).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sha256Hex } from '../tools/validator.js';

const root = process.cwd();
let failures = 0;
function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const readText = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const rawSha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');

const P2 = 'packs/sunny-home-garden-2/';
const lessons = readJson(P2 + 'lessons.json');
const skills = readJson(P2 + 'skills.json');
const sets = readJson(P2 + 'picture_sets.json');
const strings = readJson(P2 + 'strings.json').locales['en-US'];
const manifest = readJson(P2 + 'manifest.json');
const loaderSrc = readText('lib/pack-loader.ts');
const sessionSrc = readText('app/session.tsx');

const lessonById = (id) => lessons.find((l) => l.id === id);
const skillById = (id) => skills.find((s) => s.id === id);

// ---- registry readers (Pack 2 blocks of pack-loader.ts) ----
function sliceBetween(src, start, end) {
  const i = src.indexOf(start);
  if (i < 0) return '';
  const j = src.indexOf(end, i);
  return j < 0 ? src.slice(i) : src.slice(i, j);
}
const voiceBlock = sliceBetween(loaderSrc, '"sunny-home-garden-2": {', 'const PACK_ASSET_REGISTRY');
const assetBlock = sliceBetween(sliceBetween(loaderSrc, 'const PACK_ASSET_REGISTRY', 'let cachedOverride'), "'sunny-home-garden-2': {", 'let cachedOverride');
function identFor(block, key) {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = block.match(new RegExp(`["']${esc}["']\\s*:\\s*([A-Za-z0-9_]+)`));
  return m ? m[1] : null;
}
function importPathFor(ident) {
  if (!ident) return null;
  const m = loaderSrc.match(new RegExp(`import\\s+${ident}\\s+from\\s+'([^']+)'`));
  return m ? path.join('lib', m[1]) : null;
}
const voiceResolves = (key) => {
  const rel = importPathFor(identFor(voiceBlock, key));
  return Boolean(rel && exists(rel));
};
const assetResolves = (key) => {
  const rel = importPathFor(identFor(assetBlock, key));
  return Boolean(rel && exists(rel));
};

// ================= 1. 5 lessons, 25 steps, verbatim =================
const W4 = {
  'lesson-give-four': {
    set: 'counting-groups-set',
    primary: 'give-4',
    secondary: [],
    fallback: 'lesson-give-three',
    fbp: 'counting-groups-set',
    steps: [
      ['Give Moss 4 cups!', 'cup-4', ['cup-4', 'cup-2', 'cup-3']],
      ['Give Moss 4 spoons!', 'spoon-4', ['spoon-4', 'spoon-1', 'spoon-3']],
      ['Give Moss 4 books!', 'book-4', ['book-4', 'book-2', 'book-1']],
      ['Give Moss 4 flowers!', 'red-flower-4', ['red-flower-4', 'red-flower-3', 'red-flower-2']],
      ['Give Moss 4 balls!', 'ball-4', ['ball-4', 'ball-2', 'ball-3']],
    ],
  },
  'lesson-how-many': {
    set: 'counting-groups-set',
    primary: 'cardinality',
    secondary: [],
    fallback: 'lesson-give-four',
    fbp: 'counting-groups-set',
    steps: [
      ['One, two, three cups! How many? Tap the group with three!', 'ball-3', ['ball-3', 'ball-2', 'ball-4']],
      ['One, two spoons! How many? Tap the group with two!', 'book-2', ['book-2', 'book-4', 'book-3']],
      ['One, two, three, four balls! How many? Tap the group with four!', 'cup-4', ['cup-4', 'cup-2', 'cup-3']],
      ['One, two, three books! How many? Tap the group with three!', 'spoon-3', ['spoon-3', 'spoon-4', 'spoon-2']],
      ['One, two, three, four flowers! How many? Tap the group with four!', 'ball-4', ['ball-4', 'ball-3', 'ball-2']],
    ],
  },
  'lesson-more-or-less': {
    set: 'counting-groups-set',
    primary: 'more-less',
    secondary: [],
    fallback: 'lesson-how-many',
    fbp: 'counting-groups-set',
    steps: [
      ['Tap the group with MORE balls!', 'ball-4', ['ball-1', 'ball-2', 'ball-4']],
      ['Tap the group with LESS cups!', 'cup-1', ['cup-1', 'cup-3', 'cup-4']],
      ['Tap the group with MORE spoons!', 'spoon-4', ['spoon-2', 'spoon-3', 'spoon-4']],
      ['Tap the group with LESS books!', 'book-1', ['book-1', 'book-2', 'book-3']],
      ['Tap the group with MORE flowers!', 'red-flower-4', ['red-flower-2', 'red-flower-3', 'red-flower-4']],
    ],
  },
  'lesson-shape-names': {
    set: 'shape-names-set',
    primary: 'shape-names',
    secondary: [],
    fallback: 'lesson-more-or-less',
    fbp: 'counting-groups-set',
    steps: [
      ['Tap the circle!', 'circle', ['circle', 'square', 'triangle']],
      ['Tap the square!', 'square', ['square', 'circle', 'rectangle']],
      ['Tap the triangle!', 'triangle', ['triangle', 'rectangle', 'circle']],
      ['Tap the rectangle!', 'rectangle', ['rectangle', 'square', 'triangle']],
      ['Find something round!', 'ball', ['ball', 'book', 'cup']],
    ],
  },
  'lesson-copy-abc-pattern': {
    set: 'pattern-set',
    primary: 'pattern-extension',
    secondary: ['pattern-copy', 'beat-patterns'],
    fallback: 'lesson-shape-names',
    fbp: 'shape-names-set',
    steps: [
      ['Copy the flowers! Tap the flower that goes here!', 'yellow-flower', ['yellow-flower', 'red-flower', 'blue-flower']],
      ['Copy the pattern! Tap the one that goes here!', 'cup', ['cup', 'ball', 'spoon']],
      ['Keep the pattern going! Tap the one that goes here!', 'blue-flower', ['blue-flower', 'yellow-flower', 'red-flower']],
      ['Keep the beat pattern going! Tap the beat that goes here!', 'beat-rest', ['beat-rest', 'beat-loud', 'beat-soft']],
      ['What comes next? Tap the one that goes here!', 'spoon', ['spoon', 'cup', 'ball']],
    ],
  },
};

report('exactly the 5 Wave 4 lessons exist', Object.keys(W4).every((id) => lessonById(id)) && lessons.filter((l) => W4[l.id]).length === 5);
report('25 Wave 4 steps total', Object.keys(W4).reduce((n, id) => n + (lessonById(id)?.steps.length ?? 0), 0) === 25);

let verbatim = true;
let verbatimDetail = '';
for (const [id, spec] of Object.entries(W4)) {
  const lesson = lessonById(id);
  if (!lesson) { verbatim = false; verbatimDetail = `missing ${id}`; break; }
  if (lesson.character_id !== 'moss') { verbatim = false; verbatimDetail = `${id} character`; break; }
  if (lesson.age_band !== '3-4' || lesson.interaction_type !== 'tap_choice') { verbatim = false; verbatimDetail = `${id} band/type`; break; }
  if (lesson.picture_set_id !== spec.set) { verbatim = false; verbatimDetail = `${id} set`; break; }
  if (lesson.primary_skill_id !== spec.primary) { verbatim = false; verbatimDetail = `${id} primary`; break; }
  if (JSON.stringify(lesson.secondary_skill_ids) !== JSON.stringify(spec.secondary)) { verbatim = false; verbatimDetail = `${id} secondary`; break; }
  if (lesson.fallback_lesson_id !== spec.fallback || lesson.fallback_picture_id !== spec.fbp) { verbatim = false; verbatimDetail = `${id} fallback`; break; }
  if (lesson.song_template_id !== null || lesson.mission_id !== null || lesson.routine_id !== null) { verbatim = false; verbatimDetail = `${id} optional ids`; break; }
  if (lesson.estimated_minutes !== 5 || lesson.chunk_budget_minutes !== 5) { verbatim = false; verbatimDetail = `${id} minutes`; break; }
  for (let i = 0; i < spec.steps.length; i++) {
    const [prompt, target, choices] = spec.steps[i];
    const step = lesson.steps[i];
    const snake = id.replace('lesson-', '').replace(/-/g, '_');
    if (!step) { verbatim = false; verbatimDetail = `${id} step ${i + 1} missing`; break; }
    if (strings[`lesson.${snake}.step_${i + 1}.prompt`] !== prompt) { verbatim = false; verbatimDetail = `${id} step ${i + 1} prompt`; break; }
    if (step.prompt_ref !== `lesson.${snake}.step_${i + 1}.prompt`) { verbatim = false; verbatimDetail = `${id} step ${i + 1} prompt_ref`; break; }
    if (step.target_item_id !== target) { verbatim = false; verbatimDetail = `${id} step ${i + 1} target`; break; }
    if (JSON.stringify(step.choice_item_ids) !== JSON.stringify(choices)) { verbatim = false; verbatimDetail = `${id} step ${i + 1} choices`; break; }
    if (step.choice_item_ids.filter((c) => c === target).length !== 1) { verbatim = false; verbatimDetail = `${id} step ${i + 1} exactly-one-correct`; break; }
    if (step.celebration_ref !== `lesson.${snake}.step_${i + 1}.celebration`) { verbatim = false; verbatimDetail = `${id} step ${i + 1} celebration_ref`; break; }
  }
  if (!verbatim) break;
}
report('every Wave 4 step prompt/target/choices match this prompt verbatim (exactly one correct)', verbatim, verbatimDetail);

// ================= 2. per-step evidence =================
let evidenceOk = true;
let evidenceDetail = '';
for (const [id, spec] of Object.entries(W4)) {
  const lesson = lessonById(id);
  for (let i = 0; i < lesson.steps.length; i++) {
    const step = lesson.steps[i];
    if (step.evidence_participation !== undefined) { evidenceOk = false; evidenceDetail = `${id} step ${i + 1} participation`; break; }
    if (id === 'lesson-copy-abc-pattern') {
      const expected = [['pattern-copy'], ['pattern-copy'], ['pattern-extension'], ['beat-patterns'], ['what-comes-next']][i];
      if (JSON.stringify(step.evidence_skill_ids) !== JSON.stringify(expected)) { evidenceOk = false; evidenceDetail = `${id} step ${i + 1} evidence`; break; }
    } else if (step.evidence_skill_ids !== undefined) {
      evidenceOk = false; evidenceDetail = `${id} step ${i + 1} unexpected evidence_skill_ids`; break;
    }
  }
  if (!evidenceOk) break;
}
report('per-step evidence: L1-L4 default to primary; L5 exact; no participation flag', evidenceOk, evidenceDetail);

// ================= 3. row[gap] === target for all 5 L5 rows =================
const L5_ROWS = [
  { row: ['red-flower', 'yellow-flower', 'blue-flower', 'red-flower', 'yellow-flower'], gap: 4, target: 'yellow-flower', unit: ['red-flower', 'yellow-flower', 'blue-flower'] },
  { row: ['ball', 'cup', 'spoon', 'ball', 'cup'], gap: 4, target: 'cup', unit: ['ball', 'cup', 'spoon'] },
  { row: ['red-flower', 'yellow-flower', 'blue-flower', 'red-flower', 'yellow-flower', 'blue-flower'], gap: 5, target: 'blue-flower', unit: ['red-flower', 'yellow-flower', 'blue-flower'] },
  { row: ['beat-loud', 'beat-soft', 'beat-rest', 'beat-loud', 'beat-soft', 'beat-rest'], gap: 5, target: 'beat-rest', unit: ['beat-loud', 'beat-soft', 'beat-rest'] },
  { row: ['cup', 'ball', 'spoon', 'cup', 'ball', 'spoon', 'cup', 'ball', 'spoon'], gap: 8, target: 'spoon', unit: ['cup', 'ball', 'spoon'] },
];
const l5 = lessonById('lesson-copy-abc-pattern');
let rowsOk = true;
let rowsDetail = '';
for (let i = 0; i < L5_ROWS.length; i++) {
  const { row, gap, target, unit } = L5_ROWS[i];
  const step = l5.steps[i];
  if (JSON.stringify(step.row_item_ids) !== JSON.stringify(row) || step.row_gap_index !== gap) { rowsOk = false; rowsDetail = `step ${i + 1} row/gap`; break; }
  if (row[gap] !== target || step.target_item_id !== target) { rowsOk = false; rowsDetail = `step ${i + 1} row[gap]!==target`; break; }
  const prefix = row.slice(0, gap);
  const fullUnits = Math.floor(prefix.length / unit.length);
  const remainder = prefix.length % unit.length;
  const hasFullUnit = fullUnits >= 1;
  const hasPartialRepeat = remainder > 0 && unit.slice(0, remainder).every((u, k) => prefix[prefix.length - remainder + k] === u);
  if (!hasFullUnit || !hasPartialRepeat) { rowsOk = false; rowsDetail = `step ${i + 1} prefix not unit+partial`; break; }
}
report('row[gap] === target for all 5 L5 rows (incl. corrected step 5: 9 items, gap 8, spoon)', rowsOk, rowsDetail);
report('step 5 row is 9 items with gap 8', l5.steps[4].row_item_ids.length === 9 && l5.steps[4].row_gap_index === 8);

// ================= 4. finale target/tiles =================
const FINALE = {
  'lesson-give-four': { target: 'ball-4', tiles: ['ball-4', 'ball-2', 'ball-3'] },
  'lesson-how-many': { target: 'ball-4', tiles: ['ball-4', 'ball-3', 'ball-2'] },
  'lesson-more-or-less': { target: 'red-flower-4', tiles: ['red-flower-4', 'red-flower-2', 'red-flower-3'] },
  'lesson-shape-names': { target: 'ball', tiles: ['ball', 'book', 'cup'] },
  'lesson-copy-abc-pattern': { target: 'spoon', tiles: ['spoon', 'cup', 'ball'] },
};
const finaleEntries = [...sessionSrc.matchAll(/'([^']+)':\s*\{\s*targetItemId:\s*'([^']+)',\s*tileItemIds:\s*\[([^\]]*)\],\s*findPromptRef:\s*'([^']+)',\s*\}/g)].map((m) => ({
  id: m[1],
  target: m[2],
  tiles: m[3].split(',').map((t) => t.trim().replace(/'/g, '')).filter(Boolean),
  ref: m[4],
}));
const finaleById = new Map(finaleEntries.map((e) => [e.id, e]));
let finaleOk = true;
let finaleDetail = '';
for (const [id, spec] of Object.entries(FINALE)) {
  const entry = finaleById.get(id);
  const lesson = lessonById(id);
  if (!entry) { finaleOk = false; finaleDetail = `${id} no entry`; break; }
  if (entry.target !== spec.target || JSON.stringify(entry.tiles) !== JSON.stringify(spec.tiles)) { finaleOk = false; finaleDetail = `${id} target/tiles`; break; }
  const step5 = lesson.steps[4];
  if (step5.target_item_id !== entry.target) { finaleOk = false; finaleDetail = `${id} target != step5`; break; }
  const allInSteps = entry.tiles.every((t) => lesson.steps.some((s) => s.target_item_id === t || s.choice_item_ids.includes(t)));
  if (!allInSteps) { finaleOk = false; finaleDetail = `${id} tile not in steps`; break; }
}
report('every Wave 4 finale target == step-5 target; every tile appears in its lesson steps', finaleOk, finaleDetail);

// ================= 5. fallback chain in queue order =================
const chain = ['lesson-give-three', 'lesson-give-four', 'lesson-how-many', 'lesson-more-or-less', 'lesson-shape-names', 'lesson-copy-abc-pattern'];
let chainOk = true;
for (let i = 1; i < chain.length; i++) {
  if (lessonById(chain[i])?.fallback_lesson_id !== chain[i - 1]) { chainOk = false; break; }
}
report('fallbacks resolve in queue order: give-three -> give-four -> how-many -> more-or-less -> shape-names -> copy-abc-pattern', chainOk);

// ================= 6. skill graph =================
report('give-3 next = [give-n, give-4] (branch; give-n still reachable)', JSON.stringify(skillById('give-3')?.next_skills) === JSON.stringify(['give-n', 'give-4']));
report('give-n next = [] (unchanged)', JSON.stringify(skillById('give-n')?.next_skills) === JSON.stringify([]));
report('all 4 new skills exist, domain maths', ['give-4', 'cardinality', 'more-less', 'shape-names'].every((id) => skillById(id)?.domain === 'maths'));
report('new skill prerequisites chain', skillById('give-4')?.prerequisites[0] === 'give-3' && skillById('cardinality')?.prerequisites[0] === 'give-4' && skillById('more-less')?.prerequisites[0] === 'cardinality' && skillById('shape-names')?.prerequisites[0] === 'subitize');
report('pattern-extension -> beat-patterns -> what-comes-next -> [] unchanged', JSON.stringify(skillById('pattern-extension')?.next_skills) === JSON.stringify(['beat-patterns']) && JSON.stringify(skillById('beat-patterns')?.next_skills) === JSON.stringify(['what-comes-next']) && JSON.stringify(skillById('what-comes-next')?.next_skills) === JSON.stringify([]));

// ================= 7. 60 voice + 4 images resolve; sha256 matches zip + manifest =================
const W4_SNAKES = ['give_four', 'how_many', 'more_or_less', 'shape_names', 'copy_abc_pattern'];
const voiceRefs = [];
for (const s of W4_SNAKES) {
  for (let n = 1; n <= 5; n++) { voiceRefs.push(`lesson.${s}.step_${n}.prompt`); voiceRefs.push(`lesson.${s}.step_${n}.celebration`); }
  voiceRefs.push(`lesson.${s}.closing_win`, `lesson.${s}.find_prompt`);
}
const unresolvedVoice = voiceRefs.filter((r) => !voiceResolves(r));
report('all 60 Wave 4 voice refs resolve through the loader to real files', unresolvedVoice.length === 0, unresolvedVoice.join(', '));

const shapeAssets = ['assets/circle.jpg', 'assets/square.jpg', 'assets/triangle.jpg', 'assets/rectangle.jpg'];
report('all 4 Wave 4 images resolve through the asset registry', shapeAssets.every((a) => assetResolves(a)));

// raw-byte sha256 from the delivery zip manifests, embedded (self-contained)
const RAW_SHA = {
  "images/circle.jpg": "6444714c40fe7bba84d206087e0d1b2fe748f8bc42594dfec4dc843b620752b7",
  "images/rectangle.jpg": "6ca9a70d8a3a10352cd72d4e2e7937c522ec58c060017faaaed89bd5d2a443a9",
  "images/square.jpg": "4930bd2762c32041ad81aabd0efb61a6bbe1ad5ece3bce74f48512eb6d5e9d60",
  "images/triangle.jpg": "51169db230648592517583cef7ab23b469465b271135bd3e3bae2e3a03b6dae4",
  "voice/lesson-copy-abc-pattern_n01.mp3": "a8c8be684ee49c31c54660426756a6379c83c2ddad8be67b254e9f91cc02969b",
  "voice/lesson-copy-abc-pattern_n02.mp3": "de1e4ea2fdb3c9e5e62991270ca62e7314018068c88e946df0d1d0acc6329092",
  "voice/lesson-copy-abc-pattern_n03.mp3": "f256c6e6e70d31caf819d6ad594dc2f3b0fe4ac6fb19dd6157a38259ca9eeb33",
  "voice/lesson-copy-abc-pattern_n04.mp3": "2eafacf0deaf6f6e8ba61fe61160c7842ba22d59c86e09690dcc2f0f36ba64bf",
  "voice/lesson-copy-abc-pattern_n05.mp3": "58900d9231da4bf3cfa371a9ec26e9fc022364da7839eea65e3ab22307af08c7",
  "voice/lesson-copy-abc-pattern_n06.mp3": "f9397845163fe7f0649b5ad6f0aac98fb869115c6995fb484c761d890c735120",
  "voice/lesson-copy-abc-pattern_n07.mp3": "bf9b43072b4a4927e45dd219076d1deb5ba79ff49c09a3b2ab0acc0a9cd88fbe",
  "voice/lesson-copy-abc-pattern_n08.mp3": "2c055fdb9b0bfd11ba13fbcfcaee252e4c5c91861f43572aa1e37aeda2dec151",
  "voice/lesson-copy-abc-pattern_n09.mp3": "4d6510317e6faa85cc5211d088609eeeb7eb8f600e9914c8c6e9e0b0cb8c2d6c",
  "voice/lesson-copy-abc-pattern_n10.mp3": "c3727738b3d56d7741a88da014cc6882e94a3c3038192bc60db448f1da6dc9de",
  "voice/lesson-copy-abc-pattern_n11.mp3": "0630612aae8a2f211ae3e95a4c8860c74c94e8e9144d1550c145c16e5f5ec3b4",
  "voice/lesson-copy-abc-pattern_n12.mp3": "df935c073c1c22c66f17026d57a3e85f9efa2d03d16c69de3201b736bcf76ff7",
  "voice/lesson-give-four_n01.mp3": "acb4adcf795be943423bb15444f623552a847ea7342d3bec6cd082afca09b256",
  "voice/lesson-give-four_n02.mp3": "b0a5010f5ce19ed22d23bc2199d85958d4b361d735b9be1bef6857bd1d67d3d7",
  "voice/lesson-give-four_n03.mp3": "6f2c505b1ccbd1b78b5314597731e6187b5b2ef8750d4ae37df199d499af25ff",
  "voice/lesson-give-four_n04.mp3": "ca14a820bacbe4c4ec9539ce1ea3f9c9e28b68c5526121c7cf09a92542a23296",
  "voice/lesson-give-four_n05.mp3": "df9772035ccd03f4247c2c9946105fee263d71562ecdc60c90ff2fdc610ed9ae",
  "voice/lesson-give-four_n06.mp3": "f887b6469dc4d01467ee44db3b9dcf61a30e041bb462ffe56ef21d60f365a1fe",
  "voice/lesson-give-four_n07.mp3": "7a12b9c465fc6f0b778ca850766b96b7964f692adade6e4392e10c5924729ac5",
  "voice/lesson-give-four_n08.mp3": "1bf9a6f9318d391f00484c1dc683bc704dec174892fc81f49c7062d2d7864f53",
  "voice/lesson-give-four_n09.mp3": "d7d2662a971c2870530a4b089c834c5f46fb4c7f5e2d7664be9e5a339d6a3f76",
  "voice/lesson-give-four_n10.mp3": "d9efc9bae4e95f97c019272af113d8522fe2acebebae77d7270508e709ca8521",
  "voice/lesson-give-four_n11.mp3": "bb4f7de04524b6ecae6515cb494f6547b7d5187b24df0603f2a9f4a0b914418a",
  "voice/lesson-give-four_n12.mp3": "ffd349330ac7907456dbd24cbeacf3b18c357bdbf23f370a6144599749e681cf",
  "voice/lesson-how-many_n01.mp3": "a9c06f7cdea4659b95855314b519defe9ce8327039dae8729101a626897277e9",
  "voice/lesson-how-many_n02.mp3": "370fcccd1c2eb07ad2e8753533eb7026f2cc147c68b4f2ae224a357bcccbf977",
  "voice/lesson-how-many_n03.mp3": "7abe90a307ac884e0b2dc76c8aa250c365578af7cce1a223b0044e68165ac016",
  "voice/lesson-how-many_n04.mp3": "a74db3b1b9f48408d6d2562f59e75d8b1e907a3036fbd88808ffabe2831405ab",
  "voice/lesson-how-many_n05.mp3": "5aa0f2684dda42e496f091d149f684b89a2b57bd636d034f4ae1beff90a3247b",
  "voice/lesson-how-many_n06.mp3": "943f9b280bf0a5eb4ff8ad226f36f3892046835b6d4078e3ff0753dec8d85c24",
  "voice/lesson-how-many_n07.mp3": "4685898c6dbb3426277acf1517312dd46fb4d27e921fc41eb8564fecfc61ce2a",
  "voice/lesson-how-many_n08.mp3": "f08fc96bebb8829c64eb8b52d97e9eb6a65d9058029d87b0d12e2dca9a0cb732",
  "voice/lesson-how-many_n09.mp3": "640b9da8951fb89aaaa0492e9925ec6a4706f4a5b7226251c421d4e74da0dbf7",
  "voice/lesson-how-many_n10.mp3": "a084aca6b2e9d30be02df9f82fc7c1fffb589139e31d1d3d02df3c220ce4d3ae",
  "voice/lesson-how-many_n11.mp3": "839823bfab53bacab2fcb11862266b457c821129c3e7dc20b5a8709d90eba481",
  "voice/lesson-how-many_n12.mp3": "cc9f98e83b8b9f2d3022a9403f4af5ac2577558c91e418305ec30361fe4459d0",
  "voice/lesson-more-or-less_n01.mp3": "82f521798c3f97e2d835e726af77b30e5a7874e25228f56c8605f5efa6141ba4",
  "voice/lesson-more-or-less_n02.mp3": "f280294525a616090655105083a189a98a1980138a52aae8cce86bf95771b8fd",
  "voice/lesson-more-or-less_n03.mp3": "560b990a097557c2de0508a34207b9d241024cad9da8b5fbc5cd606acbd3e9a6",
  "voice/lesson-more-or-less_n04.mp3": "657b0b9670ee6fadbbc0b33a243c6fcf8d05dd3c2b26f69b59ecaeacf6936224",
  "voice/lesson-more-or-less_n05.mp3": "b7587a0f193897483947eddeab2bc4982bc193921bd14eca685eae99f42fef42",
  "voice/lesson-more-or-less_n06.mp3": "8fa96e40155c3c42a8c205bf630d44d7ef0997a228db395d4af570a740671e91",
  "voice/lesson-more-or-less_n07.mp3": "a733b60b0de971e69d26a01303e44c6c180cb328b1bc1b9cfcf8cb6d50eaaf5b",
  "voice/lesson-more-or-less_n08.mp3": "1cad077e060fe3fe04572725537b2ae62db6f2f0c561c010aa6d93d9bf25613a",
  "voice/lesson-more-or-less_n09.mp3": "bcb3989886bde5b7ae636437d0f127d5a8effbdacdebbf62c49b99ad441f8cd6",
  "voice/lesson-more-or-less_n10.mp3": "a03ff4727b89d502a154507f7070518948968a9524eb0348aef9dabe0ba4647b",
  "voice/lesson-more-or-less_n11.mp3": "6962ceb939ee1b2e14df323573aa715aab73b682476d9fdb6481f56689b11461",
  "voice/lesson-more-or-less_n12.mp3": "de803cccee7812e8de779a91aa76b4f28bb5f6f231422fcd2e3f75a40570bd42",
  "voice/lesson-shape-names_n01.mp3": "ca50c1be1429441fc7aaaee81ea1558083df8fd954205af2e6714e049ae7058c",
  "voice/lesson-shape-names_n02.mp3": "25526b2672dea514d311e3d6a6bfdc5337c95af3d6837351b79e70a42399469c",
  "voice/lesson-shape-names_n03.mp3": "f1affb9147a5f81265b9f9cffbd3df16e00888ab06346dcc669744864d148c7d",
  "voice/lesson-shape-names_n04.mp3": "7d4b3fe2bf23a4e3f98b02a3381a42d81aa49d23ce082fdace11fe72774900dc",
  "voice/lesson-shape-names_n05.mp3": "486be777e83ce50cf57708a2363f47c7bf9952ed6f6c43c9428ce08836ab0b80",
  "voice/lesson-shape-names_n06.mp3": "5b9458b79874bbd74c94f1b2ede5c8526c123d9be73a23cfb53cbbf80e3a94e1",
  "voice/lesson-shape-names_n07.mp3": "e11a2316db26a5c9092c7785b1d4245e5c72f82acb43af3eaee34854fedf0264",
  "voice/lesson-shape-names_n08.mp3": "8a94733b803609f223cb60ab99423f77ab865affbc3090b971b4e7684520df7e",
  "voice/lesson-shape-names_n09.mp3": "d3dc63b7d7c4d84e98ccfa9485d4e08dc34e0ec1614c9cb9046feb0dfedc2d52",
  "voice/lesson-shape-names_n10.mp3": "3dfb8419b50600079730a9f6d29849c7ce6525715a05249bcc12f4330155f9af",
  "voice/lesson-shape-names_n11.mp3": "289fdc4ea23db1b2f6dc924b643c9151d176bc659b2c09874cc1508e155edf9e",
  "voice/lesson-shape-names_n12.mp3": "95d1bc9b9b30035d37d44025be495ba8711e069a5ff567065ce9b850fafcac7e"
};
const zipVoiceNames = {
  give_four: 'lesson-give-four', how_many: 'lesson-how-many', more_or_less: 'lesson-more-or-less',
  shape_names: 'lesson-shape-names', copy_abc_pattern: 'lesson-copy-abc-pattern',
};
const assetChecks = [];
for (const a of shapeAssets) assetChecks.push([a, RAW_SHA['images/' + path.basename(a)]]);
for (const s of W4_SNAKES) {
  const zip = zipVoiceNames[s];
  for (let n = 1; n <= 5; n++) {
    assetChecks.push([`assets/voice/moss/lesson_${s}_step_${n}_prompt.mp3`, RAW_SHA[`voice/${zip}_n${String(n).padStart(2,'0')}.mp3`]]);
    assetChecks.push([`assets/voice/moss/lesson_${s}_step_${n}_celebration.mp3`, RAW_SHA[`voice/${zip}_n${String(n + 5).padStart(2,'0')}.mp3`]]);
  }
  assetChecks.push([`assets/voice/moss/lesson_${s}_closing_win.mp3`, RAW_SHA[`voice/${zip}_n11.mp3`]]);
  assetChecks.push([`assets/voice/moss/lesson_${s}_find_prompt.mp3`, RAW_SHA[`voice/${zip}_n12.mp3`]]);
}
let shaOk = true;
let shaDetail = '';
for (const [rel, expected] of assetChecks) {
  const full = P2 + rel;
  if (!expected) { shaOk = false; shaDetail = `no zip sha for ${rel}`; break; }
  if (!exists(full)) { shaOk = false; shaDetail = `missing ${rel}`; break; }
  if (rawSha(full) !== expected) { shaOk = false; shaDetail = `raw sha mismatch ${rel}`; break; }
  if (manifest.file_hashes[rel] !== sha256Hex(fs.readFileSync(path.join(root, full), 'utf8'))) { shaOk = false; shaDetail = `manifest hash mismatch ${rel}`; break; }
}
report('all 64 Wave 4 assets: raw sha256 matches the zip manifests AND manifest.file_hashes matches validator scheme', shaOk, shaDetail);

// ================= 8. sets =================
const cg = sets.find((s) => s.id === 'counting-groups-set');
const newFour = ['ball-4', 'cup-4', 'spoon-4', 'book-4', 'red-flower-4', 'yellow-flower-4'];
report('counting-groups-set extended with the 6 count:4 items', newFour.every((id) => cg.items.find((i) => i.item_id === id)?.count === 4));
report('counting-groups-set original 18 items unchanged in order', JSON.stringify(cg.items.slice(0, 18).map((i) => i.item_id)) === JSON.stringify([
  'ball-1', 'ball-2', 'ball-3', 'cup-1', 'cup-2', 'cup-3', 'spoon-1', 'spoon-2', 'spoon-3', 'book-1', 'book-2', 'book-3', 'red-flower-1', 'red-flower-2', 'red-flower-3', 'yellow-flower-1', 'yellow-flower-2', 'yellow-flower-3',
]));
const sn = sets.find((s) => s.id === 'shape-names-set');
report('shape-names-set holds exactly 7 items (circle, square, triangle, rectangle, ball, book, cup)', JSON.stringify(sn?.items.map((i) => i.item_id)) === JSON.stringify(['circle', 'square', 'triangle', 'rectangle', 'ball', 'book', 'cup']));
report('shape-names-set reuse items copied verbatim (ball/book/cup asset + hash)', ['ball', 'book', 'cup'].every((id) => {
  const a = sn.items.find((i) => i.item_id === id);
  const b = sets.find((s) => s.id === 'everyday-objects-set').items.find((i) => i.item_id === id);
  return a.asset_path === b.asset_path && a.asset_sha256 === b.asset_sha256;
}));

// ================= 9. pre-existing steps unchanged =================
const w4Ids = Object.keys(W4);
// Pre-Wave-4 lessons, pinned explicitly so this snapshot stays wave-relative
// (the pack keeps growing in later waves).
const PRE_W4_LESSON_IDS = ['lesson-point-to','lesson-sort-by-kind','lesson-words-that-sound-the-same','lesson-finish-the-rhyme','lesson-clap-the-beats','lesson-first-sounds','lesson-name-it-together','lesson-see-how-many','lesson-give-one','lesson-give-two','lesson-give-three','lesson-give-just-right','lesson-copy-the-pattern','lesson-sort-by-colour','lesson-what-do-you-see'];
const preLessons = PRE_W4_LESSON_IDS.map((id) => lessonById(id)).filter(Boolean);
const preHash = crypto.createHash('sha256').update(JSON.stringify(preLessons.map((x) => ({ id: x.id, steps: x.steps })))).digest('hex');
report('all pre-existing steps byte-unchanged (73 steps across 15 lessons; snapshot hash)', preHash === '4db6c396c6d409356ae4f09876ba3791f171318064a85190ac463be220d701c0', preHash);
report('pre-existing step count is 73 (this prompt said 63 — discrepancy reported)', preLessons.reduce((n, l) => n + l.steps.length, 0) === 73);

// ================= 10. finale-voice fix =================
const tabletStart = sessionSrc.indexOf('if (isTablet) {');
const phoneStart = sessionSrc.indexOf('\n  return (\n    <SafeAreaView style={styles.safe}', tabletStart);
const tabletRegion = sessionSrc.slice(tabletStart, phoneStart);
const phoneRegion = sessionSrc.slice(phoneStart);
const countMounts = (s) => (s.match(/<FinaleNarrator\b/g) || []).length;
report('tablet layout mounts FinaleNarrator exactly once (duplicate removed)', countMounts(tabletRegion) === 1, `tablet=${countMounts(tabletRegion)}`);
report('phone layout mounts FinaleNarrator exactly once', countMounts(phoneRegion) === 1, `phone=${countMounts(phoneRegion)}`);
const mountOk = (region) =>
  /phase === 'finale' && finaleConfig \?/.test(region) &&
  /text=\{getString\(finaleConfig\.findPromptRef\)\}/.test(region) &&
  /stringKey=\{finaleConfig\.findPromptRef\}/.test(region) &&
  /speakerId=\{character\?\.id \?\? null\}/.test(region);
report('both mounts use the finale-phase condition + identical props', mountOk(tabletRegion) && mountOk(phoneRegion));

// ================= 11. all FINALE_CONFIG findPromptRefs resolve (voice + string) =================
// Each lesson is owned by the pack that defines it; a finale ref resolves under the
// ACTIVE pack when that lesson plays. Pack 2 lessons resolve under Pack 2 (active);
// the 4 Pack 1 lessons resolve under Pack 1 (their own registry + strings).
const pack2LessonIds = new Set(lessons.map((l) => l.id));
const pack1Strings = readJson('packs/sunny-home-garden/strings.json').locales['en-US'];
const pack1VoiceBlock = sliceBetween(loaderSrc, '"sunny-home-garden": {', '"sunny-home-garden-2": {');
const pack1VoiceResolves = (key) => {
  const rel = importPathFor(identFor(pack1VoiceBlock, key));
  return Boolean(rel && exists(rel));
};
const badRefs = [];
let pack2Refs = 0;
let pack1Refs = 0;
for (const e of finaleEntries) {
  if (pack2LessonIds.has(e.id)) {
    pack2Refs += 1;
    if (!(e.ref in strings) || !voiceResolves(e.ref)) badRefs.push(`${e.ref}(pack2)`);
  } else {
    pack1Refs += 1;
    if (!(e.ref in pack1Strings) || !pack1VoiceResolves(e.ref)) badRefs.push(`${e.ref}(pack1)`);
  }
}
report(
  `all ${finaleEntries.length} FINALE_CONFIG findPromptRefs resolve under their owning pack (${pack2Refs} Pack 2 + ${pack1Refs} Pack 1)`,
  finaleEntries.length >= 24 && badRefs.length === 0,
  `count=${finaleEntries.length} pack2=${pack2Refs} pack1=${pack1Refs} bad=${badRefs.join(', ')}`
);

console.log(`\n${failures === 0 ? 'ALL WAVE 4 WIRING CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
