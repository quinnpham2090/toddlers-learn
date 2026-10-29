import fs from 'node:fs';
import path from 'node:path';
import { BAND_RULE, evaluateBands } from '../lib/bands.js';
import { ADVENTURE_SKILL_TO_PATH, PATH_GRAPH, PATH_NODE_BY_ID } from '../lib/path-graph.js';
import { buildPathQueue } from '../lib/path-queue-engine.js';

const root = process.cwd();
const lessons = JSON.parse(
  fs.readFileSync(path.join(root, 'packs', 'sunny-home-garden', 'lessons.json'), 'utf8')
);
const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
const adventure = JSON.parse(
  fs.readFileSync(path.join(root, 'packs', 'sunny-home-garden', 'adventure.json'), 'utf8')
);
const invalidGraphEdges = PATH_GRAPH.flatMap((node) =>
  [...node.next, node.catch_up]
    .filter((id) => id && !PATH_NODE_BY_ID.has(id))
    .map((id) => `${node.id} -> ${id}`)
);
check(
  invalidGraphEdges.length === 0,
  'Graph: every advancement and catch-up edge resolves to a known skill',
  invalidGraphEdges.join(', ')
);
const unmappedBandable = adventure.skills
  .filter((skill) => skill.bandable && !ADVENTURE_SKILL_TO_PATH[skill.id])
  .map((skill) => skill.id);
check(
  unmappedBandable.length === 0,
  'Graph: every bandable M3 adventure skill resolves into the path graph',
  unmappedBandable.join(', ')
);
const skillMetaById = Object.fromEntries(
  PATH_GRAPH.map((node) => [
    node.id,
    { domain: node.domain, provisional: node.provisional, bandable: true },
  ])
);

let eventCounter = 0;
function makeEvent(skillId, options) {
  eventCounter += 1;
  return {
    id: `synthetic-evidence-${eventCounter}`,
    skill_id: skillId,
    scaffold_level: options.scaffold ?? 0,
    weight: options.weight ?? 'strong',
    bandable: options.bandable !== false,
    date: options.date,
    session_id: options.session,
    format_key: options.format,
    source: options.source ?? 'adventure',
    source_skill_id: options.sourceSkill ?? null,
    source_errand_id: options.errand ?? null,
    observable_behaviour: options.observable ?? null,
  };
}

function series(skillId, options) {
  return options.dates.map((date, index) =>
    makeEvent(skillId, {
      date,
      session: options.sessions[index],
      format: options.formats[index],
      scaffold: options.scaffold,
      weight: options.weight,
      bandable: options.bandable,
      source: options.source,
      sourceSkill: options.sourceSkill,
      errand: options.errand,
      observable: options.observable,
    })
  );
}

