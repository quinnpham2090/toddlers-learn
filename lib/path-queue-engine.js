import { evaluateBands } from './bands.js';
import {
  PATH_GRAPH,
  PATH_NODE_BY_ID,
  PATH_ENTRY_SKILL_IDS,
  isAgeEligible,
} from './path-graph.js';

const CONTEXTS = ['new-item-set', 'new-garden-place'];

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

function lessonMinAge(ageBand) {
  const match = /^(\d+)-(\d+)$/.exec(typeof ageBand === 'string' ? ageBand : '');
  return match ? Number(match[1]) : 0;
}

function lessonForNode(node, lessons, age) {
  if (!node || !node.playable_lesson_skill_id) {
    return null;
  }
  const lesson = lessons.find(
    (candidate) => candidate.primary_skill_id === node.playable_lesson_skill_id
  );
  if (!lesson || lessonMinAge(lesson.age_band) > age) {
    return null;
  }
  return lesson;
}

function makeItem(input) {
  const node = PATH_NODE_BY_ID.get(input.skill_id);
  if (!node) {
    return null;
  }
  const lesson = lessonForNode(node, input.lessons, input.age);
  return {
    kind: 'path',
    branch: input.branch,
    skill_id: node.id,
    source_skill_id: input.source_skill_id ?? null,
    source_errand_ids: uniqueStrings(input.source_errand_ids ?? []),
    adventure_skill_ids: uniqueStrings(input.adventure_skill_ids ?? []),
    domain: node.domain,
    from_band: input.from_band ?? null,
    support_band: input.support_band ?? input.from_band ?? null,
    display_band: input.display_band ?? input.from_band ?? null,
    silent_catch_up: input.silent_catch_up === true,
    provisional: input.provisional === true || node.provisional === true,
    lesson_id: lesson ? lesson.id : null,
    lesson_skill_id: lesson ? lesson.primary_skill_id : null,
    context: input.context ?? null,
    reason: input.reason ?? null,
    oldest_date: input.oldest_date ?? null,
    bridge_from_domain: input.bridge_from_domain ?? null,
    bridge_to_domain: input.bridge_to_domain ?? null,
    candidates: [],
  };
}

function oldestDate(events) {
  const dates = events.map((event) => event.date).filter(Boolean).sort();
  return dates.length > 0 ? dates[0] : '';
}

function sortByOldest(left, right) {
  const dateCompare = String(left.oldest_date ?? '').localeCompare(String(right.oldest_date ?? ''));
  if (dateCompare !== 0) {
    return dateCompare;
  }
  return String(left.skill_id).localeCompare(String(right.skill_id));
}

