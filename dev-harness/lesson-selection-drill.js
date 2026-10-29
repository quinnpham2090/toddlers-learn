/**
 * Lesson-selection drill — DEV ONLY (Node), never runs in the app.
 *
 * Proves the lesson-advancement rule with the REAL shared selection function
 * (lib/lesson-selection.js), against the actual Pack 1 records. Journey order
 * is re-derived here with the same entry-skill BFS the loader uses.
 */

import fs from 'node:fs';
import path from 'node:path';
import { selectNextLesson } from '../lib/lesson-selection.js';

const root = process.cwd();
let failures = 0;

function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function journeyOrder(skills) {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const visited = new Set();
  const order = [];
  const queue = skills.filter((s) => s.is_entry_skill).map((s) => s.id);
  while (queue.length > 0) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const skill = byId.get(id);
    if (!skill) continue;
    order.push(skill);
    for (const nextId of skill.next_skills) queue.push(nextId);
  }
  for (const skill of skills) {
    if (!visited.has(skill.id)) order.push(skill);
  }
  return order;
}

const sunnySkills = readJson('packs/sunny-home-garden/skills.json');
const sunnyLessons = readJson('packs/sunny-home-garden/lessons.json');
const getSunnyLessonById = (id) => sunnyLessons.find((l) => l.id === id);
const journey = journeyOrder(sunnySkills);

const expectedJourney = [
  'everyday-object-words',
  'colour-naming',
  'sorting-one-rule',
  'sizes-big-little',
];
report(
  'Journey (hub stop) order is the four-skill chain',
  JSON.stringify(journey.map((s) => s.id)) === JSON.stringify(expectedJourney),
  journey.map((s) => s.id).join(', ')
);

const cases = [
  { completed: [], expected: 'lesson-hello-cup', label: 'no evidence -> lesson 1' },
  { completed: ['everyday-object-words'], expected: 'lesson-red-flower-yellow-flower', label: 'lesson 1 evidence -> lesson 2' },
  { completed: ['everyday-object-words', 'colour-naming'], expected: 'lesson-where-does-this-go', label: 'lessons 1+2 evidence -> lesson 3' },
  { completed: ['everyday-object-words', 'colour-naming', 'sorting-one-rule'], expected: 'lesson-big-little', label: 'lessons 1+2+3 evidence -> lesson 4' },
  { completed: ['everyday-object-words', 'colour-naming', 'sorting-one-rule', 'sizes-big-little'], expected: null, label: 'all four -> completion (no silent replay)' },
];

for (const c of cases) {
  const selected = selectNextLesson({
    lessons: sunnyLessons,
    journeySkills: journey,
    completedSkillIds: c.completed,
    getLessonById: getSunnyLessonById,
  });
  const matches =
    c.expected === null ? selected === null : selected !== null && selected.id === c.expected;
  report(
    `Pack 1 selection: ${c.label}`,
    matches,
    selected ? `selected ${selected.id}` : 'selected null'
  );
}

// Pack-agnostic sanity: the demo pack must still resolve its first lesson.
const coreSkills = readJson('packs/core/skills.json');
const coreLessons = readJson('packs/core/lessons.json');
const coreJourney = journeyOrder(coreSkills);
const getCoreLessonById = (id) => coreLessons.find((l) => l.id === id);
const coreSelected = selectNextLesson({
  lessons: coreLessons,
  journeySkills: coreJourney,
  completedSkillIds: [],
  getLessonById: getCoreLessonById,
});
report(
  'Demo pack (core) still resolves its first journey-stop lesson',
  coreSelected !== null && coreSelected.primary_skill_id === coreJourney[0].id,
  coreSelected ? `selected ${coreSelected.id}` : 'selected null'
);

console.log('\n=== LESSON-SELECTION DRILL ' + (failures === 0 ? 'PASSED' : 'FAILED') + ' ===');
process.exit(failures === 0 ? 0 : 1);
