/**
 * L6 evidence drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the help-only evidence rule for lesson-name-it-together (L6) with the
 * REAL shared rule (lib/evidence-policy.js) fed through the REAL band logic
 * (lib/bands.js), mirroring the session write -> progress store -> path-queue
 * normalization chain.
 *
 * Two halves are required by the fix brief:
 *   1. L6 evidence at scaffold 0 AND 1 does NOT qualify (band capped at exploring).
 *   2. Pack 1 L4 evidence at scaffold 0 DOES still qualify (flag absent = old behavior).
 */

import fs from 'node:fs';
import path from 'node:path';
import { completedWithHelpFor } from '../lib/evidence-policy.js';
import { evaluateBands } from '../lib/bands.js';
import { PACK_SKILL_TO_PATH, PATH_GRAPH } from '../lib/path-graph.js';

const root = process.cwd();
let failures = 0;

function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

const skillMetaById = Object.fromEntries(
  PATH_GRAPH.map((node) => [
    node.id,
    { domain: node.domain, provisional: node.provisional, bandable: true },
  ])
);

// Mirrors the session write (app/session.tsx handleChoose/handleNext) and the
// path-queue lesson-evidence normalization (lib/path-queue.ts normalizeLessonEvidence).
function lessonRunEvidence(lesson, scaffoldLevel, { date, sessionId }) {
  const completedWithHelp = completedWithHelpFor(lesson, scaffoldLevel);
  const pathSkillId = PACK_SKILL_TO_PATH[lesson.primary_skill_id] ?? lesson.primary_skill_id;
  return {
    skill_id: pathSkillId,
    scaffold_level: scaffoldLevel,
    weight: completedWithHelp ? 'participation' : 'strong',
    completed_with_help: completedWithHelp,
    bandable: true,
    date,
    session_id: sessionId,
    format_key: `lesson:${lesson.primary_skill_id}`,
  };
}

function bandFor(lesson, scaffoldLevel, runs) {
  const events = [];
  for (let i = 0; i < runs; i += 1) {
    events.push(
      lessonRunEvidence(lesson, scaffoldLevel, {
        date: `2026-02-${String(1 + i).padStart(2, '0')}T10:00:00.000Z`,
        sessionId: `drill-${i + 1}`,
      })
    );
  }
  const result = evaluateBands(events, skillMetaById).skills[0];
  return { result, events };
}

// ---------- fixtures: the REAL records on disk ----------
const pack2Lessons = readJson('packs/sunny-home-garden-2/lessons.json');
const pack1Lessons = readJson('packs/sunny-home-garden/lessons.json');
const l6 = pack2Lessons.find((lesson) => lesson.id === 'lesson-name-it-together');
const l4 = pack1Lessons.find((lesson) => lesson.id === 'lesson-big-little');
const l6WithoutFlag = { ...l6 };
delete l6WithoutFlag.evidence_help_only;

// 0. The session really uses the shared rule the drill tests (no reasoning-only proof).
const sessionSource = fs.readFileSync(path.join(root, 'app/session.tsx'), 'utf8');
report(
  'session writes outcomes through the shared rule completedWithHelpFor',
  sessionSource.includes('completedWithHelpFor(lesson, scaffoldLevel)')
);

// 0b. Flag scope: L6 only, nothing in Pack 1, nothing else in Pack 2.
const flaggedPack2 = pack2Lessons.filter((lesson) => lesson.evidence_help_only === true).map((l) => l.id);
const flaggedPack1 = pack1Lessons.filter((lesson) => lesson.evidence_help_only === true).map((l) => l.id);
report(
  'evidence_help_only is set on lesson-name-it-together only',
  flaggedPack2.length === 1 && flaggedPack2[0] === 'lesson-name-it-together' && flaggedPack1.length === 0,
  `pack2=[${flaggedPack2.join(',')}] pack1=[${flaggedPack1.join(',')}]`
);

// ---------- half 1: L6 does NOT qualify (flag set) ----------
const l6Scaffold0 = bandFor(l6, 0, 5);
report(
  'L6 @ scaffold 0 (flag set) writes completed-with-help',
  l6Scaffold0.events.every((event) => event.completed_with_help === true && event.weight === 'participation')
);
report(
  'L6 @ scaffold 0 does NOT qualify',
  l6Scaffold0.result.qualifying_count === 0,
  `qualifying=${l6Scaffold0.result.qualifying_count} band=${l6Scaffold0.result.display_band}`
);

const l6Scaffold1 = bandFor(l6, 1, 5);
report(
  'L6 @ scaffold 1 does NOT qualify',
  l6Scaffold1.result.qualifying_count === 0,
  `qualifying=${l6Scaffold1.result.qualifying_count} band=${l6Scaffold1.result.display_band}`
);

// stress: many spaced L6 runs still cannot move the band past exploring
const l6Stress = bandFor(l6, 0, 12);
report(
  'L6 stress (12 spaced runs) stays capped at exploring',
  l6Stress.result.qualifying_count === 0 && l6Stress.result.display_band === 'exploring',
  `qualifying=${l6Stress.result.qualifying_count} band=${l6Stress.result.display_band}`
);

// ---------- half 2: Pack 1 L4 (flag absent) keeps old behavior ----------
const l4Scaffold0 = bandFor(l4, 0, 5);
report(
  'L4 @ scaffold 0 (flag absent) writes strong evidence',
  l4Scaffold0.events.every((event) => event.completed_with_help === false && event.weight === 'strong')
);
report(
  'L4 @ scaffold 0 still qualifies (old behavior intact)',
  l4Scaffold0.result.qualifying_count > 0,
  `qualifying=${l4Scaffold0.result.qualifying_count} band=${l4Scaffold0.result.display_band}`
);

// and qualifying evidence still moves a band when the rule is satisfied
const l4Confident = evaluateBands(
  [
    lessonRunEvidence(l4, 0, { date: '2026-02-01T10:00:00.000Z', sessionId: 'l4-s1' }),
    lessonRunEvidence(l4, 0, { date: '2026-02-02T10:00:00.000Z', sessionId: 'l4-s2' }),
    lessonRunEvidence(l4, 0, { date: '2026-02-03T10:00:00.000Z', sessionId: 'l4-s3' }),
  ].map((event, index) => ({ ...event, format_key: `lesson:${l4.primary_skill_id}:f${index + 1}` })),
  skillMetaById
).skills[0];
report(
  'L4 qualifying evidence still reaches confident across 3 spaced formats',
  l4Confident.display_band === 'confident',
  `band=${l4Confident.display_band} qualifying=${l4Confident.qualifying_count}`
);

// ---------- counterfactual: the flag is what closes the hole ----------
const holeCheck = bandFor(l6WithoutFlag, 0, 5);
report(
  'counterfactual: same lesson WITHOUT the flag would qualify (hole is real)',
  holeCheck.result.qualifying_count > 0,
  `qualifying=${holeCheck.result.qualifying_count} band=${holeCheck.result.display_band}`
);

if (failures > 0) {
  console.error(`\n=== L6 EVIDENCE DRILL FAILED (${failures}) ===`);
  process.exit(1);
}
console.log('\n=== L6 EVIDENCE DRILL PASSED ===');
