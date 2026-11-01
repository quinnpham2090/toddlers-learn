/**
 * Wave 8 wiring drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the Wave 8 wiring against the REAL live Pack 2 records, the REAL
 * validator hash scheme, the REAL raw-byte sha256s from the delivery zip
 * manifests, and the REAL source files the runtime reads (lib/pack-loader.ts
 * registries, app/session.tsx FINALE_CONFIG + FinaleNarrator mounts).
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

// ================= 1. 2 lessons, 10 steps, verbatim =================
const W8 = {
  'lesson-food-words': {
    set: 'food-words-set', primary: 'food-words', fallback: 'lesson-animal-words', fbp: 'animal-words-set',
    steps: [
      ['Tap the apple!', 'apple', ['apple', 'banana', 'bread']],
      ['Tap the banana!', 'banana', ['banana', 'egg', 'apple']],
      ['Tap the bread!', 'bread', ['bread', 'banana', 'egg']],
      ['Tap the egg!', 'egg', ['egg', 'apple', 'bread']],
      ['Tap the apple again!', 'apple', ['apple', 'egg', 'banana']],
    ],
  },
  'lesson-vehicle-words': {
    set: 'vehicle-words-set', primary: 'vehicle-words', fallback: 'lesson-food-words', fbp: 'food-words-set',
    steps: [
      ['Tap the car!', 'car', ['car', 'bus', 'train']],
      ['Tap the bus!', 'bus', ['bus', 'bicycle', 'car']],
      ['Tap the train!', 'train', ['train', 'car', 'bicycle']],
      ['Tap the bicycle!', 'bicycle', ['bicycle', 'bus', 'train']],
      ['Tap the car again!', 'car', ['car', 'train', 'bicycle']],
    ],
  },
};
report('exactly the 2 Wave 8 lessons exist', Object.keys(W8).every((id) => lessonById(id)) && lessons.filter((l) => W8[l.id]).length === 2);
report('10 Wave 8 steps total', Object.keys(W8).reduce((n, id) => n + (lessonById(id)?.steps.length ?? 0), 0) === 10);

let verbatim = true;
let verbatimDetail = '';
for (const [id, spec] of Object.entries(W8)) {
  const lesson = lessonById(id);
  if (!lesson) { verbatim = false; verbatimDetail = `missing ${id}`; break; }
  if (lesson.character_id !== 'puff') { verbatim = false; verbatimDetail = `${id} character`; break; }
  if (lesson.age_band !== '3-4' || lesson.interaction_type !== 'tap_choice') { verbatim = false; verbatimDetail = `${id} band/type`; break; }
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
report('every Wave 8 step prompt/target/choices match this prompt verbatim (exactly one correct)', verbatim, verbatimDetail);
report('step 5 of each lesson revisits its step-1 target with a different distractor pair', lessonById('lesson-food-words').steps[4].target_item_id === 'apple' && JSON.stringify(lessonById('lesson-food-words').steps[4].choice_item_ids) !== JSON.stringify(lessonById('lesson-food-words').steps[0].choice_item_ids) && lessonById('lesson-vehicle-words').steps[4].target_item_id === 'car' && JSON.stringify(lessonById('lesson-vehicle-words').steps[4].choice_item_ids) !== JSON.stringify(lessonById('lesson-vehicle-words').steps[0].choice_item_ids));

// ================= 2. per-step evidence =================
let evidenceOk = true;
let evidenceDetail = '';
for (const [id, spec] of Object.entries(W8)) {
  const lesson = lessonById(id);
  const expected = id === 'lesson-food-words' ? 'food-words' : 'vehicle-words';
  for (const step of lesson.steps) {
    if (step.evidence_participation !== undefined) { evidenceOk = false; evidenceDetail = `${id} participation`; break; }
    if (JSON.stringify(step.evidence_skill_ids) !== JSON.stringify([expected])) { evidenceOk = false; evidenceDetail = `${id} step ${step.step_index} evidence`; break; }
  }
  if (!evidenceOk) break;
}
report('per-step evidence exact ([food-words] / [vehicle-words]); no participation flag', evidenceOk, evidenceDetail);

// ================= 3. finale target/tiles =================
const FINALE = {
  'lesson-food-words': { target: 'apple', tiles: ['apple', 'egg', 'banana'] },
  'lesson-vehicle-words': { target: 'car', tiles: ['car', 'train', 'bicycle'] },
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
report('every Wave 8 finale target == step-5 target; every tile appears in its lesson steps', finaleOk, finaleDetail);

// ================= 4. fallback chain + skill graph =================
const chain = ['lesson-animal-words', 'lesson-food-words', 'lesson-vehicle-words'];
let chainOk = true;
for (let i = 1; i < chain.length; i++) if (lessonById(chain[i])?.fallback_lesson_id !== chain[i - 1]) { chainOk = false; break; }
report('fallbacks resolve in queue order: animal-words -> food-words -> vehicle-words', chainOk);
report('animal-words next = [food-words] (the Wave 5 record edited by this run)', JSON.stringify(skillById('animal-words')?.next_skills) === JSON.stringify(['food-words']));
report('food-words: language, prereq [animal-words], next [vehicle-words]', skillById('food-words')?.domain === 'language' && JSON.stringify(skillById('food-words')?.prerequisites) === JSON.stringify(['animal-words']) && JSON.stringify(skillById('food-words')?.next_skills) === JSON.stringify(['vehicle-words']));
report('vehicle-words: language, prereq [food-words], next []', skillById('vehicle-words')?.domain === 'language' && JSON.stringify(skillById('vehicle-words')?.prerequisites) === JSON.stringify(['food-words']) && JSON.stringify(skillById('vehicle-words')?.next_skills) === JSON.stringify([]));
report('vehicle-words copy carries no ladder claim (no "requires food"/"must know food")', !/requires? food|must know food|needs? food/i.test(JSON.stringify([strings['skill.vehicle_words.title'], strings['skill.vehicle_words.description'], strings['lesson.vehicle_words.title']])));

// ================= 5. sets =================
const fw = sets.find((s) => s.id === 'food-words-set');
report('food-words-set holds exactly its 4 items', JSON.stringify(fw?.items.map((i) => i.item_id)) === JSON.stringify(['apple', 'banana', 'bread', 'egg']));
const vw = sets.find((s) => s.id === 'vehicle-words-set');
report('vehicle-words-set holds exactly its 4 items (3 new + car)', JSON.stringify(vw?.items.map((i) => i.item_id)) === JSON.stringify(['bus', 'train', 'bicycle', 'car']));
report('car item in vehicle-words-set is copied verbatim from rhyme-pairs-set', (() => {
  const a = vw.items.find((i) => i.item_id === 'car');
  const b = sets.find((s) => s.id === 'rhyme-pairs-set').items.find((i) => i.item_id === 'car');
  return a.asset_path === b.asset_path && a.asset_sha256 === b.asset_sha256 && a.label_ref === b.label_ref;
})());
report('car resolves through the loader asset registry', assetResolves('assets/car.jpg'));

// ================= 6. 24 voice + 7 images resolve; sha256 matches zip + manifest =================
const SNAKES = ['food_words', 'vehicle_words'];
const voiceRefs = [];
for (const s of SNAKES) {
  for (let n = 1; n <= 5; n++) { voiceRefs.push(`lesson.${s}.step_${n}.prompt`); voiceRefs.push(`lesson.${s}.step_${n}.celebration`); }
  voiceRefs.push(`lesson.${s}.closing_win`, `lesson.${s}.find_prompt`);
}
const unresolvedVoice = voiceRefs.filter((r) => !voiceResolves(r));
report('all 24 Wave 8 voice refs resolve through the loader to real files', unresolvedVoice.length === 0, unresolvedVoice.join(', '));
const imgAssets = ['assets/apple.jpg', 'assets/banana.jpg', 'assets/bread.jpg', 'assets/egg.jpg', 'assets/bus.jpg', 'assets/train.jpg', 'assets/bicycle.jpg'];
report('all 7 Wave 8 images resolve through the asset registry', imgAssets.every((a) => assetResolves(a)));

const RAW_SHA = {
  "images/apple.jpg": "ce69f7e17c0bafc7ce3ef0ed3e3c86987d014570a3832f59812ebf3a532bd249",
  "images/banana.jpg": "d635a643a1ce947442d9ce02b80e76b8f41697e512cfda18f1e88c5ec3b14355",
  "images/bicycle.jpg": "6f1c42caf780a48f4053cee2efaaef0174299cbcd800bbc255592731b21f14d2",
  "images/bread.jpg": "9212f756b8a96cb109ec9397be48a66fb15e64b875d4a5ed56e2854451cca062",
  "images/bus.jpg": "4413160631469c0641885707c70d2cbb43ff7ad9d42bc941baa95424cab2944b",
  "images/egg.jpg": "9bfe1ca7dbb8b0b96506fec1bb334b2c85d68fe46fa3d2fcda4c82e9f0e8fbc7",
  "images/train.jpg": "d086903a85b5b688c4e9384a643eef0c3f251a4dd2319e9eb9a4767163789401",
  "voice/lesson-food-words_n01.mp3": "2e227c56eed4905718cf93fdfbf0ae42ad342686bc592550ea302af91082ae44",
  "voice/lesson-food-words_n02.mp3": "c0e08cbb55f7f24cc267a4f56b68835811bcbed869c17179178a2ffcbe1f4da9",
  "voice/lesson-food-words_n03.mp3": "72a199a01f27e8a113106c5a8e0d8615aa548d7ff001ab635ef52342b2f56f2b",
  "voice/lesson-food-words_n04.mp3": "e1dba830446bcd41177474cb08edd53d8e5afd7f3cca2d04b2d548cd60d3740d",
  "voice/lesson-food-words_n05.mp3": "ae0adea3f48fb73bedd2323189fd7a5e2670665c11eaf92b712378b09fe6789e",
  "voice/lesson-food-words_n06.mp3": "7ceafb9fe283c31d83ee98c5ece282c11613be6ae207c9ec1a113c46e370a45d",
  "voice/lesson-food-words_n07.mp3": "195e4b728442ccfa6b942d957bae83260be2a649461aaed9e9bd7e23a078a974",
  "voice/lesson-food-words_n08.mp3": "2c063bb19426994d5ff6381975ebded88b4e1f87a48b4e5287e34827894c1e14",
  "voice/lesson-food-words_n09.mp3": "f5f778929f5dc651a1509a440fc3f3e42058676b86a7e6c2ff6f5900f7f622ad",
  "voice/lesson-food-words_n10.mp3": "b2f6446755b80fbbe823cdf999d31e02bb154215774c57df2daecafaf0e895cb",
  "voice/lesson-food-words_n11.mp3": "deae17a06bd1c22a733387627d905edf0457f6d195cd3dfb27ad5781a0fcfd8c",
  "voice/lesson-food-words_n12.mp3": "5f0195db90495906904e1079a433f38587ce7820f8d0897f84c12918868296ab",
  "voice/lesson-vehicle-words_n01.mp3": "4a793e1244493293babdc1bc71905283c2ce1f9b881e369aa62cac3d50114bde",
  "voice/lesson-vehicle-words_n02.mp3": "82f835dc2d6c1542f3843f9863005b65847b77242585397f54715cca4be66469",
  "voice/lesson-vehicle-words_n03.mp3": "5c8cfec74a943f17933cb53eaa6d85a04f906bbe37fbe493db4fdd8d75e61429",
  "voice/lesson-vehicle-words_n04.mp3": "7e62173c28cdfaa2dd3134609437d98f9de4f1153c9d80b7220e2686105cd3b7",
  "voice/lesson-vehicle-words_n05.mp3": "a578d342346055bfb63e5d16ab13bafa110549ff572326288ea5a4e248d689d8",
  "voice/lesson-vehicle-words_n06.mp3": "1056f0bb183741c63051fb310a51f560bc21b42f40a8bd9dd5fb1cf7a300893b",
  "voice/lesson-vehicle-words_n07.mp3": "1a9a9f455122088dd2214faede55ff7b57a8e8811c03f928827177f39423f9eb",
  "voice/lesson-vehicle-words_n08.mp3": "9015ca4aaeb2618833a87cd934a3c7d695ffd10ca17a042e45fddb8e50308f50",
  "voice/lesson-vehicle-words_n09.mp3": "b8fd99524bc74d3f976deaab57ff5a28b5d288cb5dcc41ee6efffae317f4f4ed",
  "voice/lesson-vehicle-words_n10.mp3": "fc5077a7c1806f33df24813c8dd6aa6796334c2341909fa5cd256384117c7efe",
  "voice/lesson-vehicle-words_n11.mp3": "a37fb31b6defc688718b343fc9102acf98c463386e95f9d80c6310c61cc2b462",
  "voice/lesson-vehicle-words_n12.mp3": "87c9de9ff4674821775f09f4ab60ffb6f45469c1fa84853091899a08b4a67134"
};
const zipVoice = { food_words: 'lesson-food-words', vehicle_words: 'lesson-vehicle-words' };
const zipImg = { 'assets/apple.jpg': 'images/apple.jpg', 'assets/banana.jpg': 'images/banana.jpg', 'assets/bread.jpg': 'images/bread.jpg', 'assets/egg.jpg': 'images/egg.jpg', 'assets/bus.jpg': 'images/bus.jpg', 'assets/train.jpg': 'images/train.jpg', 'assets/bicycle.jpg': 'images/bicycle.jpg' };
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
report('all 31 Wave 8 assets: raw sha256 matches the zip manifests AND manifest.file_hashes matches validator scheme', shaOk, shaDetail);

// ================= 7. no colour named in any W8 line =================
const w8Keys = Object.keys(strings).filter((k) => /^lesson\.(food_words|vehicle_words)\./.test(k));
const colourRe = /\b(red|yellow|blue|green|orange|purple|pink|brown|black|white|grey|gray)\b/i;
const colourHit = w8Keys.find((k) => colourRe.test(strings[k]));
report('no Wave 8 line names a colour', !colourHit, colourHit ? `${colourHit}: ${strings[colourHit]}` : '');
report('no naming-quiz prompt ("What is this?") anywhere in Wave 8', !w8Keys.some((k) => /what is this|what's this/i.test(strings[k])));

// ================= 8. pre-existing steps unchanged =================
const w8Ids = Object.keys(W8);
const preLessons = lessons.filter((l) => !w8Ids.includes(l.id));
const preHash = crypto.createHash('sha256').update(JSON.stringify(preLessons.map((x) => ({ id: x.id, steps: x.steps })))).digest('hex');
report('all pre-existing steps byte-unchanged (133 steps at HEAD 280c22c; snapshot hash)', preHash === 'bc768c767263a79b35ed9aaca868f650750b05183e913391b7da74eaca015883', preHash);
report('pre-existing step count is 133 (verified from the repo)', preLessons.reduce((n, l) => n + l.steps.length, 0) === 133);

// ================= 9. FinaleNarrator mounts unchanged =================
const tabletStart = sessionSrc.indexOf('if (isTablet) {');
const phoneStart = sessionSrc.indexOf('\n  return (\n    <SafeAreaView style={styles.safe}', tabletStart);
const countMounts = (s) => (s.match(/<FinaleNarrator\b/g) || []).length;
report('FinaleNarrator mounts unchanged from Wave 4 (tablet = 1, phone = 1)', countMounts(sessionSrc.slice(tabletStart, phoneStart)) === 1 && countMounts(sessionSrc.slice(phoneStart)) === 1, `tablet=${countMounts(sessionSrc.slice(tabletStart, phoneStart))} phone=${countMounts(sessionSrc.slice(phoneStart))}`);

// ================= 10. path-graph untouched (no vocab nodes) =================
report('lib/path-graph.js untouched: no food-words / vehicle-words nodes', !PATH_NODE_BY_ID.has('food-words') && !PATH_NODE_BY_ID.has('vehicle-words'));

// ================= 11. all FINALE_CONFIG findPromptRefs resolve (owning pack) =================
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
report(`all ${finaleEntries.length} FINALE_CONFIG findPromptRefs resolve under their owning pack`, finaleEntries.length >= 33 && badRefs.length === 0, `count=${finaleEntries.length} bad=${badRefs.join(', ')}`);

console.log(`\n${failures === 0 ? 'ALL WAVE 8 WIRING CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
