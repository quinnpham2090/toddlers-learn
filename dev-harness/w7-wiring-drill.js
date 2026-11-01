/**
 * Wave 7 wiring drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the Wave 7 wiring (a NEW Pack 3, sunny-home-garden-3) against the REAL
 * Pack 3 records, the REAL validator hash scheme, the REAL raw-byte sha256s from
 * the delivery zip manifests, the REAL lib/path-graph.js nodes, the REAL loader
 * registries, and the REAL git state (Pack 1 / Pack 2 diff empty; pointer = Pack 2).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { sha256Hex } from '../tools/validator.js';
import { PATH_NODE_BY_ID } from '../lib/path-graph.js';

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

const P3 = 'packs/sunny-home-garden-3/';
const lessons = readJson(P3 + 'lessons.json');
const skills = readJson(P3 + 'skills.json');
const sets = readJson(P3 + 'picture_sets.json');
const strings = readJson(P3 + 'strings.json').locales['en-US'];
const manifest = readJson(P3 + 'manifest.json');
const loaderSrc = readText('lib/pack-loader.ts');
const sessionSrc = readText('app/session.tsx');
const lessonById = (id) => lessons.find((l) => l.id === id);
const skillById = (id) => skills.find((s) => s.id === id);

function sliceBetween(src, start, end) {
  const i = src.indexOf(start);
  if (i < 0) return '';
  const j = src.indexOf(end, i);
  return j < 0 ? src.slice(i) : src.slice(i, j);
}
const voiceBlock = sliceBetween(loaderSrc, '"sunny-home-garden-3": {', 'const PACK_ASSET_REGISTRY');
const assetBlock = sliceBetween(sliceBetween(loaderSrc, 'const PACK_ASSET_REGISTRY', 'let cachedOverride'), "'sunny-home-garden-3': {", 'let cachedOverride');
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

// ================= 1. 6 lessons / 30 steps, verbatim, guides =================
const W7 = {
  'lesson-number-symbols-1-3': {
    guide: 'moss', set: 'numeral-tiles-set', primary: 'number-symbols-1-3', fallback: 'lesson-how-many', fbp: 'numeral-tiles-set',
    steps: [
      ['One cup! Tap the number!', 'numeral-1', ['numeral-1', 'numeral-2', 'numeral-3']],
      ['One, two balls! Tap the number!', 'numeral-2', ['numeral-2', 'numeral-1', 'numeral-3']],
      ['One, two, three books! Tap the number!', 'numeral-3', ['numeral-3', 'numeral-1', 'numeral-2']],
      ['One, two spoons! Tap the number!', 'numeral-2', ['numeral-2', 'numeral-3', 'numeral-1']],
      ['One, two, three flowers! Tap the number!', 'numeral-3', ['numeral-3', 'numeral-2', 'numeral-1']],
    ],
  },
  'lesson-number-symbols-1-10': {
    guide: 'moss', set: 'numeral-tiles-set', primary: 'number-symbols-1-10', fallback: 'lesson-number-symbols-1-3', fbp: 'numeral-tiles-set',
    steps: [
      ['One, two, three, four cups! Tap the number!', 'numeral-4', ['numeral-4', 'numeral-3', 'numeral-5']],
      ['One, two, three, four, five, six balls! Tap the number!', 'numeral-6', ['numeral-6', 'numeral-5', 'numeral-7']],
      ['One, two, three, four, five, six, seven, eight books! Tap the number!', 'numeral-8', ['numeral-8', 'numeral-7', 'numeral-9']],
      ['One, two, three, four, five spoons! Tap the number!', 'numeral-5', ['numeral-5', 'numeral-4', 'numeral-6']],
      ['One, two, three, four, five, six, seven, eight, nine, ten flowers! Tap the number!', 'numeral-10', ['numeral-10', 'numeral-8', 'numeral-9']],
    ],
  },
  'lesson-add-take-away': {
    guide: 'moss', set: 'counting-groups-set', primary: 'operations-with-objects', fallback: 'lesson-how-many', fbp: 'counting-groups-set',
    steps: [
      ['Moss has two balls. One more ball rolls in. How many balls now?', 'ball-3', ['ball-3', 'ball-2', 'ball-4']],
      ['Moss has three cups. One cup goes away. How many cups now?', 'cup-2', ['cup-2', 'cup-1', 'cup-3']],
      ['Moss has two books. Two more books arrive. How many books now?', 'book-4', ['book-4', 'book-3', 'book-2']],
      ['Moss has four balls. Two balls roll away. How many balls now?', 'ball-2', ['ball-2', 'ball-3', 'ball-1']],
      ['Moss has three cups. Two more cups arrive. How many cups now?', 'cup-5', ['cup-5', 'cup-4', 'cup-3']],
    ],
  },
  'lesson-onset-rime-blending': {
    guide: 'puff', set: 'blending-words-set', primary: 'onset-rime-blending', fallback: 'lesson-first-sounds', fbp: 'blending-words-set',
    steps: [
      ['Kuh ... at! Put them together!', 'cat', ['cat', 'hat', 'car']],
      ['Duh ... og! Put them together!', 'dog', ['dog', 'frog', 'book']],
      ['Huh ... at! Put them together!', 'hat', ['hat', 'cat', 'ball']],
      ['Muh ... oon! Put them together!', 'moon', ['moon', 'spoon', 'star']],
      ['Buh ... ee! Put them together!', 'bee', ['bee', 'tree', 'ball']],
    ],
  },
  'lesson-final-sounds': {
    guide: 'puff', set: 'letter-tiles-set', primary: 'final-sounds', fallback: 'lesson-onset-rime-blending', fbp: 'letter-tiles-set',
    steps: [
      ["Dog! What sound does 'dog' end with? Tap the letter that makes that sound!", 'letter-g', ['letter-g', 'letter-d', 'letter-b']],
      ["Frog! What sound does 'frog' end with? Tap the letter that makes that sound!", 'letter-g', ['letter-g', 'letter-f', 'letter-c']],
      ["Ball! What sound does 'ball' end with? Tap the letter that makes that sound!", 'letter-l', ['letter-l', 'letter-b', 'letter-s']],
      ["Cup! What sound does 'cup' end with? Tap the letter that makes that sound!", 'letter-p', ['letter-p', 'letter-c', 'letter-h']],
      ["Leaf! What sound does 'leaf' end with? Tap the letter that makes that sound!", 'letter-f', ['letter-f', 'letter-l', 'letter-g']],
    ],
  },
  'lesson-measurement-compare': {
    guide: 'moss', set: 'measurement-set', primary: 'measurement-comparison', fallback: 'lesson-more-or-less', fbp: 'measurement-set',
    steps: [
      ['Which is longer?', 'long-ribbon', ['long-ribbon', 'short-ribbon']],
      ['Which is shorter?', 'short-ribbon', ['short-ribbon', 'long-ribbon']],
      ['Which is heavier?', 'book', ['book', 'green-leaf']],
      ['Which is lighter?', 'green-leaf', ['cup', 'green-leaf']],
      ['Which is longer?', 'spoon', ['spoon', 'cup']],
    ],
  },
};
report('exactly the 6 Wave 7 lessons exist in Pack 3', Object.keys(W7).every((id) => lessonById(id)) && lessons.length === 6);
report('30 Wave 7 steps total', lessons.reduce((n, l) => n + l.steps.length, 0) === 30);
let verbatim = true;
let verbatimDetail = '';
for (const [id, spec] of Object.entries(W7)) {
  const lesson = lessonById(id);
  if (!lesson) { verbatim = false; verbatimDetail = `missing ${id}`; break; }
  if (lesson.character_id !== spec.guide) { verbatim = false; verbatimDetail = `${id} guide`; break; }
  if (lesson.age_band !== '4-5' || lesson.interaction_type !== 'tap_choice') { verbatim = false; verbatimDetail = `${id} band/type`; break; }
  if (lesson.picture_set_id !== spec.set || lesson.primary_skill_id !== spec.primary) { verbatim = false; verbatimDetail = `${id} set/primary`; break; }
  if (JSON.stringify(lesson.secondary_skill_ids) !== JSON.stringify([])) { verbatim = false; verbatimDetail = `${id} secondary`; break; }
  if (lesson.fallback_lesson_id !== spec.fallback || lesson.fallback_picture_id !== spec.fbp) { verbatim = false; verbatimDetail = `${id} fallback`; break; }
  if (lesson.song_template_id !== null || lesson.mission_id !== null || lesson.routine_id !== null) { verbatim = false; verbatimDetail = `${id} optional ids`; break; }
  if (lesson.estimated_minutes !== 5 || lesson.chunk_budget_minutes !== 5) { verbatim = false; verbatimDetail = `${id} minutes`; break; }
  const snake = id.replace('lesson-', '').replace(/-/g, '_');
  for (let i = 0; i < spec.steps.length; i++) {
    const [prompt, target, choices] = spec.steps[i];
    const step = lesson.steps[i];
    if (!step) { verbatim = false; verbatimDetail = `${id} step ${i + 1} missing`; break; }
    if (strings[`lesson.${snake}.step_${i + 1}.prompt`] !== prompt) { verbatim = false; verbatimDetail = `${id} step ${i + 1} prompt`; break; }
    if (step.prompt_ref !== `lesson.${snake}.step_${i + 1}.prompt`) { verbatim = false; verbatimDetail = `${id} step ${i + 1} prompt_ref`; break; }
    if (step.target_item_id !== target) { verbatim = false; verbatimDetail = `${id} step ${i + 1} target`; break; }
    if (JSON.stringify(step.choice_item_ids) !== JSON.stringify(choices)) { verbatim = false; verbatimDetail = `${id} step ${i + 1} choices`; break; }
    if (step.choice_item_ids.filter((c) => c === target).length !== 1) { verbatim = false; verbatimDetail = `${id} step ${i + 1} exactly-one-correct`; break; }
    if (step.evidence_skill_ids !== undefined || step.evidence_participation !== undefined) { verbatim = false; verbatimDetail = `${id} step ${i + 1} evidence fields`; break; }
  }
  if (!verbatim) break;
}
report('every Wave 7 step prompt/target/choices verbatim; exactly one correct; primary-only evidence', verbatim, verbatimDetail);

// ================= 2. fallbacks + chain =================
const p3LessonIds = new Set(lessons.map((l) => l.id));
const p2LessonIds = new Set(readJson('packs/sunny-home-garden-2/lessons.json').map((l) => l.id));
const p1LessonIds = new Set(readJson('packs/sunny-home-garden/lessons.json').map((l) => l.id));
const p3SetIds = new Set(sets.map((s) => s.id));
const p2SetIds = new Set(readJson('packs/sunny-home-garden-2/picture_sets.json').map((s) => s.id));
const p1SetIds = new Set(readJson('packs/sunny-home-garden/picture_sets.json').map((s) => s.id));
const badFallbacks = lessons.filter((l) => !(p3LessonIds.has(l.fallback_lesson_id) || p2LessonIds.has(l.fallback_lesson_id) || p1LessonIds.has(l.fallback_lesson_id)));
const badSets = lessons.filter((l) => !(p3SetIds.has(l.fallback_picture_id) || p2SetIds.has(l.fallback_picture_id) || p1SetIds.has(l.fallback_picture_id)));
report('every fallback lesson + fallback set resolves', badFallbacks.length === 0 && badSets.length === 0, [...badFallbacks.map((l) => l.id), ...badSets.map((l) => l.id)].join(', '));
report('chain: cardinality -> number-symbols-1-3 -> number-symbols-1-10', (skillById('cardinality')?.next_skills ?? []).includes('number-symbols-1-3') && JSON.stringify(skillById('number-symbols-1-3')?.next_skills) === JSON.stringify(['number-symbols-1-10']));
report('operations-with-objects reachable from cardinality (terminal)', (skillById('cardinality')?.next_skills ?? []).includes('operations-with-objects') && JSON.stringify(skillById('operations-with-objects')?.next_skills) === JSON.stringify([]));
report('which-starts-with -> onset-rime-blending -> final-sounds', (skillById('which-starts-with')?.next_skills ?? []).includes('onset-rime-blending') && JSON.stringify(skillById('onset-rime-blending')?.next_skills) === JSON.stringify(['final-sounds']) && JSON.stringify(skillById('final-sounds')?.next_skills) === JSON.stringify([]));
report('more-less -> measurement-comparison (terminal)', (skillById('more-less')?.next_skills ?? []).includes('measurement-comparison') && JSON.stringify(skillById('measurement-comparison')?.next_skills) === JSON.stringify([]));
report('6 new skills: domain + min_age band 4-5', [['number-symbols-1-3','maths'],['number-symbols-1-10','maths'],['operations-with-objects','maths'],['onset-rime-blending','language'],['final-sounds','language'],['measurement-comparison','maths']].every(([id, d]) => skillById(id)?.domain === d && skillById(id)?.age_band === '4-5' && skillById(id)?.is_entry_skill === false));

// ================= 3. path nodes =================
const NODES = [
  ['number-symbols-1-3', 'maths', 4, ['number-symbols-1-10']],
  ['number-symbols-1-10', 'maths', 5, []],
  ['operations-with-objects', 'maths', 5, []],
  ['onset-rime-blending', 'language', 5, ['final-sounds']],
  ['final-sounds', 'language', 5, []],
  ['measurement-comparison', 'maths', 5, []],
];
report('6 new path nodes with domain/min_age/provisional/next', NODES.every(([id, d, m, n]) => { const x = PATH_NODE_BY_ID.get(id); return x && x.domain === d && x.min_age === m && x.provisional === false && x.entry === false && JSON.stringify(x.next) === JSON.stringify(n); }));
report('all 6 nodes attached (lesson_skill_ids + playable_lesson_skill_id)', NODES.every(([id]) => { const x = PATH_NODE_BY_ID.get(id); return JSON.stringify(x?.lesson_skill_ids) === JSON.stringify([id]) && x?.playable_lesson_skill_id === id; }));
report('node titles resolve in Pack 3 (adventure.skill.<snake>.title)', NODES.every(([id]) => typeof strings[`adventure.skill.${id.replace(/-/g, '_')}.title`] === 'string'));
report('no existing node next array rewritten (which-starts-with still points at initial-sound-matching)', JSON.stringify(PATH_NODE_BY_ID.get('which-starts-with')?.next) === JSON.stringify(['initial-sound-matching']));

// ================= 4. sets =================
const setIds = (id) => sets.find((s) => s.id === id)?.items.map((i) => i.item_id);
report('numeral-tiles-set holds 10 items', JSON.stringify(setIds('numeral-tiles-set')) === JSON.stringify(Array.from({ length: 10 }, (_, i) => `numeral-${i + 1}`)));
report('blending-words-set holds 12 items', (setIds('blending-words-set') ?? []).length === 12);
report('measurement-set holds 6 items', JSON.stringify(setIds('measurement-set')) === JSON.stringify(['long-ribbon', 'short-ribbon', 'spoon', 'cup', 'book', 'green-leaf']));
report('letter-tiles-set holds 10 items', (setIds('letter-tiles-set') ?? []).length === 10);
const cg3 = sets.find((s) => s.id === 'counting-groups-set');
const cg2 = readJson('packs/sunny-home-garden-2/picture_sets.json').find((s) => s.id === 'counting-groups-set');
report('counting-groups-set = Pack 2 copy + 1 (cup-5)', cg3?.items.length === cg2.items.length + 1 && cg3.items.some((i) => i.item_id === 'cup-5' && i.count === 5));
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const lowerPaths = sets.flatMap((s) => s.items).every((i) => slugRe.test(i.item_id) && /^assets\/[a-z0-9/_-]+\.(jpg|jpeg|png|webp|svg)$/.test(i.asset_path));
report('all Pack 3 item ids + asset paths lowercase', lowerPaths);

// ================= 5. 72 voice + 40 images resolve; sha256 matches zip + manifest =================
const SNAKES = ['number_symbols_1_3', 'number_symbols_1_10', 'add_take_away', 'onset_rime_blending', 'final_sounds', 'measurement_compare'];
const voiceRefs = [];
for (const s of SNAKES) {
  for (let n = 1; n <= 5; n++) { voiceRefs.push(`lesson.${s}.step_${n}.prompt`); voiceRefs.push(`lesson.${s}.step_${n}.celebration`); }
  voiceRefs.push(`lesson.${s}.closing_win`, `lesson.${s}.find_prompt`);
}
const unresolvedVoice = voiceRefs.filter((r) => !voiceResolves(r));
report('all 72 Wave 7 voice refs resolve through the Pack 3 loader registry', unresolvedVoice.length === 0, unresolvedVoice.join(', '));
const imgAssets = fs.readdirSync(P3 + 'assets').filter((f) => f.endsWith('.jpg')).map((f) => 'assets/' + f);
report('all 40 Pack 3 images resolve through the Pack 3 asset registry', imgAssets.length === 40 && imgAssets.every((a) => assetResolves(a)));

const RAW_SHA = {
  "images/ball.jpg": "4eb57a67514de3c0d2239c7ac616cf048c18ad329ee10e5f455449d85d9104e5",
  "images/bee.jpg": "08101e7bf292846e0b183a196b109135814402c4489712002849d3f88e50a912",
  "images/book.jpg": "da8eef0129057f0170014905377c367785b09e966142fd013b5d657a1d64ceb6",
  "images/car.jpg": "9e58839641399f1869efe4b41fb309daa15d822fc5915d512a3a2b878982cc7d",
  "images/cat.jpg": "78d6685f8a2b0a14da2780e101b347097397fb088742fea3832ab95871774d46",
  "images/cup.jpg": "811dcba65e45837cba255e4427dc217504ffecb03d7e72b938af155015f51156",
  "images/dog.jpg": "4b3bc14945891022d50bf7c8ef39f516a3f2ce79b3b8ea9089f92e02e8d06087",
  "images/frog.jpg": "8c191e6abe0165edbd82a32853b7dc4f258ded7faab326ea14235b51725c8058",
  "images/green-leaf.jpg": "9124245f3bd494953d081d3bf10e774282c4f826d1acee869cb946eb4af1886d",
  "images/hat.jpg": "a84c371d20ed4bcd472373d1a6fd9c558a6353b18db905edd187f418dfcb42ec",
  "images/letter-B.jpg": "65b6c5bc47a1f4632e5c5a7dd504258b6a51df4f29df7387c25414a4c07f39ae",
  "images/letter-C.jpg": "ff3531c84879b15e5acdf01f17efa95bc69415cf28169cd603ad9e6173bf793b",
  "images/letter-D.jpg": "911ce216eb7c2048c9eab22fdb14d2054d16698b6e4ed19b9840e895fa710723",
  "images/letter-F.jpg": "04732ffc8148085a0f275305f9c5703b6a7f71ef922e121c98b383442c6ee57e",
  "images/letter-G.jpg": "1935c2753a291ae0fc7de90a3af6ccd7cbef2e64d57adea895f65681034decb6",
  "images/letter-H.jpg": "d2338896b7e0a95510584701cc779d97f04254334a34e259945d799afe444c44",
  "images/letter-L.jpg": "71e6cfee3657d94fdfd83f8d0fa3932ec32079f79a722a07879c8e1eaad23054",
  "images/letter-P.jpg": "19c42c4343ec9c94f71c3352aa683d6a674587f68867e077a4ab842985156bb4",
  "images/letter-S.jpg": "5f47750c00a8fe7f3b5c3d0144488b5aa911224524fa6918778634795867beae",
  "images/letter-W.jpg": "bcb6add9c6bb90670bc7b8a36dc819ca14f39ffa33ee2e1843c54ed7a5dc6be9",
  "images/long-ribbon.jpg": "575d40ec5f7bac3945d13646a851a5d0f0d34c4c975d1ad66b781fba30b145ad",
  "images/moon.jpg": "c0defea7f762e3c353d81d132cd3fef498cede96ab1905da9befd99232090d33",
  "images/numeral-1.jpg": "48b2c947c53efba016a8085eb87ee4e35955ade7cdd7d6ab534fb56e01dbac77",
  "images/numeral-10.jpg": "834f337c92ff2eca8a07a06aeba1b644658334735ac3aab6025fa9f36df09a2b",
  "images/numeral-2.jpg": "395738e41508d96800dd901ef4b12d0aaa8b5dbd2ae52e352de3ba338dcef64e",
  "images/numeral-3.jpg": "4812a75e65c7bbad4df7c31bc46e3caa3a6fb0d4bff6fda58db71e1108f580a0",
  "images/numeral-4.jpg": "79042b4a5bbc56b4dca53c7a8bb8d6d8e34b8e08b4788ae6b522b89f28e56abc",
  "images/numeral-5.jpg": "6aa1af71db1ad728bccf554b719a0b1789899a6003a83c15337552392082278e",
  "images/numeral-6.jpg": "f7ce970ff2d05dba2617534c84bd481f4ce2a4c7ca9f566261fbfa8f3c212380",
  "images/numeral-7.jpg": "09077fc158f049dca5a78708c00e80c1a6c6904781d79db45f25574ae167124c",
  "images/numeral-8.jpg": "c2f60120ae24eb4ed38092987f629ba74fbc72e74000179346f7a6af07436b9f",
  "images/numeral-9.jpg": "5637dfc23e03b9ef92206ce92f50e743108d643f92822d841d8574df09e46059",
  "images/short-ribbon.jpg": "f5f5bd98207dba9ce1408446657de0db021272f3f493e28c21f671b63d038b68",
  "images/spoon.jpg": "26d16225d87d0d64942871a47584134cc75a02cd04cb161c21106e52048472c8",
  "images/star.jpg": "ae14e8532f8a21115d94af0a70e6697c52366e0819f5de5e6689f5f136f4f710",
  "images/tree.jpg": "ca1798fbcaed196593e04d638ee2da4ee232be5b6a73803b8c3afc46be42a243",
  "voice/lesson-add-take-away_n01.mp3": "a151cdb2c650f44612a5a5293c56800657493b163d001cbca844473fec9c6543",
  "voice/lesson-add-take-away_n02.mp3": "741347a55ca7dfb55e01d75b76edbfd05b362905bb431b12e452c213197c0b15",
  "voice/lesson-add-take-away_n03.mp3": "8b8a415bcaa4775a74fc97d05b04d9e47e1344b36dfd6a799fe89047976db96f",
  "voice/lesson-add-take-away_n04.mp3": "9418c736f81217bba1f3b8da60a799139e76734f6a93989afc58ee93914606cf",
  "voice/lesson-add-take-away_n05.mp3": "a9c8407fc204366e685cc4edbd4160b7a9041ee1878e1e5cba56bc797b484d9b",
  "voice/lesson-add-take-away_n06.mp3": "831c61c6fb8948ccab7dfb30cbba692a52277ca10391d50450edbc3d7949bc01",
  "voice/lesson-add-take-away_n07.mp3": "948c0f1e70919d47e0355d9bef0ab3132636c0ccc9b83e5a71d9c69c8b49d695",
  "voice/lesson-add-take-away_n08.mp3": "ef36cbe7f785fa7ae17a555738d9ea8245e1dee3095562811f75fd743d71fc74",
  "voice/lesson-add-take-away_n09.mp3": "eec921b577adf0ccba89ccbcf36503b0cf2250a89375a80f5684c26b9c866a0d",
  "voice/lesson-add-take-away_n10.mp3": "e83814b4dd47b48dc71b4ca6531a168359fb67540d265cb64a8add99605f71a8",
  "voice/lesson-add-take-away_n11.mp3": "60a2fc07ef82e9cb804478c07332f8606873645d55d1f99978657cceba82d108",
  "voice/lesson-add-take-away_n12.mp3": "6905bbf4b7c3ea5a24211c21600c8675c837d4875cb8c0faa966b597f9355df1",
  "voice/lesson-final-sounds_n01.mp3": "92f7cd7010543ec75de2d035adb96f4c2c5f3428bb9a777d0d32847a7decc30d",
  "voice/lesson-final-sounds_n02.mp3": "e0c482fddb7ca070e35972f0b2214f187fb807cbc4e295ad35d5ad7f868292be",
  "voice/lesson-final-sounds_n03.mp3": "3e7d88d1d497d5fe02d9a9403cd35ecd53506a9758feb01030678de2b88d19a3",
  "voice/lesson-final-sounds_n04.mp3": "cdfd3b817c86f9728bc965e678c5816c4aff35884577af3977a8319082e27209",
  "voice/lesson-final-sounds_n05.mp3": "f1997847b63a542c085c02e6523a6dd29cff185062a95b117a21fbcd8bd33576",
  "voice/lesson-final-sounds_n06.mp3": "61dfc94a98245805fb291ccf811ef6762f7ba579742b1105481c1ef117d7c36e",
  "voice/lesson-final-sounds_n07.mp3": "8e37081c37bd6be8c0f5cc83a5fa29d747ddaff66e0151425c2bd1aee3a7905d",
  "voice/lesson-final-sounds_n08.mp3": "606a4061b62db94372bb29d9e33d3800f6dcafc3abe483b588b88cda262c301f",
  "voice/lesson-final-sounds_n09.mp3": "8dccebe8a3947cd06ecda760a8c3618b3e7c30ff80d63ae86128bf1d516cde05",
  "voice/lesson-final-sounds_n10.mp3": "defe933e88464bd5036956fc209bf840a3f2eb5fc8a56854486e8e2d18dbb027",
  "voice/lesson-final-sounds_n11.mp3": "1dc070d4342a459323fba5dc2304dc98422bc58e6b020f5083babec898fd5295",
  "voice/lesson-final-sounds_n12.mp3": "58ac866ca79e0c1bdb4ce2387d65803db8df40079d58d626b7d1c37310c7b901",
  "voice/lesson-measurement-compare_n01.mp3": "15032bef21dc6a2d702574e412d73378c3832320294f374c94da0beb02335c13",
  "voice/lesson-measurement-compare_n02.mp3": "17b994ac0091f7b7caa9ec92a38f546df65ed3277acd2f8eca40de1993a7d8ee",
  "voice/lesson-measurement-compare_n03.mp3": "6b9274f3b19de0f23b7c26d34ff7693254b077dbbd3c1c0f38d6cfddd5450f63",
  "voice/lesson-measurement-compare_n04.mp3": "15efda7ed3e67e2f9b95624b5260aad14dee4e5fd912f5d274cb81176e038ceb",
  "voice/lesson-measurement-compare_n05.mp3": "44202b132d10305677d79a8f9047fd773afeb5b7e77b8d3dfe40b9ec0e473c2c",
  "voice/lesson-measurement-compare_n06.mp3": "965563f53eaf7dd6e1f7179b8e3bb70c47843404a3ba10363e0b1a432d574454",
  "voice/lesson-measurement-compare_n07.mp3": "906563baa310a7e14cc1af7bf33edf987726b6775c34d2121a34753618f5c175",
  "voice/lesson-measurement-compare_n08.mp3": "2fceba674d7c2578eb121fa0d0cca99f8e6eed0d0b6b107d70ce31dfb61259d2",
  "voice/lesson-measurement-compare_n09.mp3": "fd3f20607a649f12377079e00fbaad4b1cf7fc4295e69c16c9d4f017496458a3",
  "voice/lesson-measurement-compare_n10.mp3": "0ffb019803ba4743ef0ab4dbab8290bac717cdf319dd71225f6a670cf902d396",
  "voice/lesson-measurement-compare_n11.mp3": "4b55122949e2e3d5815ac352e8a43a6052c5446f86ce0ed2a4dd62e1a4ddaff5",
  "voice/lesson-measurement-compare_n12.mp3": "f10ba4b776b4049fc135d5a8e021a085ecfde64ac0abcb03bd277977e7d016ad",
  "voice/lesson-number-symbols-1-10_n01.mp3": "cc817702fd5ddce0cdf971ff1a1b0c850f990864d16f5d143d1deddfd81adeaf",
  "voice/lesson-number-symbols-1-10_n02.mp3": "a4ee1ae92620ab7a76d6985a3f069ab7a03eef8231a9e525d93857c7c0a66549",
  "voice/lesson-number-symbols-1-10_n03.mp3": "cee51d6aecc469397ee4efcc13550d2bcd8d2621575cb4812e4223d3aa269e5d",
  "voice/lesson-number-symbols-1-10_n04.mp3": "75bc824f8e7898f012a4407d19e2a1f060a2514b3e0d2adb5ed5d147a3c5c895",
  "voice/lesson-number-symbols-1-10_n05.mp3": "dc2aca05c3f642a237905c54c2f22996894ab795bff87fca40d29db0744ee495",
  "voice/lesson-number-symbols-1-10_n06.mp3": "a01365b8dd5274b53541de1b143c84adeaf895be39ffb5284ffa8c2947c04a2f",
  "voice/lesson-number-symbols-1-10_n07.mp3": "42b3c88a70957e6b9dbd157f9832832aba5d002010205517afc5aed00af83e15",
  "voice/lesson-number-symbols-1-10_n08.mp3": "2797e00f90de65092676d414a0f03efa43ebc8c0ececb93707754cb7e933099f",
  "voice/lesson-number-symbols-1-10_n09.mp3": "7744786053d6f102a46e49f4e58cdd5af7c400d06ef0701694d07650b4d5a9dd",
  "voice/lesson-number-symbols-1-10_n10.mp3": "76f37abddcd70f9bd87e3ab6cc5f789281e16d7eb8d5cbc07619db6212db9420",
  "voice/lesson-number-symbols-1-10_n11.mp3": "4bb470bb055b5cf225bfaf118e1dca126ad0203bb4e95208adcaf595fbc39e17",
  "voice/lesson-number-symbols-1-10_n12.mp3": "2e8369fc7683122d47c13996c19aaa7532dde3049a0bed556b7788e2fac01a3c",
  "voice/lesson-number-symbols-1-3_n01.mp3": "ce85cac267bc48cffc5b1538e93127129f2ae3b43b8ab199fa040b7d1b9a3410",
  "voice/lesson-number-symbols-1-3_n02.mp3": "93a19c189438ed6a9bd6599b87f9c7aa76d19d0461e13ab2530e8c756374ec3c",
  "voice/lesson-number-symbols-1-3_n03.mp3": "752638b12b8939c83023aef9b9bd35369c1a742735b7173a730becf6cb027b9e",
  "voice/lesson-number-symbols-1-3_n04.mp3": "38c91963127e3069a1b3ade3f5a543309eec34b7677500112dd4981a94363e75",
  "voice/lesson-number-symbols-1-3_n05.mp3": "0929efd11ffe9878c3ec70ca999009467ae0ee57725d249f91d252f675ee84b6",
  "voice/lesson-number-symbols-1-3_n06.mp3": "a937446ae3de7a6569bc6dd7cc5801553a93cfdf28c2b777b9a5e8203cdecb94",
  "voice/lesson-number-symbols-1-3_n07.mp3": "c136f6db94003642bcaee49cf4e41464809f15e827183a4f70f0b0b8f63e725f",
  "voice/lesson-number-symbols-1-3_n08.mp3": "d59a7addab202011dd5f924037ff23dd8882cd90a1393f43f3c77c722a878610",
  "voice/lesson-number-symbols-1-3_n09.mp3": "b3dc9cc32a7e9733e2d48a16ed1ac2615ff2262a2467a4bea2f1b891a13e8308",
  "voice/lesson-number-symbols-1-3_n10.mp3": "feb25dd0686cfda6b16e52db10fdf49d275846c8bcbadba19245de806ff184ff",
  "voice/lesson-number-symbols-1-3_n11.mp3": "70d60a1dc3aa88fc09e65f427504bb2f415b0c712611154ba8bcbdaea90ebd58",
  "voice/lesson-number-symbols-1-3_n12.mp3": "fb9543c19e6464224c72fc8f8b922362c086a6963d1f53ac8ad72b5408e64874",
  "voice/lesson-onset-rime-blending_n01.mp3": "f8d2c0b33d54478b0efe84041865c8892278435890848e3f1b2cd68b53665046",
  "voice/lesson-onset-rime-blending_n02.mp3": "ac54fc47761d2045fb83659b73acb8416c71ed95435df6f65dba1229f08f2ef4",
  "voice/lesson-onset-rime-blending_n03.mp3": "166af1e9810c0ad078244c8babcbd65fa70927ab3983ef32ce3cf70d8751f9f6",
  "voice/lesson-onset-rime-blending_n04.mp3": "a889c234851a9b47aa8988e3672d5380440e7aba2c35332a9032c4c96f6fa4de",
  "voice/lesson-onset-rime-blending_n05.mp3": "bf987a9432a5bc13edd65743624431572c2de1f17d470a74b0c060baa2f83d9d",
  "voice/lesson-onset-rime-blending_n06.mp3": "bcbce8770b73f73b5ac27911c51a12de3f88d1af6b5960e82142d7d313087303",
  "voice/lesson-onset-rime-blending_n07.mp3": "a3adbfa5a44de611abeb9093e66a312400cea8df5dc96bc63d2822d05c43d25e",
  "voice/lesson-onset-rime-blending_n08.mp3": "ac27cdcddc19f8e56c5b99f35c71e809d616418845bae071c08ad695c9f0a4d6",
  "voice/lesson-onset-rime-blending_n09.mp3": "4cdb00312aca5f61ced7d2ef46890899665029e9e1c4f7600b364978c756a6f5",
  "voice/lesson-onset-rime-blending_n10.mp3": "7cd566f1888662c649f15eab0b8ea319f283ca0ea7164498a62df3b61ebbeb0c",
  "voice/lesson-onset-rime-blending_n11.mp3": "5d45d7ca8fc093cd840aec3b29febf48d10b029bd70556902baebaf035abd0aa",
  "voice/lesson-onset-rime-blending_n12.mp3": "cf37825d4cf59308fe0551eeea57909134bab2d18036ee405167c9be1181e228"
};
const zipSnake = { number_symbols_1_3: 'lesson-number-symbols-1-3', number_symbols_1_10: 'lesson-number-symbols-1-10', add_take_away: 'lesson-add-take-away', onset_rime_blending: 'lesson-onset-rime-blending', final_sounds: 'lesson-final-sounds', measurement_compare: 'lesson-measurement-compare' };
const guide = { number_symbols_1_3: 'moss', number_symbols_1_10: 'moss', add_take_away: 'moss', onset_rime_blending: 'puff', final_sounds: 'puff', measurement_compare: 'moss' };
const checks = [];
for (const a of imgAssets) {
  const zipName = a.split('/')[1].replace('.jpg', '');
  const zipKey = fs.readdirSync('/tmp/wave7/images').includes(`${zipName}.jpg`) ? `images/${zipName}.jpg` : (zipName.match(/^letter-([a-z])$/) ? `images/letter-${zipName.slice(-1).toUpperCase()}.jpg` : null);
  if (zipKey) checks.push([P3 + a, RAW_SHA[zipKey]]);
}
for (const s of SNAKES) {
  const z = zipSnake[s], g = guide[s];
  for (let n = 1; n <= 5; n++) {
    checks.push([`${P3}assets/voice/${g}/lesson_${s}_step_${n}_prompt.mp3`, RAW_SHA[`voice/${z}_n${String(n).padStart(2, '0')}.mp3`]]);
    checks.push([`${P3}assets/voice/${g}/lesson_${s}_step_${n}_celebration.mp3`, RAW_SHA[`voice/${z}_n${String(n + 5).padStart(2, '0')}.mp3`]]);
  }
  checks.push([`${P3}assets/voice/${g}/lesson_${s}_closing_win.mp3`, RAW_SHA[`voice/${z}_n11.mp3`]]);
  checks.push([`${P3}assets/voice/${g}/lesson_${s}_find_prompt.mp3`, RAW_SHA[`voice/${z}_n12.mp3`]]);
}
let shaOk = true;
let shaDetail = '';
for (const [full, expected] of checks) {
  if (!expected) { shaOk = false; shaDetail = `no zip sha for ${full}`; break; }
  if (!exists(full)) { shaOk = false; shaDetail = `missing ${full}`; break; }
  if (rawSha(full) !== expected) { shaOk = false; shaDetail = `raw sha mismatch ${full}`; break; }
  const rel = full.replace(P3, '');
  if (manifest.file_hashes[rel] !== sha256Hex(fs.readFileSync(path.join(root, full), 'utf8'))) { shaOk = false; shaDetail = `manifest hash mismatch ${rel}`; break; }
}
report('every zip-provided asset: raw sha256 matches the zip manifest AND manifest.file_hashes matches validator scheme', shaOk, shaDetail);
// the 4 extra Pack 2 copies are byte-identical
report('red-flower / yellow-flower / portraits are byte-identical to Pack 2', ['red-flower.jpg', 'yellow-flower.jpg', 'puff-portrait.jpg', 'moss-portrait.jpg'].every((f) => fs.readFileSync(path.join(root, P3 + 'assets/' + f)).equals(fs.readFileSync(path.join(root, 'packs/sunny-home-garden-2/assets/' + f)))));
// W7-L6 n01/n05 are distinct recordings (both placed)
report('W7-L6 n01/n05 are distinct recordings (base stays 72)', rawSha(P3 + 'assets/voice/moss/lesson_measurement_compare_step_1_prompt.mp3') !== rawSha(P3 + 'assets/voice/moss/lesson_measurement_compare_step_5_prompt.mp3'));

// ================= 6. FINALE_CONFIG =================
const FINALE = {
  'lesson-number-symbols-1-3': { target: 'numeral-3', tiles: ['numeral-3', 'numeral-2', 'numeral-1'] },
  'lesson-number-symbols-1-10': { target: 'numeral-10', tiles: ['numeral-10', 'numeral-8', 'numeral-9'] },
  'lesson-add-take-away': { target: 'cup-5', tiles: ['cup-5', 'cup-4', 'cup-3'] },
  'lesson-onset-rime-blending': { target: 'bee', tiles: ['bee', 'tree', 'ball'] },
  'lesson-final-sounds': { target: 'letter-f', tiles: ['letter-f', 'letter-l', 'letter-g'] },
  'lesson-measurement-compare': { target: 'spoon', tiles: ['spoon', 'cup'] },
};
const finaleEntries = [...sessionSrc.matchAll(/'([^']+)':\s*\{\s*targetItemId:\s*'([^']+)',\s*tileItemIds:\s*\[([^\]]*)\],\s*findPromptRef:\s*'([^']+)',\s*\}/g)].map((m) => ({ id: m[1], target: m[2], tiles: m[3].split(',').map((t) => t.trim().replace(/'/g, '')).filter(Boolean), ref: m[4] }));
const finaleById = new Map(finaleEntries.map((e) => [e.id, e]));
let finaleOk = true;
let finaleDetail = '';
for (const [id, spec] of Object.entries(FINALE)) {
  const entry = finaleById.get(id);
  const lesson = lessonById(id);
  if (!entry) { finaleOk = false; finaleDetail = `${id} no entry`; break; }
  if (entry.target !== spec.target || JSON.stringify(entry.tiles) !== JSON.stringify(spec.tiles)) { finaleOk = false; finaleDetail = `${id} target/tiles`; break; }
  if (lesson.steps[4].target_item_id !== entry.target) { finaleOk = false; finaleDetail = `${id} target != step5`; break; }
  if (!entry.tiles.every((t) => lesson.steps.some((s) => s.target_item_id === t || s.choice_item_ids.includes(t)))) { finaleOk = false; finaleDetail = `${id} tile not in steps`; break; }
}
report('every Wave 7 finale target == step-5 target; every tile appears in its lesson steps', finaleOk, finaleDetail);

// all FINALE_CONFIG refs resolve under their owning pack
const pack2LessonIds = new Set(readJson('packs/sunny-home-garden-2/lessons.json').map((l) => l.id));
const pack2Strings = readJson('packs/sunny-home-garden-2/strings.json').locales['en-US'];
const pack1Strings = readJson('packs/sunny-home-garden/strings.json').locales['en-US'];
const pack2VoiceBlock = sliceBetween(loaderSrc, '"sunny-home-garden-2": {', '"sunny-home-garden-3": {');
const pack1VoiceBlock = sliceBetween(loaderSrc, '"sunny-home-garden": {', '"sunny-home-garden-2": {');
const resolvesIn = (block, key) => { const rel = importPathFor(identFor(block, key)); return Boolean(rel && exists(rel)); };
const badRefs = [];
for (const e of finaleEntries) {
  if (p3LessonIds.has(e.id)) { if (!(e.ref in strings) || !voiceResolves(e.ref)) badRefs.push(`${e.ref}(p3)`); }
  else if (pack2LessonIds.has(e.id)) { if (!(e.ref in pack2Strings) || !resolvesIn(pack2VoiceBlock, e.ref)) badRefs.push(`${e.ref}(p2)`); }
  else if (!(e.ref in pack1Strings) || !resolvesIn(pack1VoiceBlock, e.ref)) badRefs.push(`${e.ref}(p1)`);
}
report(`all ${finaleEntries.length} FINALE_CONFIG findPromptRefs resolve under their owning pack (39 = 33 prior + 6 new)`, finaleEntries.length === 39 && badRefs.length === 0, `count=${finaleEntries.length} bad=${badRefs.join(', ')}`);

// ================= 7. FinaleNarrator mounts + git scope =================
const tabletStart = sessionSrc.indexOf('if (isTablet) {');
const phoneStart = sessionSrc.indexOf('\n  return (\n    <SafeAreaView style={styles.safe}', tabletStart);
const countMounts = (s) => (s.match(/<FinaleNarrator\b/g) || []).length;
report('FinaleNarrator mounts unchanged (tablet = 1, phone = 1)', countMounts(sessionSrc.slice(tabletStart, phoneStart)) === 1 && countMounts(sessionSrc.slice(phoneStart)) === 1);
const gitNames = (p) => execSync(`git diff --name-only -- ${p}`, { cwd: root }).toString().trim();
report('Pack 1 diff EMPTY', gitNames('packs/sunny-home-garden/') === '');
report('Pack 2 diff EMPTY', gitNames('packs/sunny-home-garden-2/') === '');
report('packs/active.json untouched (sunny-home-garden-2)', readJson('packs/active.json').active_pack_id === 'sunny-home-garden-2' && gitNames('packs/active.json') === '');

// ================= 8. pre-existing Pack 2 steps unchanged =================
const p2lessons = readJson('packs/sunny-home-garden-2/lessons.json');
const p2Hash = crypto.createHash('sha256').update(JSON.stringify(p2lessons.map((x) => ({ id: x.id, steps: x.steps })))).digest('hex');
report('Pack 2 pre-existing steps byte-unchanged (143 at HEAD c55208b)', p2lessons.reduce((n, l) => n + l.steps.length, 0) === 143 && p2Hash === 'e8a72b1e87d883ae552a639a7c6bf72c580408e1d840feecb87d487baec6bfbc', p2Hash);

// ================= 9. pack_sha256 derived + copy discipline =================
const derived = sha256Hex(Object.entries(manifest.file_hashes).map(([p, h]) => `${p}:${h}`).join('\n'));
report('Pack 3 pack_sha256 = derive(file_hashes) (Pack 2 creation algorithm)', manifest.pack_sha256 === derived, manifest.pack_sha256);
report('Pack 3 pack_sha256 is NOT Pack 2\'s value', manifest.pack_sha256 !== readJson('packs/sunny-home-garden-2/manifest.json').pack_sha256);
report('no child name / "wrong" in Pack 3 child-facing copy', !/wrong/i.test(JSON.stringify(strings)) && !JSON.stringify(strings).match(/\b(Ben|Mia|Sam|Tom|Ava|Leo)\b/));

console.log(`\n${failures === 0 ? 'ALL WAVE 7 WIRING CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