const failures = [];
function check(condition, label, detail) {
  if (condition) {
    console.log(`[PASS] ${label}`);
    return;
  }
  failures.push(label);
  console.error(`[FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
}

const quiet = { date: '2026-01-01', session: 's', format: 'f' };

const profileA = [
  ...series('point-to', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['a-p1', 'a-p2', 'a-p3'],
    formats: ['p1', 'p2', 'p3'],
    sourceSkill: 'point-to',
    errand: 'errand-porch-point',
  }),
  ...series('give-n', {
    dates: ['2026-01-03', '2026-01-03'],
    sessions: ['a-g1', 'a-g1'],
    formats: ['g1', 'g2'],
    sourceSkill: 'give-n',
    errand: 'errand-apple-give',
  }),
  ...series('subitize', {
    dates: ['2026-01-04', '2026-01-05', '2026-01-06'],
    sessions: ['a-s1', 'a-s2', 'a-s3'],
    formats: ['same-format', 'same-format', 'same-format'],
    sourceSkill: 'subitize',
    errand: 'errand-apple-subitize',
  }),
];

const profileB = [
  ...series('find-the-rhyme', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['b-r1', 'b-r2', 'b-r3'],
    formats: ['r1', 'r2', 'r3'],
    sourceSkill: 'find-the-rhyme',
    errand: 'errand-flower-rhyme',
  }),
  ...series('give-2', {
    dates: ['2026-01-04', '2026-01-05', '2026-01-06'],
    sessions: ['b-g1', 'b-g2', 'b-g3'],
    formats: ['same-format', 'same-format', 'same-format'],
    source: 'lesson',
  }),
  ...series('clap-the-beats', {
    dates: ['2026-01-02', '2026-01-03'],
    sessions: ['b-c1', 'b-c2'],
    formats: ['c1', 'c2'],
    sourceSkill: 'clap-the-beats',
    errand: 'errand-flower-clap',
  }),
];

const profileC = [
  ...series('subitize', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['c-s1', 'c-s2', 'c-s3'],
    formats: ['s1', 's2', 's3'],
    sourceSkill: 'subitize',
    errand: 'errand-apple-subitize',
  }),
  ...series('which-starts-with', {
    dates: ['2026-01-02', '2026-01-03'],
    sessions: ['c-w1', 'c-w2'],
    formats: ['w1', 'w2'],
    sourceSkill: 'which-starts-with',
    errand: 'errand-night-sound',
  }),
];

const profileD = [];

const profileE = [
  ...series('give-n', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['e-g1', 'e-g2', 'e-g3'],
    formats: ['g1', 'g2', 'g3'],
    sourceSkill: 'give-n',
    errand: 'errand-apple-give',
  }),
  ...series('find-the-rhyme', {
    dates: ['2026-01-04', '2026-01-05', '2026-01-06'],
    sessions: ['e-r1', 'e-r2', 'e-r3'],
    formats: ['same-format', 'same-format', 'same-format'],
    sourceSkill: 'find-the-rhyme',
    errand: 'errand-flower-rhyme',
  }),
];

const profileF = [
  ...series('point-to', {
    dates: ['2026-01-01', '2026-01-02'],
    sessions: ['f-p1', 'f-p2'],
    formats: ['p1', 'p2'],
    sourceSkill: 'point-to',
    errand: 'errand-porch-point',
  }),
  makeEvent('find-the-rhyme', {
    ...quiet,
    date: '2026-01-02',
    session: 'f-r1',
    format: 'r1',
    sourceSkill: 'find-the-rhyme',
    errand: 'errand-flower-rhyme',
  }),
  ...series('give-n', {
    dates: ['2026-01-03', '2026-01-04', '2026-01-05'],
    sessions: ['f-g1', 'f-g2', 'f-g3'],
    formats: ['same-format', 'same-format', 'same-format'],
    sourceSkill: 'give-n',
    errand: 'errand-apple-give',
  }),
];

function makeQueue(age, evidence, options = {}) {
  return buildPathQueue({
    evidence,
    skillMetaById,
    age,
    lessons,
    totalSessions: new Set(evidence.map((entry) => entry.session_id)).size,
    todayKey: '2026-01-10',
    sparseLaunch: options.sparseLaunch === true,
  });
}

const profiles = [
  {
    key: 'a',
    label: 'age 3, strong namer, weak counter',
    age: 3,
    evidence: profileA,
    leading: ['give-1', 'subitize'],
  },
  {
    key: 'b',
    label: 'age 4, Confident rhymer, Give-2 Practising',
    age: 4,
    evidence: profileB,
    leading: ['syllable-clapping', 'give-2'],
  },
  {
    key: 'c',
    label: 'age 5, CP-knower, weak initial sounds',
    age: 5,
    evidence: profileC,
    leading: ['onset-rime-prep', 'number-symbols'],
  },
  {
    key: 'd',
    label: 'age 2, new to all',
    age: 2,
    evidence: profileD,
    leading: ['point-to', 'sort-by-one-rule'],
  },
  {
    key: 'e',
    label: 'age 4, strong counter, weak rhymer',
    age: 4,
    evidence: profileE,
    leading: ['find-the-rhyme'],
  },
  {
    key: 'f',
    label: 'sparse-play child, 2 visits only',
    age: 4,
    evidence: profileF,
    leading: ['point-to-choice'],
    sparseLaunch: true,
  },
];

function summarize(queue) {
  return queue.items
    .map((item) =>
      item.kind === 'child-choice'
        ? `child-choice[${item.candidates.join(', ')}]`
        : `${item.branch}:${item.skill_id}${item.lesson_id ? ` (${item.lesson_id})` : ''}`
    )
    .join(' -> ');
}

const fingerprints = new Map();
const skillQueues = [];
const contentGaps = new Set();

for (const profile of profiles) {
  const queue = makeQueue(profile.age, profile.evidence, profile);
  const pathItems = queue.items.filter((item) => item.kind === 'path');
  const leading = pathItems.slice(0, profile.leading.length).map((item) => item.skill_id);

  console.log(`\n--- Profile ${profile.key.toUpperCase()}: ${profile.label} ---`);
  console.log(`Queue: ${summarize(queue)}`);
  console.log(`Fingerprint: ${queue.fingerprint}`);
  console.log(`Session options: ${queue.session_options.map((option) => option.lesson_id).join(', ') || '(none)'}`);
  console.log(`Content gaps: ${queue.content_gap_skill_ids.join(', ') || '(none)'}`);

  check(queue.validation.ok, `Profile ${profile.key}: queue validation`, queue.validation.issues.join(', '));
  check(
    JSON.stringify(leading) === JSON.stringify(profile.leading),
    `Profile ${profile.key}: queue leads with ${profile.leading.join(' + ')}`,
    `got ${leading.join(' + ')}`
  );
  check(
    queue.items.filter((item) => item.kind === 'child-choice').length === 1,
    `Profile ${profile.key}: exactly one child-choice slot`
  );
  check(pathItems.length >= 3, `Profile ${profile.key}: at least 3 path options`);
  check(queue.domains.length >= 2, `Profile ${profile.key}: at least 2 domains`);
  check(
    queue.unresolved_skill_ids.length === 0,
    `Profile ${profile.key}: every queued skill resolves`,
    queue.unresolved_skill_ids.join(', ')
  );
  check(
    pathItems.every((item) => {
      const node = PATH_NODE_BY_ID.get(item.skill_id);
      return node && node.min_age <= profile.age;
    }),
    `Profile ${profile.key}: nothing above the child's age band`
  );
  check(
    pathItems.every((item) => {
      if (!item.lesson_id) {
        return true;
      }
      const lesson = lessonById.get(item.lesson_id);
      const node = PATH_NODE_BY_ID.get(item.skill_id);
      return Boolean(
        lesson &&
          node &&
          lesson.primary_skill_id === node.playable_lesson_skill_id &&
          !item.lesson_id.includes('errand')
      );
    }),
    `Profile ${profile.key}: playable options map to real pack lessons, never adventure errands`
  );
  check(
    queue.session_options.every(
      (option) => !queue.content_gap_skill_ids.includes(option.skill_id)
    ),
    `Profile ${profile.key}: content-gap skills are never offered as sessions`
  );
  if (profile.sparseLaunch) {
    check(
      queue.launched_provisionally,
      `Profile ${profile.key}: launches provisionally without waiting`
    );
  }
  for (const gap of queue.content_gap_skill_ids) {
    contentGaps.add(gap);
  }
  fingerprints.set(profile.key, queue.fingerprint);
  skillQueues.push(pathItems.map((item) => item.skill_id).join(','));
}

