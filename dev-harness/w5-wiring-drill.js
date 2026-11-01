/**
 * Wave 5 wiring drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the Wave 5 wiring against the REAL live Pack 2 records, the REAL
 * validator hash scheme, the REAL raw-byte sha256s from the delivery zip
 * manifests, and the REAL source files the runtime reads (lib/pack-loader.ts
 * registries, app/session.tsx FINALE_CONFIG + FinaleNarrator mounts).
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

// ================= 1. 4 lessons, 20 steps, verbatim =================
const W5 = {
  'lesson-letter-names-1': {
    set: 'letter-tiles-set', primary: 'letter-names', fallback: 'lesson-first-sounds', fbp: 'first-sounds-set',
    steps: [
      ['C is for cat! Find the letter C!', 'letter-c', ['letter-c', 'letter-b', 'letter-d']],
      ['B is for ball! Find the letter B!', 'letter-b', ['letter-b', 'letter-f', 'letter-h']],
      ['D is for dog! Find the letter D!', 'letter-d', ['letter-d', 'letter-c', 'letter-h']],
      ['F is for frog! Find the letter F!', 'letter-f', ['letter-f', 'letter-b', 'letter-c']],
      ['H is for hat! Find the letter H!', 'letter-h', ['letter-h', 'letter-d', 'letter-f']],
    ],
  },
  'lesson-letter-names-2': {
    set: 'letter-tiles-set', primary: 'letter-names', fallback: 'lesson-letter-names-1', fbp: 'letter-tiles-set',
    steps: [
      ['S is for spoon! Find the letter S!', 'letter-s', ['letter-s', 'letter-p', 'letter-g']],
      ['P is for pig! Find the letter P!', 'letter-p', ['letter-p', 'letter-w', 'letter-l']],
      ['G is for garden! Find the letter G!', 'letter-g', ['letter-g', 'letter-s', 'letter-l']],
      ['L is for leaf! Find the letter L!', 'letter-l', ['letter-l', 'letter-p', 'letter-w']],
      ['W is for wig! Find the letter W!', 'letter-w', ['letter-w', 'letter-g', 'letter-s']],
    ],
  },
  'lesson-first-letter-sounds': {
    set: 'letter-tiles-set', primary: 'letter-sounds', fallback: 'lesson-letter-names-2', fbp: 'letter-tiles-set',
    steps: [
      ["Ball starts with 'buh'! Tap the letter that makes 'buh'!", 'letter-b', ['letter-b', 'letter-d', 'letter-f']],
      ["Cat starts with 'kuh'! Tap the letter that makes 'kuh'!", 'letter-c', ['letter-c', 'letter-b', 'letter-s']],
      ["Frog starts with 'fuh'! Tap the letter that makes 'fuh'!", 'letter-f', ['letter-f', 'letter-c', 'letter-d']],
      ["Book starts with 'buh'! Tap the letter that makes 'buh'!", 'letter-b', ['letter-b', 'letter-f', 'letter-s']],
      ["Cup starts with 'kuh'! Tap the letter that makes 'kuh'!", 'letter-c', ['letter-c', 'letter-d', 'letter-g']],
    ],
  },
  'lesson-animal-words': {
    set: 'animal-words-set', primary: 'animal-words', fallback: 'lesson-first-letter-sounds', fbp: 'letter-tiles-set',
    steps: [
      ['Find the cat!', 'cat', ['cat', 'dog', 'bear']],
      ['Find the dog!', 'dog', ['dog', 'cat', 'frog']],
      ['Find the duck!', 'duck', ['duck', 'cat', 'dog']],
      ['Find the frog!', 'frog', ['frog', 'dog', 'bear']],
      ['Find the cow!', 'cow', ['cow', 'frog', 'cat']],
    ],
  },
};
report('exactly the 4 Wave 5 lessons exist', Object.keys(W5).every((id) => lessonById(id)) && lessons.filter((l) => W5[l.id]).length === 4);
report('20 Wave 5 steps total', Object.keys(W5).reduce((n, id) => n + (lessonById(id)?.steps.length ?? 0), 0) === 20);

let verbatim = true;
let verbatimDetail = '';
for (const [id, spec] of Object.entries(W5)) {
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
report('every Wave 5 step prompt/target/choices match this prompt verbatim (exactly one correct)', verbatim, verbatimDetail);

// letter discipline: L1/L2/L3 choices are letter tiles only (no word picture among choices)
const letterTileIds = new Set(sets.find((s) => s.id === 'letter-tiles-set').items.map((i) => i.item_id));
let letterOnly = true;
for (const id of ['lesson-letter-names-1', 'lesson-letter-names-2', 'lesson-first-letter-sounds']) {
  for (const step of lessonById(id).steps) {
    if (!step.choice_item_ids.every((c) => letterTileIds.has(c))) { letterOnly = false; break; }
  }
}
report('L1/L2/L3 choices are letter tiles ONLY (no word picture among choices)', letterOnly);

// ================= 2. per-step evidence =================
let evidenceOk = true;
let evidenceDetail = '';
for (const [id, spec] of Object.entries(W5)) {
  const lesson = lessonById(id);
  const expectedSkill = { 'lesson-letter-names-1': 'letter-names', 'lesson-letter-names-2': 'letter-names', 'lesson-first-letter-sounds': 'letter-sounds', 'lesson-animal-words': 'animal-words' }[id];
  for (const step of lesson.steps) {
    if (step.evidence_participation !== undefined) { evidenceOk = false; evidenceDetail = `${id} participation`; break; }
    if (JSON.stringify(step.evidence_skill_ids) !== JSON.stringify([expectedSkill])) { evidenceOk = false; evidenceDetail = `${id} step ${step.step_index} evidence`; break; }
  }
  if (!evidenceOk) break;
}
report('per-step evidence exact ([letter-names]/[letter-sounds]/[animal-words]); no participation flag', evidenceOk, evidenceDetail);

// ================= 3. finale target/tiles =================
const FINALE = {
  'lesson-letter-names-1': { target: 'letter-h', tiles: ['letter-h', 'letter-d', 'letter-f'] },
  'lesson-letter-names-2': { target: 'letter-w', tiles: ['letter-w', 'letter-g', 'letter-s'] },
  'lesson-first-letter-sounds': { target: 'letter-c', tiles: ['letter-c', 'letter-d', 'letter-g'] },
  'lesson-animal-words': { target: 'cow', tiles: ['cow', 'frog', 'cat'] },
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
report('every Wave 5 finale target == step-5 target; every tile appears in its lesson steps', finaleOk, finaleDetail);

// ================= 4. fallback chain =================
const chain = ['lesson-first-sounds', 'lesson-letter-names-1', 'lesson-letter-names-2', 'lesson-first-letter-sounds', 'lesson-animal-words'];
let chainOk = true;
for (let i = 1; i < chain.length; i++) if (lessonById(chain[i])?.fallback_lesson_id !== chain[i - 1]) { chainOk = false; break; }
report('fallbacks resolve in queue order: first-sounds -> letter-names-1 -> letter-names-2 -> first-letter-sounds -> animal-words', chainOk);

// ================= 5. skill graph =================
report('which-starts-with next = [notice-with-choices, letter-names] (branch; notice path still reachable)', JSON.stringify(skillById('which-starts-with')?.next_skills) === JSON.stringify(['notice-with-choices', 'letter-names']));
report('all 3 new skills exist, domain language', ['letter-names', 'letter-sounds', 'animal-words'].every((id) => skillById(id)?.domain === 'language'));
report('letter-names next = [letter-sounds]; letter-sounds next = [] (animal-words gained the W8 food-words edge)', JSON.stringify(skillById('letter-names')?.next_skills) === JSON.stringify(['letter-sounds']) && JSON.stringify(skillById('letter-sounds')?.next_skills) === JSON.stringify([]));
report('animal-words prerequisite is the point-to-choice FALLBACK (cross-pack rejected)', JSON.stringify(skillById('animal-words')?.prerequisites) === JSON.stringify(['point-to-choice']));
report('everyday-object-words NOT referenced by any Pack 2 record (fallback used, no dangling dep)', !JSON.stringify(skills).includes('everyday-object-words'));

// ================= 6. 48 voice + 12 images resolve; sha256 matches zip + manifest =================
const SNAKES = ['letter_names_1', 'letter_names_2', 'first_letter_sounds', 'animal_words'];
const voiceRefs = [];
for (const s of SNAKES) {
  for (let n = 1; n <= 5; n++) { voiceRefs.push(`lesson.${s}.step_${n}.prompt`); voiceRefs.push(`lesson.${s}.step_${n}.celebration`); }
  voiceRefs.push(`lesson.${s}.closing_win`, `lesson.${s}.find_prompt`);
}
const unresolvedVoice = voiceRefs.filter((r) => !voiceResolves(r));
report('all 48 Wave 5 voice refs resolve through the loader to real files', unresolvedVoice.length === 0, unresolvedVoice.join(', '));
const imgAssets = ['assets/letter-b.jpg', 'assets/letter-c.jpg', 'assets/letter-d.jpg', 'assets/letter-f.jpg', 'assets/letter-h.jpg', 'assets/letter-s.jpg', 'assets/letter-p.jpg', 'assets/letter-g.jpg', 'assets/letter-l.jpg', 'assets/letter-w.jpg', 'assets/duck.jpg', 'assets/cow.jpg'];
report('all 12 Wave 5 images resolve through the asset registry', imgAssets.every((a) => assetResolves(a)));

const RAW_SHA = {
  "images/cow.jpg": "94ea25beb329a7a120e5bd0c1b4dfe5919d5bf1321ae100f2af3b7a6ae559a14",
  "images/duck.jpg": "53796f56b49e379faa4809391c94ed0171537ed2a4a21b46a74428199b91d6c4",
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
  "voice/lesson-animal-words_n01.mp3": "84228e39c96bb20de948ca3ee33ef2357b119c75306eb1cc29f96e0873196aec",
  "voice/lesson-animal-words_n02.mp3": "fa9da2183bb0ba1ef4dbc89d571d7b8510d51f1ab9cddb02e36a5228d30e9d68",
  "voice/lesson-animal-words_n03.mp3": "41eaa2161515af4cc2c253a7aec4cbb20bdf98784b30de3cb79b7066e668eb1f",
  "voice/lesson-animal-words_n04.mp3": "73bf3b36d9e1417ca05a944183d58a773cc27ec08289fbc229bc7ae360bf240c",
  "voice/lesson-animal-words_n05.mp3": "a7b93a80112c5c3d6caf9945300e550787d80f17b41bc1f1bb276c3b222533de",
  "voice/lesson-animal-words_n06.mp3": "b7d2bbe40c4c5096ae993026693deaa79a549d3a208c2f4e77bd728097f1de7f",
  "voice/lesson-animal-words_n07.mp3": "317af21c38f96d8be1d7f5819f6cbe14799a0a1f36d13c59d513a22a7c5e3a92",
  "voice/lesson-animal-words_n08.mp3": "6fc4d47958aa94fcfcf288b118976345d4b378173c5c4348d68c9dfeeee65895",
  "voice/lesson-animal-words_n09.mp3": "9cfb5a9b74e21ad0d8aec18e923ad30fc1795a61d3b0ff154e3ac3aa2efe033e",
  "voice/lesson-animal-words_n10.mp3": "d1a3b7c1d3fd54e59c26dea1e0203efebbfc823921eb84b58f4b30cfe3786563",
  "voice/lesson-animal-words_n11.mp3": "65d964bbe83ae62235d085774337b5315be21693fb801a071102c74e432a8e3c",
  "voice/lesson-animal-words_n12.mp3": "69b994f300e49957f02c71a6d41fbfaf53fba1f73d41f849c76eb618fed8241d",
  "voice/lesson-first-letter-sounds_n01.mp3": "52c9d30851924cb36a2d3f63d979d7a16971b793bb08fb6eccce06d7ac6622d4",
  "voice/lesson-first-letter-sounds_n02.mp3": "976c52d7f30c613df0af06570e22458e7fbdd22926f94cb30cace30d64f21321",
  "voice/lesson-first-letter-sounds_n03.mp3": "4634b49337e383253ce3fe53c15591b8bd25445dc0b2a63d561f19bca8072f7d",
  "voice/lesson-first-letter-sounds_n04.mp3": "dd3af916d31ba519077a1049e6b099dcd73f0ec5359249a19dbb39c9edb23dbb",
  "voice/lesson-first-letter-sounds_n05.mp3": "d6aa5df6c07e1f94731484cda1e3bd937342905c22538a9853c7a87e817e3c78",
  "voice/lesson-first-letter-sounds_n06.mp3": "1f38c9bb1cfd1cf5a211707a2707a78e16335dd80d7dc9524d00b6fc5d9128a9",
  "voice/lesson-first-letter-sounds_n07.mp3": "c887c8849d7121359486aba4becb0fe66fca87a527192f538c890c374cb1ab31",
  "voice/lesson-first-letter-sounds_n08.mp3": "e5c7e9445c120e686a254ba73747874511ef09a99c45d071d49194313c90313b",
  "voice/lesson-first-letter-sounds_n09.mp3": "2b3d337e2b89b1095f7fc803d1b31d6c209fb84e2e38c54396708987c5c9edc7",
  "voice/lesson-first-letter-sounds_n10.mp3": "3346651f83dc3de45531ae0da290035a0afd48a68c693cd715427480720d548e",
  "voice/lesson-first-letter-sounds_n11.mp3": "655b7d280ef909d96398e23466346f68bf32ae29e3b34ff42d60fced762fb393",
  "voice/lesson-first-letter-sounds_n12.mp3": "b2226fcfcb28485066b09a586a76003737c3264f5c891647a21306191f341dd6",
  "voice/lesson-letter-names-1_n01.mp3": "6ef2eea85c535a6412f610d8321a911a5feec212716f2b71db79fe5bd2d84cd3",
  "voice/lesson-letter-names-1_n02.mp3": "ce9f649f6f6f3d48f64c0eca7a771a56108393db0da80e495ba1fb55341dc3fa",
  "voice/lesson-letter-names-1_n03.mp3": "5ed9f13762a3091cb9b2947750bc272ec35b77fcbf9f85322a8574e40b839f0d",
  "voice/lesson-letter-names-1_n04.mp3": "cfb1f585baa8e954d8e8b657c5b96cbae683079cfef2dc8e4247a2b53238012b",
  "voice/lesson-letter-names-1_n05.mp3": "0517ab1453a8856bb4407f53bdf2eb2c258fc6ba4cd5742ce77e6d7ba47dcddf",
  "voice/lesson-letter-names-1_n06.mp3": "4eb29e1da9986a76d9b0965ec32321534b5e6199346ffbe17ea241c04e3d7abc",
  "voice/lesson-letter-names-1_n07.mp3": "124150df1125b73e221404ce909a4ac16ad6995a1cf881e52b3dda230e6af044",
  "voice/lesson-letter-names-1_n08.mp3": "28361b96dfa42096140244a318cc0f046a5052855ac89a33c3e85576889d6e33",
  "voice/lesson-letter-names-1_n09.mp3": "6b010038f6ed5ab12adfc6041e4d82a2780be6ec2dd686318a96047e045b7a7d",
  "voice/lesson-letter-names-1_n10.mp3": "dc7c741bc5ffb83a7bbdc2983a6547d74c1104a8a00337fd957a34356c8542cc",
  "voice/lesson-letter-names-1_n11.mp3": "c0f0257480568e01d369679a9bd935baa93456b45d866174292e7357dec5e718",
  "voice/lesson-letter-names-1_n12.mp3": "c3f529bd67c739fb536ac482715315329f1543cc8b175638688e3c3dff07b412",
  "voice/lesson-letter-names-2_n01.mp3": "b07dc4a56b22ac0310e7d6993549d93312aac7ccf479bee5ab9c93da95355790",
  "voice/lesson-letter-names-2_n02.mp3": "e85266a97b7be1da4227dfd1ec288133ccadae44a935e25a77077c2da76581a7",
  "voice/lesson-letter-names-2_n03.mp3": "b5d82440c5c57c3a9fcc0da9395b27c894e2d2f06f9d5ab3afc61a63ed097300",
  "voice/lesson-letter-names-2_n04.mp3": "683c245970b2055e6c40244dc4d9808e69892ad6c7f5c318cf43a7a8d2cb44e5",
  "voice/lesson-letter-names-2_n05.mp3": "4fdbad5617169c99037d856c098df805ce61f89ae16530d6a65d2e42cdd7d647",
  "voice/lesson-letter-names-2_n06.mp3": "325cc1e4164c2c0fc24f03b44e1f2d903877504a12ec0815b3c23254cc6ea679",
  "voice/lesson-letter-names-2_n07.mp3": "20428a329bc58951c279da61ba0c48601d432488db46eddd1baaf4c7580eeb52",
  "voice/lesson-letter-names-2_n08.mp3": "f13b75dd2ac572432432fa473803e1f10a48a8f34de1ccee03e5f9eed492b989",
  "voice/lesson-letter-names-2_n09.mp3": "53bd66e4592bb79f9e1fd04edc576835ff0b5d84c13292061ec01150b5b91af3",
  "voice/lesson-letter-names-2_n10.mp3": "3fcbe11d86977757de380d8d128162b67e082ab0ada63f4969eac1531402998f",
  "voice/lesson-letter-names-2_n11.mp3": "be44e836b23d2b6d4775ddaa90c6cc5d54a6a08116153b5f45389aa12ee3586d",
  "voice/lesson-letter-names-2_n12.mp3": "c6a2f5e069800e60b980d95351904081c9f783f460e290dabcc6fdb45a91dadf"
};
const zipVoice = { letter_names_1: 'lesson-letter-names-1', letter_names_2: 'lesson-letter-names-2', first_letter_sounds: 'lesson-first-letter-sounds', animal_words: 'lesson-animal-words' };
const zipImg = { 'assets/letter-b.jpg': 'images/letter-B.jpg', 'assets/letter-c.jpg': 'images/letter-C.jpg', 'assets/letter-d.jpg': 'images/letter-D.jpg', 'assets/letter-f.jpg': 'images/letter-F.jpg', 'assets/letter-h.jpg': 'images/letter-H.jpg', 'assets/letter-s.jpg': 'images/letter-S.jpg', 'assets/letter-p.jpg': 'images/letter-P.jpg', 'assets/letter-g.jpg': 'images/letter-G.jpg', 'assets/letter-l.jpg': 'images/letter-L.jpg', 'assets/letter-w.jpg': 'images/letter-W.jpg', 'assets/duck.jpg': 'images/duck.jpg', 'assets/cow.jpg': 'images/cow.jpg' };
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
report('all 60 Wave 5 assets: raw sha256 matches the zip manifests AND manifest.file_hashes matches validator scheme', shaOk, shaDetail);

// ================= 7. sets =================
const lt = sets.find((s) => s.id === 'letter-tiles-set');
report('letter-tiles-set holds exactly its 10 items', JSON.stringify(lt?.items.map((i) => i.item_id)) === JSON.stringify(['letter-b', 'letter-c', 'letter-d', 'letter-f', 'letter-h', 'letter-s', 'letter-p', 'letter-g', 'letter-l', 'letter-w']));
const aw = sets.find((s) => s.id === 'animal-words-set');
report('animal-words-set holds exactly its 6 items (2 new + 4 reuse)', JSON.stringify(aw?.items.map((i) => i.item_id)) === JSON.stringify(['duck', 'cow', 'cat', 'dog', 'frog', 'bear']));
report('animal-words-set reuse items copied verbatim (cat/dog/frog/bear)', ['cat', 'dog', 'frog', 'bear'].every((id) => {
  const a = aw.items.find((i) => i.item_id === id);
  const b = sets.find((s) => s.id === 'first-sounds-set').items.find((i) => i.item_id === id);
  return a.asset_path === b.asset_path && a.asset_sha256 === b.asset_sha256;
}));
report('pig/fox absent from the bank and from Pack 2 assets', !JSON.stringify(sets).includes('"pig"') && !JSON.stringify(sets).includes('"fox"') && !exists(P2 + 'assets/pig.jpg') && !exists(P2 + 'assets/fox.jpg'));

// ================= 8. no L3 line speaks a letter name =================
const l3 = ['lesson.first_letter_sounds.step_1.prompt', 'lesson.first_letter_sounds.step_2.prompt', 'lesson.first_letter_sounds.step_3.prompt', 'lesson.first_letter_sounds.step_4.prompt', 'lesson.first_letter_sounds.step_5.prompt', 'lesson.first_letter_sounds.step_1.celebration', 'lesson.first_letter_sounds.step_2.celebration', 'lesson.first_letter_sounds.step_3.celebration', 'lesson.first_letter_sounds.step_4.celebration', 'lesson.first_letter_sounds.step_5.celebration', 'lesson.first_letter_sounds.closing_win', 'lesson.first_letter_sounds.find_prompt'];
const l3Texts = l3.map((k) => strings[k]);
report('no L3 line speaks a letter name (no standalone uppercase letter token)', l3Texts.every((t) => t && !/\b[A-Z]\b/.test(t)), l3Texts.find((t) => /\b[A-Z]\b/.test(t)) || '');
report("L3 lines use the sounds only ('buh', 'kuh', 'fuh')", l3Texts.every((t) => /buh|kuh|fuh/.test(t)));

// ================= 9. pre-existing steps unchanged =================
const w5Ids = Object.keys(W5);
// Pre-Wave-5 lessons, pinned explicitly so this snapshot stays wave-relative.
const PRE_W5_LESSON_IDS = ['lesson-point-to','lesson-sort-by-kind','lesson-words-that-sound-the-same','lesson-finish-the-rhyme','lesson-clap-the-beats','lesson-first-sounds','lesson-name-it-together','lesson-see-how-many','lesson-give-one','lesson-give-two','lesson-give-three','lesson-give-just-right','lesson-copy-the-pattern','lesson-sort-by-colour','lesson-what-do-you-see','lesson-give-four','lesson-how-many','lesson-more-or-less','lesson-shape-names','lesson-copy-abc-pattern'];
const preLessons = PRE_W5_LESSON_IDS.map((id) => lessonById(id)).filter(Boolean);
const preHash = crypto.createHash('sha256').update(JSON.stringify(preLessons.map((x) => ({ id: x.id, steps: x.steps })))).digest('hex');
report('all pre-existing steps byte-unchanged (98 steps at HEAD ed33e3d; snapshot hash)', preHash === '5f85958ee51802bcc824feb509708f822b60a4407ebe7f695eefb2cdf3d4fa53', preHash);
report('pre-existing step count is 98 (verified from the repo)', preLessons.reduce((n, l) => n + l.steps.length, 0) === 98);

// ================= 10. FinaleNarrator mounts unchanged =================
const tabletStart = sessionSrc.indexOf('if (isTablet) {');
const phoneStart = sessionSrc.indexOf('\n  return (\n    <SafeAreaView style={styles.safe}', tabletStart);
const countMounts = (s) => (s.match(/<FinaleNarrator\b/g) || []).length;
report('FinaleNarrator mounts unchanged from Wave 4 (tablet = 1, phone = 1)', countMounts(sessionSrc.slice(tabletStart, phoneStart)) === 1 && countMounts(sessionSrc.slice(phoneStart)) === 1, `tablet=${countMounts(sessionSrc.slice(tabletStart, phoneStart))} phone=${countMounts(sessionSrc.slice(phoneStart))}`);

// ================= 11. all FINALE_CONFIG findPromptRefs resolve (owning pack) =================
const pack2LessonIds = new Set(lessons.map((l) => l.id));
const pack1Strings = readJson('packs/sunny-home-garden/strings.json').locales['en-US'];
const pack1VoiceBlock = sliceBetween(loaderSrc, '"sunny-home-garden": {', '"sunny-home-garden-2": {');
const pack1VoiceResolves = (key) => {
  const rel = importPathFor(identFor(pack1VoiceBlock, key));
  return Boolean(rel && exists(rel));
};
const badRefs = [];
for (const e of finaleEntries) {
  if (pack2LessonIds.has(e.id)) { if (!(e.ref in strings) || !voiceResolves(e.ref)) badRefs.push(`${e.ref}(pack2)`); }
  else if (!(e.ref in pack1Strings) || !pack1VoiceResolves(e.ref)) badRefs.push(`${e.ref}(pack1)`);
}
report(`all ${finaleEntries.length} FINALE_CONFIG findPromptRefs resolve under their owning pack (>= 28)`, finaleEntries.length >= 28 && badRefs.length === 0, `count=${finaleEntries.length} bad=${badRefs.join(', ')}`);

console.log(`\n${failures === 0 ? 'ALL WAVE 5 WIRING CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
