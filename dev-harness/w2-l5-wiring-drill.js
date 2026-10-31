/**
 * W2-L5 wiring drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the lesson-what-do-you-see wiring against the REAL live Pack 2 records,
 * the REAL validator hash scheme, and the REAL source files the runtime reads
 * (lib/pack-loader.ts voice + asset registries, app/session.tsx FINALE_CONFIG,
 * lib/path-graph.js science nodes). No mocks of the code under test.
 */

import fs from 'node:fs';
import path from 'node:path';
import { sha256Hex } from '../tools/validator.js';

const root = process.cwd();
let failures = 0;
function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const readText = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const P2 = 'packs/sunny-home-garden-2/';
const lessons = readJson(P2 + 'lessons.json');
const skills = readJson(P2 + 'skills.json');
const sets = readJson(P2 + 'picture_sets.json');
const strings = readJson(P2 + 'strings.json').locales['en-US'];
const manifest = readJson(P2 + 'manifest.json');
const loaderSrc = readText('lib/pack-loader.ts');
const sessionSrc = readText('app/session.tsx');
const graphSrc = readText('lib/path-graph.js');

const lesson = lessons.find((l) => l.id === 'lesson-what-do-you-see');
const set = sets.find((s) => s.id === 'what-do-you-see-set');
const skill = (id) => skills.find((s) => s.id === id);

// ---- helpers to read registries out of pack-loader.ts source ----
function sliceBetween(src, startMarker, endMarker) {
  const i = src.indexOf(startMarker);
  if (i < 0) return '';
  const j = src.indexOf(endMarker, i);
  return j < 0 ? src.slice(i) : src.slice(i, j);
}
// Pack 2 block (puff + moss voice registries) up to the asset registry const.
const pack2VoiceBlock = sliceBetween(loaderSrc, '"sunny-home-garden-2": {', 'const PACK_ASSET_REGISTRY');
// Pack 2 asset registry block (second occurrence of the pack key after the const).
const assetBlock = sliceBetween(loaderSrc, 'const PACK_ASSET_REGISTRY', 'let cachedOverride');
const pack2AssetBlock = sliceBetween(assetBlock, "'sunny-home-garden-2': {", 'let cachedOverride');

function registryIdent(block, key) {
  const re = new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:\\s*([A-Za-z0-9_]+)`);
  const m = block.match(re);
  return m ? m[1] : null;
}
function importPathFor(ident) {
  if (!ident) return null;
  const re = new RegExp(`import\\s+${ident}\\s+from\\s+'([^']+)'`);
  const m = loaderSrc.match(re);
  // Import specifiers are relative to lib/pack-loader.ts, not the repo root.
  return m ? path.join('lib', m[1]) : null;
}
function voiceResolves(key) {
  const ident = registryIdent(pack2VoiceBlock, key);
  const rel = importPathFor(ident);
  return Boolean(ident && rel && exists(rel));
}
function assetResolves(assetKey) {
  const ident = registryIdent(pack2AssetBlock, assetKey);
  const rel = importPathFor(ident);
  return Boolean(ident && rel && exists(rel));
}

// ---- 1. lesson resolves with the exact spec ----
report('lesson-what-do-you-see exists', Boolean(lesson));
report('primary skill notice-with-choices', lesson?.primary_skill_id === 'notice-with-choices');
report(
  'secondary skills [what-do-you-see, point-to-choice]',
  JSON.stringify(lesson?.secondary_skill_ids) === JSON.stringify(['what-do-you-see', 'point-to-choice'])
);
report('interaction_type tap_choice', lesson?.interaction_type === 'tap_choice');
report('character puff', lesson?.character_id === 'puff');
report('picture set is what-do-you-see-set', lesson?.picture_set_id === 'what-do-you-see-set');
report(
  'estimated/chunk minutes mirror lesson-first-sounds (5/5)',
  lesson?.estimated_minutes === 5 && lesson?.chunk_budget_minutes === 5
);
report('5 steps', lesson?.steps?.length === 5);
const expectedSteps = [
  { i: 1, target: 'red-flower', choices: ['red-flower', 'yellow-cup'], ev: ['notice-with-choices'] },
  { i: 2, target: 'book', choices: ['book', 'ball'], ev: ['what-do-you-see', 'point-to-choice'] },
  { i: 3, target: 'cup', choices: ['cup', 'book'], ev: ['notice-with-choices'] },
  { i: 4, target: 'green-leaf', choices: ['green-leaf', 'ball'], ev: ['what-do-you-see'] },
  { i: 5, target: 'book', choices: ['book', 'spoon'], ev: ['point-to-choice'] },
];
let stepsOk = true;
for (const e of expectedSteps) {
  const s = lesson?.steps?.find((x) => x.step_index === e.i);
  if (!s || s.target_item_id !== e.target) { stepsOk = false; break; }
  if (JSON.stringify(s.choice_item_ids) !== JSON.stringify(e.choices)) { stepsOk = false; break; }
  if (JSON.stringify(s.evidence_skill_ids) !== JSON.stringify(e.ev)) { stepsOk = false; break; }
  if ('evidence_participation' in s) { stepsOk = false; break; }
}
report('all 5 steps: target / choices / bandable evidence exact', stepsOk);
report(
  'scaffolds mirror lesson-first-sounds (L0-L3)',
  JSON.stringify(lesson?.scaffolds) ===
    JSON.stringify(lessons.find((l) => l.id === 'lesson-first-sounds')?.scaffolds)
);

