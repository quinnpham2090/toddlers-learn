/**
 * Mission offer drill — DEV ONLY (Node), never runs in the app.
 *
 * Exercises the REAL selection helper (lib/mission-offer.js — the same module the
 * hub calls) against the REAL live Pack 2 mission records, plus source assertions
 * for the store/caller boundaries the helper cannot see.
 */

import fs from 'node:fs';
import path from 'node:path';
import { selectMissionOffer } from '../lib/mission-offer.js';

const root = process.cwd();
let failures = 0;
function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const readText = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const missions = readJson('packs/sunny-home-garden-2/missions.json').map((mission) => ({
  id: mission.id,
  skill_id: mission.skill_id,
  age_band: mission.age_band,
}));
const TODAY = '2026-06-01';
const TOMORROW = '2026-06-02';
const DAY1 = '2026-06-01';
const DAY2 = '2026-06-02';
const DAY3 = '2026-06-03';
const base = { missions, age: 4, todayKey: TODAY, lastOfferDayKey: null, lastOfferedMissionId: null };

// ---- inventory (live pack) ----
report(
  'live pack offers exactly the ported 3 missions (2 share sizes-big-little)',
  missions.length === 3 &&
    missions.filter((m) => m.skill_id === 'sizes-big-little').length === 2 &&
    missions.some((m) => m.skill_id === 'sorting-one-rule'),
  missions.map((m) => `${m.id}:${m.skill_id}`).join(' ')
);

// ---- (a) skill preference ----
const sorting = selectMissionOffer({ ...base, completedSkillIds: ['sorting-one-rule'] });
report(
  'a sorting lesson offers Tidy Team',
  sorting && sorting.missionId === 'mission-tidy-team',
  JSON.stringify(sorting)
);
const sizes = selectMissionOffer({ ...base, completedSkillIds: ['sizes-big-little'] });
report(
  'a sizes lesson offers a sizes mission',
  sizes && missions.find((m) => m.id === sizes.missionId)?.skill_id === 'sizes-big-little',
  JSON.stringify(sizes)
);
const primaryFirst = selectMissionOffer({
  ...base,
  completedSkillIds: ['sorting-one-rule', 'sizes-big-little'],
});
report(
  'primary skill wins over secondary (primary first)',
  primaryFirst && primaryFirst.missionId === 'mission-tidy-team',
  JSON.stringify(primaryFirst)
);

// ---- (b) rotation: least recently offered within a skill (consecutive days) ----
// RE-SCOPED for the relaxed rule: the previous offer now needs its day key, because the
// block only applies back-to-back. Same intent (alternation), correct new inputs.
const first = selectMissionOffer({ ...base, todayKey: DAY1, completedSkillIds: ['sizes-big-little'] });
const second = selectMissionOffer({
  ...base,
  todayKey: DAY2,
  completedSkillIds: ['sizes-big-little'],
  lastOfferDayKey: DAY1,
  lastOfferedMissionId: first.missionId,
});
const third = selectMissionOffer({
  ...base,
  todayKey: DAY3,
  completedSkillIds: ['sizes-big-little'],
  lastOfferDayKey: DAY2,
  lastOfferedMissionId: second.missionId,
});
report(
  'rotation alternates between the two sizes missions',
  first.missionId !== second.missionId && third.missionId === first.missionId,
  `${first.missionId} -> ${second.missionId} -> ${third.missionId}`
);

// ---- (c) the relaxed back-to-back rule: the 7 worked examples (all binding) ----
// RE-SCOPED for the relaxed rule: the old case asserted an INDEFINITE block (no day key
// passed); it now asserts the back-to-back block, and the gap case proves the row breaks.
const callOffer = (todayKey, lastOfferDayKey, lastOfferedMissionId, completedSkillIds) =>
  selectMissionOffer({ ...base, todayKey, lastOfferDayKey, lastOfferedMissionId, completedSkillIds });

const ex1 = callOffer(DAY1, null, null, ['sorting-one-rule']);
report(
  'worked ex 1: day 1 sorting offers Tidy Team',
  ex1 && ex1.missionId === 'mission-tidy-team',
  JSON.stringify(ex1)
);
const ex2 = callOffer(DAY2, DAY1, 'mission-tidy-team', ['sorting-one-rule']);
report(
  'worked ex 2: day 2 sorting offers NOTHING (back-to-back; day not consumed, state unchanged)',
  ex2 === null,
  JSON.stringify(ex2)
);
const ex3 = callOffer(DAY3, DAY1, 'mission-tidy-team', ['sorting-one-rule']);
report(
  'worked ex 3: day 3 sorting offers Tidy Team again (the skipped day broke the row)',
  ex3 && ex3.missionId === 'mission-tidy-team',
  JSON.stringify(ex3)
);
const s1 = callOffer(DAY1, null, null, ['sizes-big-little']);
const s2 = callOffer(DAY2, DAY1, s1.missionId, ['sizes-big-little']);
const s3 = callOffer(DAY3, DAY2, s2.missionId, ['sizes-big-little']);
report(
  'worked ex 4: sizes missions alternate across consecutive days',
  s1.missionId !== s2.missionId && s3.missionId === s1.missionId,
  `${s1.missionId} -> ${s2.missionId} -> ${s3.missionId}`
);
const ex5 = callOffer('2026-06-05', DAY1, 'mission-tidy-team', ['sorting-one-rule']);
report(
  'worked ex 5: a 4-day gap allows the same mission again',
  ex5 && ex5.missionId === 'mission-tidy-team',
  JSON.stringify(ex5)
);
const ex6 = callOffer(DAY1, DAY1, 'mission-tidy-team', ['sorting-one-rule']);
report('worked ex 6: a second lesson the same day offers nothing (day cap unchanged)', ex6 === null, JSON.stringify(ex6));
report(
  'worked ex 7a: last offer 2026-10-31, today 2026-11-01 -> BLOCKED (month boundary)',
  callOffer('2026-11-01', '2026-10-31', 'mission-tidy-team', ['sorting-one-rule']) === null
);
const ex7b = callOffer('2026-11-01', '2026-10-30', 'mission-tidy-team', ['sorting-one-rule']);
report(
  'worked ex 7b: last offer 2026-10-30, today 2026-11-01 -> ALLOWED',
  ex7b && ex7b.missionId === 'mission-tidy-team',
  JSON.stringify(ex7b)
);