check(
  new Set(fingerprints.values()).size === profiles.length,
  'All 6 synthetic profiles produce different queues',
  [...fingerprints.entries()].map(([key, value]) => `${key}=${value}`).join(' || ')
);
check(
  new Set(skillQueues).size === profiles.length,
  'All 6 synthetic profiles produce different skill-id queues',
  skillQueues.join(' || ')
);

const afterSession = makeQueue(3, [
  ...profileA,
  makeEvent('give-n', {
    date: '2026-01-07',
    session: 'a-g2',
    format: 'g3',
    sourceSkill: 'give-n',
    errand: 'errand-apple-give',
  }),
]);
check(
  afterSession.fingerprint !== makeQueue(3, profileA).fingerprint,
  'Queue: recomputes after a new session of evidence',
  afterSession.fingerprint
);

const pointToConfident = evaluateBands(
  series('point-to', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['band-1', 'band-2', 'band-3'],
    formats: ['f1', 'f2', 'f3'],
  }),
  skillMetaById
).skills[0];
check(
  pointToConfident.display_band === 'confident',
  'Bands: 3 qualifying events across 2+ sessions/days/formats reaches Confident'
);
console.log(
  `Confident sample: display=${pointToConfident.display_band} qualifying=${pointToConfident.qualifying_count} sessions=${pointToConfident.session_count} days=${pointToConfident.day_count} formats=${pointToConfident.format_count}`
);

const sameSession = evaluateBands(
  series('point-to', {
    dates: ['2026-01-01', '2026-01-01', '2026-01-01'],
    sessions: ['band-one', 'band-one', 'band-one'],
    formats: ['f1', 'f2', 'f3'],
  }),
  skillMetaById
).skills[0];
check(
  sameSession.display_band === 'exploring',
  'Bands: no single-session band flip',
  sameSession.display_band
);