function dedupeItems(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = `${item.branch}:${item.skill_id}:${item.context ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function addBreadth(items, age, lessons) {
  const pathItems = items.filter((item) => item.kind === 'path');
  const domains = new Set(pathItems.map((item) => item.domain).filter(Boolean));
  const usedTargets = new Set(pathItems.map((item) => item.skill_id));
  const candidates = PATH_GRAPH.filter(
    (node) => isAgeEligible(node, age) && !usedTargets.has(node.id)
  );
  const hasPlayableCandidate = candidates.some(
    (node) => lessonForNode(node, lessons, age) !== null
  );
  const needsPlayable = hasPlayableCandidate && pathItems.every((item) => !item.lesson_id);
  candidates.sort((left, right) => {
    if (needsPlayable) {
      const leftPlayable = lessonForNode(left, lessons, age) ? 0 : 1;
      const rightPlayable = lessonForNode(right, lessons, age) ? 0 : 1;
      if (leftPlayable !== rightPlayable) {
        return leftPlayable - rightPlayable;
      }
    }
    const leftNewDomain = domains.has(left.domain) ? 1 : 0;
    const rightNewDomain = domains.has(right.domain) ? 1 : 0;
    if (leftNewDomain !== rightNewDomain) {
      return leftNewDomain - rightNewDomain;
    }
    if (left.entry !== right.entry) {
      return left.entry ? -1 : 1;
    }
    return left.id.localeCompare(right.id);
  });
  let index = 0;
  while (
    pathItems.length < 3 ||
    domains.size < 2 ||
    (needsPlayable && pathItems.every((item) => !item.lesson_id))
  ) {
    const node = candidates[index];
    index += 1;
    if (!node) {
      break;
    }
    const item = makeItem({
      branch: 'consolidation',
      skill_id: node.id,
      source_skill_id: null,
      source_errand_ids: [],
      adventure_skill_ids: [],
      from_band: null,
      display_band: null,
      support_band: null,
      silent_catch_up: false,
      provisional: node.provisional,
      context: CONTEXTS[0],
      reason: 'breadth',
      oldest_date: '',
      lessons,
      age,
    });
    if (!item) {
      continue;
    }
    items.push(item);
    pathItems.push(item);
    domains.add(node.domain);
    usedTargets.add(node.id);
  }
}

function addBridges(items, evidence, age, lessons) {
  if (age < 3 || items.some((item) => item.branch === 'bridge')) {
    return;
  }
  const hasSorting = items.some(
    (item) =>
      item.kind === 'path' &&
      (item.skill_id === 'sort-by-one-rule' || item.source_skill_id === 'sort-by-one-rule')
  );
  const hasScience =
    items.some((item) => item.kind === 'path' && item.domain === 'science') ||
    evidence.some((event) => PATH_NODE_BY_ID.get(event.skill_id)?.domain === 'science');
  if (!hasSorting || !hasScience) {
    return;
  }
  const item = makeItem({
    branch: 'bridge',
    skill_id: 'sort-by-one-rule',
    source_skill_id: 'sort-by-one-rule',
    source_errand_ids: [],
    adventure_skill_ids: [],
    from_band: null,
    support_band: null,
    display_band: null,
    silent_catch_up: false,
    provisional: true,
    context: 'science-noticing',
    reason: 'cross-domain-tool-use',
    oldest_date: '',
    bridge_from_domain: 'maths',
    bridge_to_domain: 'science',
    lessons,
    age,
  });
  if (item) {
    item.lesson_id = null;
    item.lesson_skill_id = null;
    items.push(item);
  }
}

function buildChildChoice(items, age) {
  const pathItems = items.filter((item) => item.kind === 'path');
  const byDomain = new Map();
  for (const item of pathItems) {
    if (item.domain && !byDomain.has(item.domain)) {
      byDomain.set(item.domain, item.skill_id);
    }
  }
  const candidates = [...byDomain.values()].slice(0, 3);
  if (candidates.length < 2) {
    for (const node of PATH_GRAPH) {
      if (!isAgeEligible(node, age) || candidates.includes(node.id)) {
        continue;
      }
      candidates.push(node.id);
      if (candidates.length >= 3) {
        break;
      }
    }
  }
  return {
    kind: 'child-choice',
    branch: 'child-choice',
    skill_id: null,
    source_skill_id: null,
    source_errand_ids: [],
    adventure_skill_ids: [],
    domain: null,
    from_band: null,
    support_band: null,
    display_band: null,
    silent_catch_up: false,
    provisional: false,
    lesson_id: null,
    lesson_skill_id: null,
    context: null,
    reason: 'child-choice',
    oldest_date: null,
    candidates,
  };
}

function buildContinuity(items, evidence, age) {
  const byPathSkill = new Map();
  for (const item of items) {
    if (item.kind !== 'path' || !item.source_skill_id) {
      continue;
    }
    if (!byPathSkill.has(item.source_skill_id)) {
      byPathSkill.set(item.source_skill_id, item);
    }
  }
  const grouped = new Map();
  for (const event of evidence) {
    if (!event.source_skill_id || event.bandable === false || event.source !== 'adventure') {
      continue;
    }
    const current = grouped.get(event.source_skill_id) ?? {
      adventure_skill_id: event.source_skill_id,
      path_skill_id: event.skill_id,
      errand_ids: [],
    };
    if (event.source_errand_id) {
      current.errand_ids.push(event.source_errand_id);
    }
    grouped.set(event.source_skill_id, current);
  }
  const entries = [];
  const missing = [];
  for (const [adventureSkillId, info] of [...grouped.entries()].sort((left, right) =>
    left[0].localeCompare(right[0])
  )) {
    const pathNode = PATH_NODE_BY_ID.get(info.path_skill_id);
    if (pathNode && !isAgeEligible(pathNode, age)) {
      continue;
    }
    const item = byPathSkill.get(info.path_skill_id);
    if (!item) {
      missing.push(adventureSkillId);
      continue;
    }
    entries.push({
      adventure_skill_id: adventureSkillId,
      adventure_errand_ids: uniqueStrings(info.errand_ids),
      path_skill_id: info.path_skill_id,
      first_path_item_skill_id: item.skill_id,
      branch: item.branch,
      from_band: item.from_band,
      display_band: item.display_band,
      provisional: item.provisional,
    });
  }
  const entryByPathSkill = new Map(entries.map((entry) => [entry.path_skill_id, entry]));
  const byDomain = new Map();
  for (const item of items) {
    if (item.kind !== 'path' || !item.source_skill_id) {
      continue;
    }
    const node = PATH_NODE_BY_ID.get(item.source_skill_id);
    const entry = entryByPathSkill.get(item.source_skill_id);
    if (!node || !entry || byDomain.has(node.domain)) {
      continue;
    }
    byDomain.set(node.domain, entry);
  }
  for (const entry of entries) {
    const node = PATH_NODE_BY_ID.get(entry.path_skill_id);
    if (!node || byDomain.has(node.domain)) {
      continue;
    }
    byDomain.set(node.domain, entry);
  }
  return {
    entries,
    first_by_domain: [...byDomain.entries()].map(([domain, entry]) => ({ domain, ...entry })),
    missing_adventure_skills: missing,
  };
}

export function buildPathQueue(input) {
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  const lessons = Array.isArray(input.lessons) ? input.lessons : [];
  const skillMetaById = input.skillMetaById ?? {};
  const age = typeof input.age === 'number' ? input.age : 3;
  const totalSessions =
    typeof input.totalSessions === 'number'
      ? input.totalSessions
      : new Set(evidence.map((event) => event.session_id || event.date)).size;
  const todayKey = input.todayKey ?? '';
  const sparseLaunch = input.sparseLaunch === true;

  const grouped = new Map();
  for (const event of evidence) {
    if (!event || typeof event.skill_id !== 'string') {
      continue;
    }
    const current = grouped.get(event.skill_id) ?? [];
    current.push(event);
    grouped.set(event.skill_id, current);
  }

  const evaluated = evaluateBands(evidence, skillMetaById, {
    total_sessions: totalSessions,
    today_key: todayKey,
    all_events: evidence,
  });
  const bandBySkill = new Map(evaluated.skills.map((result) => [result.skill_id, result]));
  const unresolved = new Set();
  const ageFiltered = new Set();
  const catchUps = [];
  const consolidations = [];
  const advancements = [];

  for (const [skillId, events] of grouped.entries()) {
    const result = bandBySkill.get(skillId);
    const node = PATH_NODE_BY_ID.get(skillId);
    if (!node) {
      unresolved.add(skillId);
      continue;
    }
    if (!result) {
      continue;
    }
    if (!isAgeEligible(node, age)) {
      ageFiltered.add(skillId);
      continue;
    }
    const base = {
      source_skill_id: skillId,
      source_errand_ids: events.map((event) => event.source_errand_id),
      adventure_skill_ids: events.map((event) => event.source_skill_id),
      from_band: result.display_band,
      support_band: result.support_band,
      display_band: result.display_band,
      silent_catch_up: result.silent_catch_up,
      provisional: result.provisional,
      oldest_date: oldestDate(events),
      lessons,
      age,
    };
    let item = null;
    if (result.support_band === 'exploring' || result.silent_catch_up) {
      const target =
        node.catch_up && PATH_NODE_BY_ID.has(node.catch_up) ? node.catch_up : null;
      if (target) {
        item = makeItem({
          ...base,
          branch: 'catch-up',
          skill_id: target,
          context: null,
          reason: result.silent_catch_up ? 'silent-catch-up' : 'exploring',
        });
      } else {
        item = makeItem({
          ...base,
          branch: 'consolidation',
          skill_id: node.id,
          context: CONTEXTS[0],
          reason: 'no-smaller-step',
        });
      }
      if (item) {
        catchUps.push(item);
      }
    } else if (result.support_band === 'confident') {
      const next = node.next
        .map((id) => PATH_NODE_BY_ID.get(id))
        .find((candidate) => candidate && isAgeEligible(candidate, age));
      if (next) {
        item = makeItem({
          ...base,
          branch: 'advancement',
          skill_id: next.id,
          context: null,
          reason: 'confident',
        });
      } else {
        item = makeItem({
          ...base,
          branch: 'consolidation',
          skill_id: node.id,
          context: CONTEXTS[1],
          reason: 'top-of-graph',
        });
      }
      if (item) {
        advancements.push(item);
      }
    } else {
      item = makeItem({
        ...base,
        branch: 'consolidation',
        skill_id: node.id,
        context: CONTEXTS[0],
        reason: result.contradiction_blocked ? 'contradiction-blocked' : 'practising',
      });
      if (item) {
        consolidations.push(item);
      }
    }
    if (result.recheck_due) {
      if (item && item.branch === 'consolidation') {
        item.reason = 'recheck';
      } else {
        const recheck = makeItem({
          ...base,
          branch: 'consolidation',
          skill_id: node.id,
          context: 'recheck',
          reason: 'recheck',
        });
        if (recheck) {
          consolidations.push(recheck);
        }
      }
    }
  }

  catchUps.sort(sortByOldest);
  consolidations.sort(sortByOldest);
  advancements.sort(sortByOldest);

  let items = dedupeItems([
    ...[...catchUps, ...consolidations].sort(sortByOldest),
    ...advancements,
  ]);

  if (items.length === 0) {
    const entries = PATH_ENTRY_SKILL_IDS.map((id) => PATH_NODE_BY_ID.get(id)).filter(
      (node) => node && isAgeEligible(node, age)
    );
    for (const node of entries) {
      const item = makeItem({
        branch: 'entry',
        skill_id: node.id,
        source_skill_id: null,
        source_errand_ids: [],
        adventure_skill_ids: [],
        from_band: 'not-yet-explored',
        support_band: 'not-yet-explored',
        display_band: 'not-yet-explored',
        silent_catch_up: false,
        provisional: node.provisional,
        context: null,
        reason: 'entry',
        oldest_date: '',
        lessons,
        age,
      });
      if (item) {
        items.push(item);
      }
    }
    for (const node of entries) {
      const item = makeItem({
        branch: 'consolidation',
        skill_id: node.id,
        source_skill_id: null,
        source_errand_ids: [],
        adventure_skill_ids: [],
        from_band: 'not-yet-explored',
        support_band: 'not-yet-explored',
        display_band: 'not-yet-explored',
        silent_catch_up: false,
        provisional: node.provisional,
        context: CONTEXTS[0],
        reason: 'first-path',
        oldest_date: '',
        lessons,
        age,
      });
      if (item) {
        items.push(item);
      }
    }
  }

  addBreadth(items, age, lessons);
  addBridges(items, evidence, age, lessons);

  const pathItems = items.filter((item) => item.kind === 'path');
  const domains = new Set(pathItems.map((item) => item.domain).filter(Boolean));
  const childChoice = buildChildChoice(items, age);
  const childChoiceIndex = Math.min(2, items.length);
  items.splice(childChoiceIndex, 0, childChoice);

  for (const item of items) {
    if (item.kind === 'path' && !PATH_NODE_BY_ID.has(item.skill_id)) {
      unresolved.add(item.skill_id);
    }
  }

  const continuity = buildContinuity(items, evidence, age);
  const contentGaps = uniqueStrings(
    items
      .filter(
        (item) => item.kind === 'path' && item.lesson_id === null && item.branch !== 'bridge'
      )
      .map((item) => item.skill_id)
  ).sort();
  const sessionOptions = [];
  const seenLessons = new Set();
  for (const item of items) {
    if (item.kind !== 'path' || !item.lesson_id || seenLessons.has(item.lesson_id)) {
      continue;
    }
    seenLessons.add(item.lesson_id);
    sessionOptions.push({
      skill_id: item.skill_id,
      branch: item.branch,
      domain: item.domain,
      lesson_id: item.lesson_id,
    });
  }

  const issues = [];
  if (!items.some((item) => item.kind === 'child-choice')) {
    issues.push('missing-child-choice-slot');
  }
  if (pathItems.length < 3) {
    issues.push('fewer-than-3-options');
  }
  if (domains.size < 2) {
    issues.push('fewer-than-2-domains');
  }
  if (unresolved.size > 0) {
    issues.push('unresolved-skill-id');
  }
  if (continuity.missing_adventure_skills.length > 0) {
    issues.push('continuity-missing');
  }

  const fingerprint = items
    .map((item) =>
      item.kind === 'path'
        ? `${item.branch}:${item.source_skill_id ?? '-'}>${item.skill_id}`
        : `child-choice:${item.candidates.join('+')}`
    )
    .join('|');

  return {
    age,
    sparse_launch: sparseLaunch,
    launched_provisionally: sparseLaunch && evidence.length > 0,
    total_sessions: totalSessions,
    items,
    band_results: evaluated.skills,
    behaviour_notes: evaluated.behaviour_notes,
    session_options: sessionOptions,
    content_gap_skill_ids: contentGaps,
    unresolved_skill_ids: [...unresolved].sort(),
    age_filtered_skill_ids: [...ageFiltered].sort(),
    continuity,
    domains: [...domains].sort(),
    fingerprint,
    validation: {
      ok: issues.length === 0,
      issues,
    },
  };
}