// ---- (d) no match => no offer (and purity => the day is not consumed) ----
const noMatch = selectMissionOffer({ ...base, completedSkillIds: ['subitize'] });
report('a lesson whose skill has no mission offers nothing', noMatch === null, JSON.stringify(noMatch));
const helperSource = readText('lib/mission-offer.js');
report(
  'the selection helper is pure (no I/O), so a null result cannot consume a day',
  !/\brequire\(|from '|File\(|Paths\.|writeSync|readFileSync/.test(helperSource)
);
const hubSource = readText('app/index.tsx');
report(
  'the hub records the offer ONLY when a mission was selected',
  /if \(!offer\) \{\s*return null;\s*\}\s*recordMissionOffer\(/.test(hubSource)
);

// ---- (e) one offer per visit-day ----
const sameDay = selectMissionOffer({ ...base, completedSkillIds: ['sorting-one-rule'], lastOfferDayKey: TODAY });
report('a second offer on the same visit-day is refused', sameDay === null, JSON.stringify(sameDay));
const nextDay = selectMissionOffer({
  ...base,
  todayKey: TOMORROW,
  completedSkillIds: ['sorting-one-rule'],
  lastOfferDayKey: TODAY,
  lastOfferedMissionId: null,
});
report('a later day may offer again', nextDay !== null, JSON.stringify(nextDay));

// ---- age gate ----
report(
  'age gate: only 3-4 offers (2 and 5 refused)',
  selectMissionOffer({ ...base, age: 2, completedSkillIds: ['sorting-one-rule'] }) === null &&
    selectMissionOffer({ ...base, age: 5, completedSkillIds: ['sorting-one-rule'] }) === null &&
    selectMissionOffer({ ...base, age: 3, completedSkillIds: ['sorting-one-rule'] }) !== null
);

// ---- (f) dismissals never touch together-completions ----
const offerStateSource = readText('lib/mission-offer-state.ts');
report(
  'offer state is a separate file from together-completions.json',
  offerStateSource.includes('mission-offer-state-') &&
    !offerStateSource.includes('together-completions')
);
const dismissHandler = /onDismiss=\{\(\) => setMissionOfferId\(null\)\}/.test(hubSource);
report(
  'the dismiss handler only clears the card (no completion write)',
  dismissHandler && !/onDismiss=\{[\s\S]{0,120}recordCompletion/.test(hubSource)
);

// ---- (g) completion path unchanged: one completion, no evidence ----
const missionSource = readText('app/mission.tsx');
report(
  'mission completion writes exactly one completion and no band/queue evidence',
  (missionSource.match(/recordCompletion\(/g) ?? []).length === 1 &&
    !missionSource.includes('recordStepEvidence') &&
    !missionSource.includes('recordAdventureEvidence') &&
    !missionSource.includes('markPathSessionCompleted')
);

// ---- trigger placement (source) ----
const sessionSource = readText('app/session.tsx');
report(
  'the completion signal is set only for post-adventure PATH sessions',
  /if \(pathSelection\?\.active && lesson\) \{\s*markPathSessionCompleted\(\);\s*markPathLessonCompleted\(/.test(sessionSource)
);
const signalSource = readText('lib/path-lesson-signal.ts');
report(
  'the completion signal is in-memory only (no cold-start offer)',
  !/File\(|Paths\.|writeSync|readFileSync|JSON\.parse/.test(signalSource)
);
report(
  'the offer card renders alongside the next-lesson button (never instead)',
  hubSource.indexOf('<StartButton') < hubSource.indexOf('<MissionOfferCard') &&
    hubSource.includes('{missionOfferId && guide ? (')
);
report(
  'tapping the offer reuses the Together ParentGate flow (no second briefing flow)',
  hubSource.includes("pathname: '/together', params: { offer: offeredId }") &&
    readText('app/together.tsx').includes('setPending({ kind: \'mission\', id: offerParam })')
);

if (failures > 0) {
  console.error(`\n=== MISSION OFFER DRILL FAILED (${failures}) ===`);
  process.exit(1);
}
console.log('\n=== MISSION OFFER DRILL PASSED ===');