const contradictionEvidence = [
  ...series('point-to', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['band-c1', 'band-c2', 'band-c3'],
    formats: ['f1', 'f2', 'f3'],
  }),
  makeEvent('point-to', {
    date: '2026-01-04',
    session: 'band-c4',
    format: 'f4',
    scaffold: 2,
    weight: 'participation',
  }),
];
const contradiction = evaluateBands(contradictionEvidence, skillMetaById).skills[0];
check(
  contradiction.display_band === 'practising' && contradiction.contradiction_blocked,
  'Bands: later strong failure blocks the Confident move',
  JSON.stringify({
    display: contradiction.display_band,
    blocked: contradiction.contradiction_blocked,
  })
);
console.log(
  `Contradiction sample: display=${contradiction.display_band} blocked=${contradiction.contradiction_blocked} last_two=${contradiction.last_two_qualifying}`
);

const silentCatchUp = evaluateBands(
  [
    ...series('point-to', {
      dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
      sessions: ['band-d1', 'band-d2', 'band-d3'],
      formats: ['f1', 'f2', 'f3'],
    }),
    ...series('point-to', {
      dates: ['2026-01-05', '2026-01-06', '2026-01-07'],
      sessions: ['band-d4', 'band-d5', 'band-d6'],
      formats: ['f4', 'f5', 'f6'],
      scaffold: 3,
      weight: 'participation',
    }),
  ],
  skillMetaById
).skills[0];
check(
  silentCatchUp.silent_catch_up &&
    silentCatchUp.display_band === 'confident' &&
    silentCatchUp.support_band === 'practising',
  'Bands: silent catch-up leaves displayed band unchanged',
  JSON.stringify({
    display: silentCatchUp.display_band,
    support: silentCatchUp.support_band,
    silent: silentCatchUp.silent_catch_up,
  })
);
console.log(
  `Silent catch-up sample: display=${silentCatchUp.display_band} support=${silentCatchUp.support_band} down=${silentCatchUp.down_from}->${silentCatchUp.down_to} cooldown_capped=${silentCatchUp.down_cooldown_capped}`
);

const science = evaluateBands(
  series('what-do-you-see', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['sci-1', 'sci-2', 'sci-3'],
    formats: ['f1', 'f2', 'f3'],
  }),
  skillMetaById
).skills[0];
check(
  science.display_band === 'confident' &&
    science.provisional &&
    science.confidence === 'provisional',
  'Bands: science moves with the provisional flag'
);

const selEvidence = [
  makeEvent('sel-turn-taking', {
    date: '2026-01-01',
    session: 'sel-1',
    format: 'f1',
    bandable: false,
    observable: 'waits for a turn with a grown-up',
  }),
];
const selEvaluation = evaluateBands(selEvidence, {
  ...skillMetaById,
  'sel-turn-taking': { domain: 'sel', bandable: false, provisional: false },
});
check(
  selEvaluation.skills.length === 0 && selEvaluation.behaviour_notes.length === 1,
  'Bands: SEL and motor evidence is a behaviour note, never a band'
);

const recheck = evaluateBands(
  series('point-to', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['recheck-1', 'recheck-2', 'recheck-3'],
    formats: ['f1', 'f2', 'f3'],
  }),
  skillMetaById,
  { today_key: '2026-01-25', total_sessions: 3 }
).skills[0];
check(
  recheck.recheck_due && recheck.recheck_reason === 'days',
  'Bands: re-check due from ordinary play after 21 days',
  JSON.stringify({ due: recheck.recheck_due, reason: recheck.recheck_reason })
);

const recheckBySessions = [
  ...series('point-to', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['recheck-s1', 'recheck-s2', 'recheck-s3'],
    formats: ['f1', 'f2', 'f3'],
  }),
  ...Array.from({ length: 8 }, (_, index) =>
    makeEvent('give-1', {
      date: `2026-01-${String(index + 4).padStart(2, '0')}`,
      session: `recheck-later-${index + 1}`,
      format: `later-${index + 1}`,
    })
  ),
];
const recheckSessions = evaluateBands(recheckBySessions, skillMetaById, {
  today_key: '2026-01-12',
  total_sessions: 11,
}).skills.find((skill) => skill.skill_id === 'point-to');
check(
  recheckSessions.recheck_due && recheckSessions.recheck_reason === 'sessions',
  'Bands: re-check due from ordinary play after 8 sessions',
  JSON.stringify({
    due: recheckSessions.recheck_due,
    reason: recheckSessions.recheck_reason,
    sessions_since: recheckSessions.recheck_sessions_since,
  })
);