// ---- 2. picture set: 7 items resolving to real, hash-matching files ----
report('what-do-you-see-set exists with 7 items', set?.items?.length === 7);
const expectedItems = ['red-flower', 'book', 'ball', 'cup', 'spoon', 'yellow-cup', 'green-leaf'];
report(
  'set items exact',
  JSON.stringify(set?.items?.map((i) => i.item_id)) === JSON.stringify(expectedItems)
);
let assetsOk = true;
let assetDetail = '';
for (const item of set?.items ?? []) {
  const abs = path.join(root, P2, item.asset_path);
  if (!fs.existsSync(abs)) { assetsOk = false; assetDetail = `missing ${item.asset_path}`; break; }
  const computed = sha256Hex(fs.readFileSync(abs, 'utf8'));
  if (computed !== item.asset_sha256) { assetsOk = false; assetDetail = `record mismatch ${item.asset_path}`; break; }
  if (manifest.file_hashes[item.asset_path] !== item.asset_sha256) {
    assetsOk = false; assetDetail = `manifest mismatch ${item.asset_path}`; break;
  }
}
report('all 7 items resolve to real files (record + manifest hash match)', assetsOk, assetDetail);
// the 2 Pack-1 copies are byte-identical to their Pack 1 source files
report(
  'yellow-cup.jpg / green-leaf.jpg byte-identical to Pack 1 sources',
  fs.readFileSync(path.join(root, P2, 'assets/yellow-cup.jpg')).equals(
    fs.readFileSync(path.join(root, 'packs/sunny-home-garden/assets/yellow-cup.jpg'))
  ) &&
    fs.readFileSync(path.join(root, P2, 'assets/green-leaf.jpg')).equals(
      fs.readFileSync(path.join(root, 'packs/sunny-home-garden/assets/green-leaf.jpg'))
    )
);

// ---- 3. all 16 voice refs resolve through the loader registry to real files ----
const voiceRefs = [
  ...expectedSteps.map((s) => `lesson.what_do_you_see.step_${s.i}.prompt`),
  ...expectedSteps.map((s) => `lesson.what_do_you_see.step_${s.i}.celebration`),
  'lesson.what_do_you_see.closing_win',
  'lesson.what_do_you_see.find_prompt',
  'item.green_leaf.label',
  'item.red_flower.label',
  'item.book.label',
  'item.cup.label',
];
const unresolved = voiceRefs.filter((k) => !voiceResolves(k));
report('all 16 voice refs resolve (registry -> real file)', unresolved.length === 0, unresolved.join(', '));

// ---- 4. every string ref used by the lesson / skills / set / items resolves ----
const stringRefs = [
  lesson?.title_ref,
  lesson?.closing_win_ref,
  ...expectedSteps.flatMap((s) => [`lesson.what_do_you_see.step_${s.i}.prompt`, `lesson.what_do_you_see.step_${s.i}.celebration`]),
  skill('notice-with-choices')?.title_ref,
  skill('notice-with-choices')?.description_ref,
  skill('what-do-you-see')?.title_ref,
  skill('what-do-you-see')?.description_ref,
  set?.title_ref,
  set?.alt_text_parent_ref,
  ...(set?.items ?? []).flatMap((i) => [i.label_ref, i.alt_text_parent_ref]),
];
const missingStrings = [...new Set(stringRefs.filter(Boolean))].filter((r) => !(r in strings));
report('every lesson/skill/set/item string ref resolves in en-US', missingStrings.length === 0, missingStrings.join(', '));
report(
  'new item labels verbatim',
  strings['item.yellow_cup.label'] === 'Yellow cup!' && strings['item.green_leaf.label'] === 'Green leaf!'
);
report(
  'both new skill refs + point-to-choice resolve',
  Boolean(skill('notice-with-choices')) && Boolean(skill('what-do-you-see')) && Boolean(skill('point-to-choice'))
);

