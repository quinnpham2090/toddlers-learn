/**
 * notice-with-choices title_ref fix drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the one-line fix in lib/path-graph.js: the notice-with-choices node now
 * points title_ref at the already-shipped Pack 2 string
 * "skill.notice_with_choices.title", resolved exactly the way the parent map
 * resolves a node title (lib/adventure-map.ts: node.title_ref -> getString()).
 *
 * Also proves NO other node's title_ref changed, by diffing the live node list
 * against a frozen snapshot of every node's title_ref taken from HEAD before the
 * fix (only notice-with-choices may differ).
 */

import fs from 'node:fs';
import path from 'node:path';
import { PATH_GRAPH } from '../lib/path-graph.js';

const root = process.cwd();
let failures = 0;
function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const P2 = 'packs/sunny-home-garden-2/';
const pointer = JSON.parse(fs.readFileSync(path.join(root, 'packs/active.json'), 'utf8'));
const strings = JSON.parse(fs.readFileSync(path.join(root, P2 + 'strings.json'), 'utf8')).locales['en-US'];
const nodeById = new Map(PATH_GRAPH.map((n) => [n.id, n]));

// The parent map resolves a node title via `node.title_ref` and getString(ref),
// which is `table[ref] ?? ref` against the ACTIVE pack's default locale.
const resolveTitle = (node) => (node?.title_ref ? strings[node.title_ref] ?? node.title_ref : null);

// ---- snapshot of every node's title_ref at HEAD *before* the fix ----
const TITLE_REF_SNAPSHOT = {
  'point-to': 'adventure.skill.point_to.title',
  'point-to-choice': null,
  'name-with-grown-up': 'adventure.skill.name_with_grown_up.title',
  'name-with-grown-up-choice': null,
  'find-the-rhyme': 'adventure.skill.find_the_rhyme.title',
  'rhyme-listening': null,
  'rhyme-production': null,
  'which-starts-with': 'adventure.skill.which_starts_with.title',
  'onset-rime-prep': null,
  'initial-sound-matching': null,
  'colour-naming': 'skill.colour_naming.title',
  'sort-by-one-rule': 'adventure.skill.sort_by_one_rule.title',
  'sort-by-colour': null,
  'give-n': 'adventure.skill.give_n.title',
  'give-1': null,
  'give-2': null,
  'give-3': null,
  subitize: 'adventure.skill.subitize.title',
  'number-symbols': null,
  'what-comes-next': 'adventure.skill.what_comes_next.title',
  'pattern-copy': null,
  'pattern-extension': null,
  'sizes-big-little': 'skill.sizes_big_little.title',
  'clap-the-beats': 'adventure.skill.clap_the_beats.title',
  'syllable-clapping': null,
  'beat-patterns': null,
  'what-do-you-see': 'adventure.skill.what_do_you_see.title',
  'notice-with-choices': null, // the ONLY node this run changes (null -> skill.notice_with_choices.title)
  'what-will-happen-if': 'adventure.skill.what_will_happen_if.title',
};

// ---- 1. the node exists and is the one this run fixed ----
const node = nodeById.get('notice-with-choices');
report('notice-with-choices node exists', Boolean(node));
report('active pack is sunny-home-garden-2 (string source)', pointer.active_pack_id === 'sunny-home-garden-2');
report(
  'title_ref is skill.notice_with_choices.title',
  node?.title_ref === 'skill.notice_with_choices.title',
  String(node?.title_ref)
);

// ---- 2. the title resolves to the shipped string (not null / fallback / id) ----
const resolved = resolveTitle(node);
report('resolved title is "Noticing with Choices"', resolved === 'Noticing with Choices', String(resolved));
report('resolved title is not null', resolved !== null);
report('resolved title is not the raw ref', resolved !== 'skill.notice_with_choices.title');
report('resolved title is not the node id', resolved !== 'notice-with-choices');
report(
  'the referenced string already exists in Pack 2 (no new copy invented)',
  Object.prototype.hasOwnProperty.call(strings, 'skill.notice_with_choices.title') &&
    strings['skill.notice_with_choices.title'] === 'Noticing with Choices'
);

// ---- 3. no other node changed; only notice-with-choices may differ ----
const changed = [];
const missing = [];
for (const [id, expected] of Object.entries(TITLE_REF_SNAPSHOT)) {
  const live = nodeById.get(id);
  if (!live) { missing.push(id); continue; }
  const actual = live.title_ref ?? null;
  if (id === 'notice-with-choices') {
    if (actual !== 'skill.notice_with_choices.title') changed.push(`${id}: ${JSON.stringify(actual)}`);
  } else if (actual !== expected) {
    changed.push(`${id}: ${JSON.stringify(expected)} -> ${JSON.stringify(actual)}`);
  }
}
report('no snapshot node disappeared', missing.length === 0, missing.join(', '));
report('every other node title_ref unchanged (only notice-with-choices differs)', changed.length === 0, changed.join(', '));
report(
  'node count unchanged from snapshot',
  PATH_GRAPH.length === Object.keys(TITLE_REF_SNAPSHOT).length,
  `${PATH_GRAPH.length} vs ${Object.keys(TITLE_REF_SNAPSHOT).length}`
);

console.log(`\n${failures === 0 ? 'ALL NOTICE-TITLE-FIX CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