process.env.TZ = 'America/Los_Angeles';

const isoInstant = (value) => new Date(value);
const localDayOf = (value) => {
  const date = isoInstant(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const sharedUtcDayEvents = [
  makeEvent('point-to', {
    date: '2026-01-14T02:00:00Z',
    session: 'bd-web-1',
    format: 'bd-f1',
    sourceSkill: 'point-to',
    errand: 'errand-porch-point',
  }),
  makeEvent('point-to', {
    date: '2026-01-14T13:00:00Z',
    session: 'bd-wem-2',
    format: 'bd-f2',
    sourceSkill: 'point-to',
    errand: 'errand-porch-point',
  }),
  makeEvent('point-to', {
    date: '2026-01-14T13:30:00Z',
    session: 'bd-web-3',
    format: 'bd-f1',
    sourceSkill: 'point-to',
    errand: 'errand-porch-point',
  }),
];
const sharedUtcDayEvaluation = evaluateBands(sharedUtcDayEvents, skillMetaById, {
  all_events: sharedUtcDayEvents,
}).skills[0];
const sharedUtcDayLocalDays = new Set(sharedUtcDayEvents.map((event) => localDayOf(event.date)));
const sharedUtcDayUtcDays = new Set(
  sharedUtcDayEvents.map((event) => event.date.slice(0, 10))
);
check(
  sharedUtcDayUtcDays.size === 1 &&
    sharedUtcDayLocalDays.size === 2 &&
    sharedUtcDayEvaluation.display_band === 'confident' &&
    sharedUtcDayEvaluation.day_count === 2,
  'Bands: two plays on consecutive LOCAL days sharing one UTC day count as 2 days',
  JSON.stringify({
    utcDays: [...sharedUtcDayUtcDays],
    localDays: [...sharedUtcDayLocalDays],
    band: sharedUtcDayEvaluation.display_band,
    dayCount: sharedUtcDayEvaluation.day_count,
  })
);

const oneLocalEveningEvents = [
  makeEvent('point-to', {
    date: '2026-01-14T23:30:00Z',
    session: 'bd-eve-1',
    format: 'bd-f1',
    sourceSkill: 'point-to',
    errand: 'errand-porch-point',
  }),
  makeEvent('point-to', {
    date: '2026-01-15T07:30:00Z',
    session: 'bd-eve-1',
    format: 'bd-f2',
    sourceSkill: 'point-to',
    errand: 'errand-porch-point',
  }),
  makeEvent('point-to', {
    date: '2026-01-15T07:50:00Z',
    session: 'bd-eve-1',
    format: 'bd-f1',
    sourceSkill: 'point-to',
    errand: 'errand-porch-point',
  }),
];
const oneLocalEveningEvaluation = evaluateBands(oneLocalEveningEvents, skillMetaById, {
  all_events: oneLocalEveningEvents,
}).skills[0];
const oneLocalEveningLocalDays = new Set(oneLocalEveningEvents.map((event) => localDayOf(event.date)));
const oneLocalEveningUtcDays = new Set(
  oneLocalEveningEvents.map((event) => event.date.slice(0, 10))
);
check(
  oneLocalEveningUtcDays.size === 2 &&
    oneLocalEveningLocalDays.size === 1 &&
    oneLocalEveningEvaluation.display_band === 'exploring' &&
    oneLocalEveningEvaluation.day_count === 1,
  'Bands: two plays inside one local evening straddling UTC midnight count as 1 day',
  JSON.stringify({
    utcDays: [...oneLocalEveningUtcDays],
    localDays: [...oneLocalEveningLocalDays],
    band: oneLocalEveningEvaluation.display_band,
    dayCount: oneLocalEveningEvaluation.day_count,
  })
);

const profileAQueue = makeQueue(3, profileA);
const continuity = profileAQueue.continuity;
const giveEntry = continuity.entries.find((entry) => entry.adventure_skill_id === 'give-n');
const pointEntry = continuity.entries.find((entry) => entry.adventure_skill_id === 'point-to');
const subitizeEntry = continuity.entries.find(
  (entry) => entry.adventure_skill_id === 'subitize'
);
check(
  giveEntry &&
    giveEntry.path_skill_id === 'give-n' &&
    giveEntry.first_path_item_skill_id === 'give-1' &&
    giveEntry.branch === 'catch-up',
  'Continuity: Give adventure evidence continues at its smaller-step variant, not the ladder bottom',
  JSON.stringify(giveEntry)
);
check(
  pointEntry &&
    pointEntry.path_skill_id === 'point-to' &&
    pointEntry.first_path_item_skill_id === 'name-with-grown-up' &&
    pointEntry.branch === 'advancement',
  'Continuity: confident naming advances from the touched skill',
  JSON.stringify(pointEntry)
);
check(
  subitizeEntry &&
    subitizeEntry.path_skill_id === 'subitize' &&
    subitizeEntry.first_path_item_skill_id === 'subitize' &&
    subitizeEntry.branch === 'consolidation',
  'Continuity: practising subitizing consolidates the same skill',
  JSON.stringify(subitizeEntry)
);
check(
  continuity.first_by_domain.some((entry) => entry.domain === 'language') &&
    continuity.first_by_domain.some((entry) => entry.domain === 'maths'),
  'Continuity: first path item exists for each adventure domain',
  JSON.stringify(continuity.first_by_domain.map((entry) => entry.domain))
);

const bridgeEvidence = [
  ...series('sort-by-one-rule', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['bridge-m1', 'bridge-m2', 'bridge-m3'],
    formats: ['m1', 'm2', 'm3'],
    sourceSkill: 'sort-by-one-rule',
    errand: 'errand-shed-sort',
  }),
  ...series('what-do-you-see', {
    dates: ['2026-01-02', '2026-01-03'],
    sessions: ['bridge-s1', 'bridge-s2'],
    formats: ['s1', 's2'],
    sourceSkill: 'what-do-you-see',
    errand: 'errand-shed-notice',
  }),
];
const bridgeQueue = makeQueue(4, bridgeEvidence);
const bridgeItem = bridgeQueue.items.find((item) => item.branch === 'bridge');
check(
  Boolean(
    bridgeItem &&
      bridgeItem.skill_id === 'sort-by-one-rule' &&
      bridgeItem.bridge_from_domain === 'maths' &&
      bridgeItem.bridge_to_domain === 'science' &&
      bridgeItem.lesson_id === null
  ),
  'Branches: cross-domain bridge uses sorting inside science noticing',
  JSON.stringify(bridgeItem)
);
console.log(`Bridge queue: ${summarize(bridgeQueue)}`);

const continuitySample = [
  ...series('point-to', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['cont-l1', 'cont-l2', 'cont-l3'],
    formats: ['l1', 'l2', 'l3'],
    sourceSkill: 'point-to',
    errand: 'errand-porch-point',
  }),
  ...series('give-n', {
    dates: ['2026-01-01', '2026-01-02'],
    sessions: ['cont-m1', 'cont-m2'],
    formats: ['m1', 'm2'],
    sourceSkill: 'give-n',
    errand: 'errand-apple-give',
  }),
  ...series('clap-the-beats', {
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    sessions: ['cont-u1', 'cont-u2', 'cont-u3'],
    formats: ['same-format', 'same-format', 'same-format'],
    sourceSkill: 'clap-the-beats',
    errand: 'errand-flower-clap',
  }),
  ...series('what-do-you-see', {
    dates: ['2026-01-01', '2026-01-02'],
    sessions: ['cont-s1', 'cont-s2'],
    formats: ['s1', 's2'],
    sourceSkill: 'what-do-you-see',
    errand: 'errand-shed-notice',
  }),
];
const continuityQueue = makeQueue(4, continuitySample);
console.log(`\n--- Continuity sample (first path item per domain) ---`);
for (const entry of continuityQueue.continuity.first_by_domain) {
  console.log(
    `${entry.domain}: errand(s) ${entry.adventure_errand_ids.join(', ') || '-'} touched ${entry.adventure_skill_id} at ${entry.from_band} -> first path item ${entry.first_path_item_skill_id} (${entry.branch})`
  );
}

const staticGaps = PATH_GRAPH.filter((node) => !node.playable_lesson_skill_id)
  .map((node) => node.id)
  .sort();
console.log(`\n--- Static content gaps (Pack 2 authoring queue) ---`);
console.log(staticGaps.join(', '));
console.log(`\n--- Queue content gaps observed in profiles ---`);
console.log([...contentGaps].sort().join(', ') || '(none)');
console.log(`\nBAND_RULE floor: ${BAND_RULE.min_qualifying_events}`);

if (failures.length > 0) {
  console.error(`\n=== PATH DIVERGENCE: ${failures.length} FAILURE(S) ===`);
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('\n=== PATH DIVERGENCE: ALL CHECKS PASSED ===');
