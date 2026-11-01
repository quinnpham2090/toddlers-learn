/**
 * Wave 6 wiring drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the Wave 6 wiring against the REAL live Pack 2 records, the REAL
 * validator hash scheme, the REAL raw-byte sha256s from the delivery zip
 * manifests, the REAL lib/path-graph.js science nodes, and the REAL source
 * files the runtime reads (lib/pack-loader.ts registries, app/session.tsx
 * FINALE_CONFIG + FinaleNarrator mounts).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

// ================= 1. 3 lessons, 15 steps, verbatim =================
const W6 = {
  'lesson-sort-by-property': {
    it: 'sort_group', band: '3-4', set: 'texture-sort-set', primary: 'sort-by-property', fallback: 'lesson-what-do-you-see', fbp: 'what-do-you-see-set',
    steps: [
      ['Find the rough basket!', 'rough-basket', ['rough-basket', 'smooth-basket']],
      ['Find something rough!', 'rough-bark', ['rough-bark', 'green-leaf', 'ball']],
      ['Find something smooth!', 'green-leaf', ['green-leaf', 'rough-bark', 'crinkly-leaf']],
      ['Find something rough!', 'crinkly-leaf', ['crinkly-leaf', 'ball', 'green-leaf']],
      ['Find the smooth basket!', 'smooth-basket', ['smooth-basket', 'rough-basket']],
    ],
  },
  'lesson-what-will-happen-if': {
    it: 'tap_choice', band: '4-5', set: 'predict-set', primary: 'what-will-happen-if', fallback: 'lesson-sort-by-property', fbp: 'texture-sort-set',
    steps: [
      ['Puff pushes the ball. What will roll?', 'ball', ['ball', 'book']],
      ['Puff waters the plant. What will get wet?', 'outdoor-plant', ['outdoor-plant', 'ball']],
      ['Puff pours water in the cup. What will hold the water?', 'cup', ['cup', 'book']],
      ['Puff drops the spoon on a stone. What will go clink?', 'spoon', ['spoon', 'ball']],
      ['Puff drops the leaf. What will float down slowly?', 'green-leaf', ['green-leaf', 'book']],
    ],
  },
  'lesson-why-did-that-happen': {
    it: 'tap_choice', band: '4-5', set: 'explain-set', primary: 'explain-why', fallback: 'lesson-what-will-happen-if', fbp: 'predict-set',
    steps: [
      ['Puff pushed the ball and it rolled! Why did it roll? Tap what tells you why!', 'ball', ['ball', 'book', 'cup']],
      ['Puff watered the plant and the soil got wet! Why is it wet? Tap what tells you why!', 'watering-can', ['watering-can', 'ball', 'book']],
      ['Puff left the ball in the sun and it got warm! Why is it warm? Tap what tells you why!', 'sun', ['sun', 'ball', 'book']],
      ['Puff pushed the cup and it did NOT roll! Why not? Tap what tells you why!', 'cup', ['cup', 'ball', 'book']],
      ['Puff poured water in the cup and the cup held it! Why did it hold the water? Tap what tells you why!', 'cup', ['cup', 'ball', 'book']],
    ],
  },
};
report('exactly the 3 Wave 6 lessons exist', Object.keys(W6).every((id) => lessonById(id)) && lessons.filter((l) => W6[l.id]).length === 3);
report('15 Wave 6 steps total', Object.keys(W6).reduce((n, id) => n + (lessonById(id)?.steps.length ?? 0), 0) === 15);

let verbatim = true;
let verbatimDetail = '';
for (const [id, spec] of Object.entries(W6)) {
  const lesson = lessonById(id);
  if (!lesson) { verbatim = false; verbatimDetail = `missing ${id}`; break; }
  if (lesson.character_id !== 'puff') { verbatim = false; verbatimDetail = `${id} character`; break; }
  if (lesson.age_band !== spec.band || lesson.interaction_type !== spec.it) { verbatim = false; verbatimDetail = `${id} band/type`; break; }
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
    if (step.celebration_ref !== `lesson.${snake}.step_${i + 1}.celebration`) { verbatim = false; verbatimDetail = `${id} step ${i + 1} celebration_ref`; break; }
  }
  if (!verbatim) break;
}
report('every Wave 6 step prompt/target/choices match this prompt verbatim (exactly one correct)', verbatim, verbatimDetail);

// ================= 2. per-step evidence defaults + no participation =================
let evidenceOk = true;
let evidenceDetail = '';
for (const [id, spec] of Object.entries(W6)) {
  const lesson = lessonById(id);
  for (const step of lesson.steps) {
    if (step.evidence_participation !== undefined) { evidenceOk = false; evidenceDetail = `${id} participation`; break; }
    if (step.evidence_skill_ids !== undefined) { evidenceOk = false; evidenceDetail = `${id} unexpected evidence_skill_ids`; break; }
  }
  if (!evidenceOk) break;
}
report('every step defaults to its lesson primary skill (no evidence_skill_ids, no participation flag)', evidenceOk, evidenceDetail);

// ================= 3. finale target/tiles =================
const FINALE = {
  'lesson-sort-by-property': { target: 'smooth-basket', tiles: ['smooth-basket', 'rough-basket'] },
  'lesson-what-will-happen-if': { target: 'green-leaf', tiles: ['green-leaf', 'book'] },
  'lesson-why-did-that-happen': { target: 'cup', tiles: ['cup', 'ball', 'book'] },
};
const finaleEntries = [...sessionSrc.matchAll(/'([^']+)':\s*\{\s*targetItemId:\s*'([^']+)',\s*tileItemIds:\s*\[([^\]]*)\],\s*findPromptRef:\s*'([^']+)',\s*\}/g)].map((m) => ({
  id: m[1], target: m[2], tiles: m[3].split(',').map((t) => t.trim().replace(/'/g, '')).filter(Boolean), ref: m[4],
}));
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
report('every Wave 6 finale target == step-5 target; every tile appears in its lesson steps', finaleOk, finaleDetail);

// ================= 4. fallback chain =================
const chain = ['lesson-what-do-you-see', 'lesson-sort-by-property', 'lesson-what-will-happen-if', 'lesson-why-did-that-happen'];
let chainOk = true;
for (let i = 1; i < chain.length; i++) if (lessonById(chain[i])?.fallback_lesson_id !== chain[i - 1]) { chainOk = false; break; }
report('fallbacks resolve in queue order: what-do-you-see -> sort-by-property -> what-will-happen-if -> explain-why', chainOk);

// ================= 5. skills =================
report('sort-by-property: science, prereq [sorting-one-rule, what-do-you-see], next [what-will-happen-if]', skillById('sort-by-property')?.domain === 'science' && JSON.stringify(skillById('sort-by-property')?.prerequisites) === JSON.stringify(['sorting-one-rule', 'what-do-you-see']) && JSON.stringify(skillById('sort-by-property')?.next_skills) === JSON.stringify(['what-will-happen-if']));
report('what-will-happen-if: science, prereq [what-do-you-see, sort-by-property], next [explain-why]', skillById('what-will-happen-if')?.domain === 'science' && JSON.stringify(skillById('what-will-happen-if')?.prerequisites) === JSON.stringify(['what-do-you-see', 'sort-by-property']) && JSON.stringify(skillById('what-will-happen-if')?.next_skills) === JSON.stringify(['explain-why']));
report('explain-why: science, prereq [what-will-happen-if], next []', skillById('explain-why')?.domain === 'science' && JSON.stringify(skillById('explain-why')?.prerequisites) === JSON.stringify(['what-will-happen-if']) && JSON.stringify(skillById('explain-why')?.next_skills) === JSON.stringify([]));
report('what-do-you-see.next_skills in skills.json stays [name-with-grown-up] UNTOUCHED', JSON.stringify(skillById('what-do-you-see')?.next_skills) === JSON.stringify(['name-with-grown-up']));
report('sorting-one-rule resolves in-pack (no cross-pack issue)', Boolean(skillById('sorting-one-rule')));
report('skill records carry NO provisional field (schema additionalProperties:false)', ['sort-by-property', 'what-will-happen-if', 'explain-why'].every((id) => !('provisional' in (skillById(id) ?? {}))));

// ================= 6. path-graph =================
const sp = PATH_NODE_BY_ID.get('sort-by-property');
const ex = PATH_NODE_BY_ID.get('explain-why');
const wdys = PATH_NODE_BY_ID.get('what-do-you-see');
const wwhi = PATH_NODE_BY_ID.get('what-will-happen-if');
report('path node sort-by-property: science, min_age 3, provisional, next [what-will-happen-if]', sp?.domain === 'science' && sp?.min_age === 3 && sp?.provisional === true && sp?.entry === false && JSON.stringify(sp?.next) === JSON.stringify(['what-will-happen-if']));
report('path node explain-why: science, min_age 5, provisional, next []', ex?.domain === 'science' && ex?.min_age === 5 && ex?.provisional === true && ex?.entry === false && JSON.stringify(ex?.next) === JSON.stringify([]));
report('what-do-you-see.next rewired to [sort-by-property]', JSON.stringify(wdys?.next) === JSON.stringify(['sort-by-property']));
report('what-will-happen-if.next rewired to [explain-why]', JSON.stringify(wwhi?.next) === JSON.stringify(['explain-why']));
report('catch_up edges unchanged', wdys?.catch_up === 'notice-with-choices' && wwhi?.catch_up === 'what-do-you-see' && sp?.catch_up === null && ex?.catch_up === null);
report('all five science nodes provisional true', ['notice-with-choices', 'what-do-you-see', 'what-will-happen-if', 'sort-by-property', 'explain-why'].every((id) => PATH_NODE_BY_ID.get(id)?.provisional === true));
report('the 3 lessons are attached to their nodes (lesson_skill_ids + playable_lesson_skill_id)', [
  ['sort-by-property', 'sort-by-property'], ['what-will-happen-if', 'what-will-happen-if'], ['explain-why', 'explain-why'],
].every(([node, skill]) => {
  const n = PATH_NODE_BY_ID.get(node);
  return JSON.stringify(n?.lesson_skill_ids) === JSON.stringify([skill]) && n?.playable_lesson_skill_id === skill;
}));
report('node titles resolve in Pack 2 (adventure.skill.* scheme)', ['adventure.skill.sort_by_property.title', 'adventure.skill.what_will_happen_if.title', 'adventure.skill.explain_why.title', 'adventure.skill.what_do_you_see.title'].every((k) => typeof strings[k] === 'string'));

// ================= 7. sets =================
const ts = sets.find((s) => s.id === 'texture-sort-set');
report('texture-sort-set holds exactly its 6 items', JSON.stringify(ts?.items.map((i) => i.item_id)) === JSON.stringify(['rough-bark', 'crinkly-leaf', 'rough-basket', 'smooth-basket', 'green-leaf', 'ball']));
report('texture-sort-set reuse items copied verbatim (green-leaf, ball)', ['green-leaf', 'ball'].every((id) => {
  const a = ts.items.find((i) => i.item_id === id);
  const b = id === 'ball' ? sets.find((s) => s.id === 'everyday-objects-set').items.find((i) => i.item_id === id) : sets.find((s) => s.id === 'what-do-you-see-set').items.find((i) => i.item_id === id);
  return a.asset_path === b.asset_path && a.asset_sha256 === b.asset_sha256;
}));
const ps = sets.find((s) => s.id === 'predict-set');
report('predict-set holds exactly 6 choice tiles (no watering-can)', JSON.stringify(ps?.items.map((i) => i.item_id)) === JSON.stringify(['ball', 'book', 'cup', 'spoon', 'green-leaf', 'outdoor-plant']));
const es = sets.find((s) => s.id === 'explain-set');
report('explain-set holds exactly 5 choice tiles (no outdoor-plant)', JSON.stringify(es?.items.map((i) => i.item_id)) === JSON.stringify(['sun', 'ball', 'book', 'cup', 'watering-can']));
report('sun in Pack 2 is byte-identical to Pack 1 adv_sun.jpg', fs.readFileSync(path.join(root, P2 + 'assets/sun.jpg')).equals(fs.readFileSync(path.join(root, 'packs/sunny-home-garden/assets/adv_sun.jpg'))));
const w6ItemTokens = [ts, ps, es].flatMap((s) => s.items.map((i) => `${i.item_id} ${i.asset_path}`));
report('no size/colour items in the Wave 6 sets', w6ItemTokens.every((t) => !/\b(big|small|large|little|colour|color|red|yellow|blue)\b/i.test(t)), w6ItemTokens.find((t) => /\b(big|small|large|little|colour|color|red|yellow|blue)\b/i.test(t)) || '');

// ================= 8. 36 voice + 5 images resolve; sha256 matches zip + manifest =================
const SNAKES = ['sort_by_property', 'what_will_happen_if', 'why_did_that_happen'];
const voiceRefs = [];
for (const s of SNAKES) {
  for (let n = 1; n <= 5; n++) { voiceRefs.push(`lesson.${s}.step_${n}.prompt`); voiceRefs.push(`lesson.${s}.step_${n}.celebration`); }
  voiceRefs.push(`lesson.${s}.closing_win`, `lesson.${s}.find_prompt`);
}
const unresolvedVoice = voiceRefs.filter((r) => !voiceResolves(r));
report('all 36 Wave 6 voice refs resolve through the loader to real files', unresolvedVoice.length === 0, unresolvedVoice.join(', '));
const imgAssets = ['assets/rough-bark.jpg', 'assets/crinkly-leaf.jpg', 'assets/rough-basket.jpg', 'assets/smooth-basket.jpg', 'assets/sun.jpg'];
report('all 5 Wave 6 images resolve through the asset registry', imgAssets.every((a) => assetResolves(a)));

const RAW_SHA = {
  "images/crinkly-leaf.jpg": "ecdbe5a2661d5123be94de351c0244162a33711bffac2fd1100e584d2e041d11",
  "images/rough-bark.jpg": "5cba3c3f2274c4c0ed3d8f73725cfa30df1e46fe83b920c975a025f7ced4c430",
  "images/rough-basket.jpg": "27c34f2370c24c7c91252a4faa44a3a42d531d94579b7cd3af822fb9a2bf528c",
  "images/smooth-basket.jpg": "1b7cac94f1a17eadb068bcce7a8f2f9964b5591e1c3244e67a1d30eaeab0e037",
  "images/sun.jpg": "ec9d50d63e2de5833fa225242ddc014f8ca0e3c0cabc8cb9cbf2b574ad84d42c",
  "voice/lesson-sort-by-property_n01.mp3": "921d34a6b66e5e0ba889c98a20da287aa847c236627cedfec42d65d59efade4c",
  "voice/lesson-sort-by-property_n02.mp3": "7344f9c08de332f7572b393d79c54d5685ddc63ea56f9886442a5f091bc92279",
  "voice/lesson-sort-by-property_n03.mp3": "03a28cf79c4d6065586f373de90db89e8b11280311f086efb11efafe3fb421ed",
  "voice/lesson-sort-by-property_n04.mp3": "de17f4ec021ab846ab170ce7807b9189c1dd4e93b9259670f9a69835c0ebdf9d",
  "voice/lesson-sort-by-property_n05.mp3": "95e2d6692f031fcdacda05e42aa0f08abd673b048cec3ffbecc51cb14c650d10",
  "voice/lesson-sort-by-property_n06.mp3": "62e5acbb2c3ce0d0a5c945504055820e8e671b6befbea9f102f4695b0f939758",
  "voice/lesson-sort-by-property_n07.mp3": "e23aa0f1bef793f863eab8cd1545a1d41f008498ec091b84d24c30a521e9f3cf",
  "voice/lesson-sort-by-property_n08.mp3": "c5ba293875b1877982bb839c25770c5ec0a02b2cb912febc2d7191b229cd2f53",
  "voice/lesson-sort-by-property_n09.mp3": "00ab318b350e345309b8fde3fa44630de33e508f1eb083dbcbeb88075a25f85f",
  "voice/lesson-sort-by-property_n10.mp3": "794e04d24d2317ea9377a91b7b9db7a1e9441b0ab69db4d96427c04caa28cacb",
  "voice/lesson-sort-by-property_n11.mp3": "e6a45bc7cf74644eddbdc1ed3112294d5944d31144c0e542cb434194ff060231",
  "voice/lesson-sort-by-property_n12.mp3": "2334fa0903f82f492080108385a5888b2f4be0e2fe61ec5e85633f9110360580",
  "voice/lesson-what-will-happen-if_n01.mp3": "190721f2471264f4b4f7b932247dbfa8e5fde23711359fb4ac99198ebc593ac5",
  "voice/lesson-what-will-happen-if_n02.mp3": "e39f6fe33ecc99a3e911baa7762f69acf79bc0aaeded61bce44eb9c619d0baca",
  "voice/lesson-what-will-happen-if_n03.mp3": "148f6720c5b51fdd04079cb59c7973dbc62ae4c1d99ec903328f20a74fb40a5d",
  "voice/lesson-what-will-happen-if_n04.mp3": "669671a51f4e4f84dd47985582ef9fba5aeb027d2a6f7ebe3fc266c309c3ba0d",
  "voice/lesson-what-will-happen-if_n05.mp3": "6a60810965d63d51513a3e002dea73b3f7260ac18b0d7c44f9023e316f751197",
  "voice/lesson-what-will-happen-if_n06.mp3": "770391972d8d9b1109cd61f1ef584b591af62328f210fae4bb4ee473c476e938",
  "voice/lesson-what-will-happen-if_n07.mp3": "17f324bd5e23aff118dd74be023fc4322bfdcf04533af079954d78582b7904e2",
  "voice/lesson-what-will-happen-if_n08.mp3": "3fc5135a62f7fc0ea0cdf70b88a4d8febdb43dce66f1c03f250361d7ec71163a",
  "voice/lesson-what-will-happen-if_n09.mp3": "554147e2bc23172f6fa013e2a165a1596757714e162eb27d6332d45c5025bf34",
  "voice/lesson-what-will-happen-if_n10.mp3": "94344ef5ffd760fe069f17947e957b4820a867593a92f6a3d7a49c7b110e2bcb",
  "voice/lesson-what-will-happen-if_n11.mp3": "8889f806e3f9b9f86b74c809d862aa122d932b72d1d07d1000de13995d735229",
  "voice/lesson-what-will-happen-if_n12.mp3": "be3091a9bb8fc157bd75e2c08c57038e68e3e079cd87bb6116641e528e46e2c2",
  "voice/lesson-why-did-that-happen_n01.mp3": "5fbc5c19517b63d887481671922ebb243ca9c82b0dcc19e1c16809a5c66d5354",
  "voice/lesson-why-did-that-happen_n02.mp3": "c8b5a2ba3b0052f24553ca9678a103cbb0124eaa791bb16c687ddfb00db90bac",
  "voice/lesson-why-did-that-happen_n03.mp3": "ecd1943abbcbfbd4fdfbce4df8d7fd84461d7b18ad57ff55a504118cff0d146e",
  "voice/lesson-why-did-that-happen_n04.mp3": "0336c070117aa2952ffe6169ea161917458dca3b411304349fbb50f22e44aa63",
  "voice/lesson-why-did-that-happen_n05.mp3": "9c789387a4934c902c68df629aba6e2414b5b1d1b651a91ef90b4b6e755fa2bc",
  "voice/lesson-why-did-that-happen_n06.mp3": "604bd871831c5faffa8175af3ae1fba713c0ff422c88d59f6293fdb3da561a06",
  "voice/lesson-why-did-that-happen_n07.mp3": "0fae3b46297f8f023121162553d2158d995b81a243af0341ec40e959b35129a6",
  "voice/lesson-why-did-that-happen_n08.mp3": "ef83a290e9176087ce1104e362f7f715cb707904e6c91d7ff85e1ef1e3708984",
  "voice/lesson-why-did-that-happen_n09.mp3": "bcf520b5de7fdf2919f48547946d6b00b1da6baf7d272389948944add13d8b07",
  "voice/lesson-why-did-that-happen_n10.mp3": "5910cc0670c1d4db83c6086a76a79ad64f62969959803d93e7fca285b7bd874d",
  "voice/lesson-why-did-that-happen_n11.mp3": "f0bd435e50219fe133ec10ae169e508b2ac309a18610031bafa7206f82255755",
  "voice/lesson-why-did-that-happen_n12.mp3": "d158935549218789dd2df190d3008b648371fcd0c7a45c82b8318b584fe1cf8b"
};
const zipVoice = { sort_by_property: 'lesson-sort-by-property', what_will_happen_if: 'lesson-what-will-happen-if', why_did_that_happen: 'lesson-why-did-that-happen' };
const zipImg = { 'assets/rough-bark.jpg': 'images/rough-bark.jpg', 'assets/crinkly-leaf.jpg': 'images/crinkly-leaf.jpg', 'assets/rough-basket.jpg': 'images/rough-basket.jpg', 'assets/smooth-basket.jpg': 'images/smooth-basket.jpg', 'assets/sun.jpg': 'images/sun.jpg' };
const assetChecks = [];
for (const [rel, zip] of Object.entries(zipImg)) assetChecks.push([rel, RAW_SHA[zip]]);
for (const s of SNAKES) {
  const zip = zipVoice[s];
  for (let n = 1; n <= 5; n++) {
    assetChecks.push([`assets/voice/puff/lesson_${s}_step_${n}_prompt.mp3`, RAW_SHA[`voice/${zip}_n${String(n).padStart(2, '0')}.mp3`]]);
    assetChecks.push([`assets/voice/puff/lesson_${s}_step_${n}_celebration.mp3`, RAW_SHA[`voice/${zip}_n${String(n + 5).padStart(2, '0')}.mp3`]]);
  }
  assetChecks.push([`assets/voice/puff/lesson_${s}_closing_win.mp3`, RAW_SHA[`voice/${zip}_n11.mp3`]]);
  assetChecks.push([`assets/voice/puff/lesson_${s}_find_prompt.mp3`, RAW_SHA[`voice/${zip}_n12.mp3`]]);
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
report('all 41 Wave 6 assets: raw sha256 matches the zip manifests AND manifest.file_hashes matches validator scheme', shaOk, shaDetail);

// finale-reuse pairs: byte-distinct files -> both placed (base 36, no deduction)
const pairA = 'packs/sunny-home-garden-2/assets/voice/puff/lesson_what_will_happen_if_find_prompt.mp3';
const pairB = 'packs/sunny-home-garden-2/assets/voice/puff/lesson_what_do_you_see_find_prompt.mp3';
const pairC = 'packs/sunny-home-garden-2/assets/voice/puff/lesson_why_did_that_happen_find_prompt.mp3';
const pairD = 'packs/sunny-home-garden-2/assets/voice/moss/lesson_give_three_find_prompt.mp3';
report('finale-reuse pairs are byte-distinct -> both placed (base 36, no deduction)', rawSha(pairA) !== rawSha(pairB) && rawSha(pairC) !== rawSha(pairD));

// ================= 9. explain-why recognition wording =================
const explainKeys = ['skill.explain_why.title', 'skill.explain_why.description', 'adventure.skill.explain_why.title'];
report('explain-why title/description + parent-map copy use recognition wording', explainKeys.every((k) => /recogniz/i.test(strings[k] ?? '')));
report('no "explains in own words" claim anywhere in the pack copy', !JSON.stringify(strings).match(/explains? in (their|his|her|own) words/i));
report('L1 bands neither colour-naming nor sizes-big-little', !JSON.stringify(lessonById('lesson-sort-by-property')).match(/colour-naming|sizes-big-little/));

// ================= 10. pre-existing steps unchanged =================
const w6Ids = Object.keys(W6);
// Pre-Wave-6 lessons, pinned explicitly so this snapshot stays wave-relative.
const PRE_W6_LESSON_IDS = ['lesson-point-to','lesson-sort-by-kind','lesson-words-that-sound-the-same','lesson-finish-the-rhyme','lesson-clap-the-beats','lesson-first-sounds','lesson-name-it-together','lesson-see-how-many','lesson-give-one','lesson-give-two','lesson-give-three','lesson-give-just-right','lesson-copy-the-pattern','lesson-sort-by-colour','lesson-what-do-you-see','lesson-give-four','lesson-how-many','lesson-more-or-less','lesson-shape-names','lesson-copy-abc-pattern','lesson-letter-names-1','lesson-letter-names-2','lesson-first-letter-sounds','lesson-animal-words'];
const preLessons = PRE_W6_LESSON_IDS.map((id) => lessonById(id)).filter(Boolean);
const preHash = crypto.createHash('sha256').update(JSON.stringify(preLessons.map((x) => ({ id: x.id, steps: x.steps })))).digest('hex');
report('all pre-existing steps byte-unchanged (118 steps at HEAD 8f3b314; snapshot hash)', preHash === '4f710f3077512e76e2cdae28d02c77ef2a705902cab2dfd789b218e194d53b58', preHash);
report('pre-existing step count is 118 (verified from the repo)', preLessons.reduce((n, l) => n + l.steps.length, 0) === 118);

// ================= 11. FinaleNarrator mounts unchanged =================
const tabletStart = sessionSrc.indexOf('if (isTablet) {');
const phoneStart = sessionSrc.indexOf('\n  return (\n    <SafeAreaView style={styles.safe}', tabletStart);
const countMounts = (s) => (s.match(/<FinaleNarrator\b/g) || []).length;
report('FinaleNarrator mounts unchanged from Wave 4 (tablet = 1, phone = 1)', countMounts(sessionSrc.slice(tabletStart, phoneStart)) === 1 && countMounts(sessionSrc.slice(phoneStart)) === 1, `tablet=${countMounts(sessionSrc.slice(tabletStart, phoneStart))} phone=${countMounts(sessionSrc.slice(phoneStart))}`);

// ================= 12. all FINALE_CONFIG findPromptRefs resolve (owning pack) =================
const pack2LessonIds = new Set(lessons.map((l) => l.id));
const pack1Strings = readJson('packs/sunny-home-garden/strings.json').locales['en-US'];
const pack1VoiceBlock = sliceBetween(loaderSrc, '"sunny-home-garden": {', '"sunny-home-garden-2": {');
const pack1VoiceResolves = (key) => {
  const rel = importPathFor(identFor(pack1VoiceBlock, key));
  return Boolean(rel && exists(rel));
};
const pack3LessonIds = new Set(readJson('packs/sunny-home-garden-3/lessons.json').map((l) => l.id));
const pack3Strings = readJson('packs/sunny-home-garden-3/strings.json').locales['en-US'];
const pack3VoiceBlock = sliceBetween(loaderSrc, '"sunny-home-garden-3": {', 'const PACK_ASSET_REGISTRY');
const pack3VoiceResolves = (key) => {
  const rel = importPathFor(identFor(pack3VoiceBlock, key));
  return Boolean(rel && exists(rel));
};
const badRefs = [];
for (const e of finaleEntries) {
  if (pack2LessonIds.has(e.id)) { if (!(e.ref in strings) || !voiceResolves(e.ref)) badRefs.push(`${e.ref}(pack2)`); }
  else if (pack3LessonIds.has(e.id)) { if (!(e.ref in pack3Strings) || !pack3VoiceResolves(e.ref)) badRefs.push(`${e.ref}(pack3)`); }
  else if (!(e.ref in pack1Strings) || !pack1VoiceResolves(e.ref)) badRefs.push(`${e.ref}(pack1)`);
}
report(`all ${finaleEntries.length} FINALE_CONFIG findPromptRefs resolve under their owning pack`, finaleEntries.length >= 31 && badRefs.length === 0, `count=${finaleEntries.length} bad=${badRefs.join(', ')}`);

console.log(`\n${failures === 0 ? 'ALL WAVE 6 WIRING CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