// ---- 5. FINALE_CONFIG entry exact, target resolves to step 4, tiles in steps ----
const finaleMatch = sessionSrc.match(
  /'lesson-what-do-you-see':\s*\{\s*targetItemId:\s*'([^']+)',\s*tileItemIds:\s*\[([^\]]*)\],\s*findPromptRef:\s*'([^']+)',\s*\}/
);
const finaleTarget = finaleMatch?.[1];
const finaleTiles = finaleMatch?.[2].split(',').map((t) => t.trim().replace(/'/g, '')).filter(Boolean);
const finalePromptRef = finaleMatch?.[3];
report('FINALE_CONFIG entry present', Boolean(finaleMatch));
report('finale targetItemId is green-leaf', finaleTarget === 'green-leaf', String(finaleTarget));
report(
  'finale tileItemIds [green-leaf, book, cup]',
  JSON.stringify(finaleTiles) === JSON.stringify(['green-leaf', 'book', 'cup']),
  finaleTiles.join(',')
);
report('finale findPromptRef lesson.what_do_you_see.find_prompt', finalePromptRef === 'lesson.what_do_you_see.find_prompt');
const finaleStep = lesson?.steps?.find((s) => s.target_item_id === finaleTarget);
report('finale target resolves to step 4 via the finaleStep lookup', finaleStep?.step_index === 4);
const tilesInSteps = finaleTiles.every((t) =>
  (lesson?.steps ?? []).some((s) => s.target_item_id === t || (s.choice_item_ids ?? []).includes(t))
);
report('all three finale tiles appear in the lesson steps', tilesInSteps);
report(
  'finale find-prompt string + voice resolve',
  finalePromptRef in strings && voiceResolves(finalePromptRef)
);

// ---- 6. fallback chain L4 -> L5 -> L6 ----
report(
  'lesson-first-sounds.fallback unchanged (lesson-clap-the-beats)',
  lessons.find((l) => l.id === 'lesson-first-sounds')?.fallback_lesson_id === 'lesson-clap-the-beats'
);
report('L5 falls back to L4 (lesson-first-sounds)', lesson?.fallback_lesson_id === 'lesson-first-sounds');
report('L5 fallback_picture_id first-sounds-set', lesson?.fallback_picture_id === 'first-sounds-set');
report(
  'L6 falls back to L5 (lesson-what-do-you-see)',
  lessons.find((l) => l.id === 'lesson-name-it-together')?.fallback_lesson_id === 'lesson-what-do-you-see'
);

// ---- 7. temp entries gone ----
report(
  'onset-rime-prep.next_skills temp entry gone',
  JSON.stringify(skill('onset-rime-prep')?.next_skills) === JSON.stringify(['initial-sound-matching'])
);
report(
  'initial-sound-matching.next_skills temp entry gone',
  JSON.stringify(skill('initial-sound-matching')?.next_skills) === JSON.stringify(['which-starts-with'])
);
report(
  'which-starts-with.next_skills restored to notice-with-choices',
  JSON.stringify(skill('which-starts-with')?.next_skills) === JSON.stringify(['notice-with-choices'])
);
report('manifest temp-patch notes revoked', !/TEMPORARY/.test(manifest.notes_author));

// ---- 8. both new skills domain science; pack_sha256 / version / status unchanged ----
report('notice-with-choices domain science', skill('notice-with-choices')?.domain === 'science');
report('what-do-you-see domain science', skill('what-do-you-see')?.domain === 'science');
report(
  'pack_sha256 unchanged (left exactly as-is)',
  manifest.pack_sha256 === '93e65df5368a3bf0fa6f20e79fb495dfd959972c05511870c61156048ade431a'
);
report('manifest version 0.1.0 / status draft', manifest.version === '0.1.0' && manifest.status === 'draft');

// ---- 9. both path nodes still provisional: true, untouched ----
function graphNode(id) {
  const re = new RegExp(`\\{\\s*id:\\s*'${id}',[\\s\\S]*?\\n  \\}`);
  const m = graphSrc.match(re);
  return m ? m[0] : '';
}
const wdys = graphNode('what-do-you-see');
const nwc = graphNode('notice-with-choices');
report(
  'path node what-do-you-see science + provisional + no lesson wiring',
  /domain:\s*'science'/.test(wdys) &&
    /provisional:\s*true/.test(wdys) &&
    /lesson_skill_ids:\s*\[\]/.test(wdys) &&
    /playable_lesson_skill_id:\s*null/.test(wdys)
);
report(
  'path node notice-with-choices science + provisional + no lesson wiring',
  /domain:\s*'science'/.test(nwc) &&
    /provisional:\s*true/.test(nwc) &&
    /lesson_skill_ids:\s*\[\]/.test(nwc) &&
    /playable_lesson_skill_id:\s*null/.test(nwc)
);

// ---- 10. parent-map wording placed ----
report(
  'parent-map next-up wording placed (adventure.skill.what_do_you_see.title)',
  strings['adventure.skill.what_do_you_see.title'] === 'Noticing and pointing to things you see'
);

console.log(`\n${failures === 0 ? 'ALL W2-L5 WIRING CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
