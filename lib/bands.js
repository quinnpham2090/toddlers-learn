export const BAND_ORDER = ['not-yet-explored', 'exploring', 'practising', 'confident'];

export const BAND_RULE = Object.freeze({
  min_qualifying_events: 3,
  max_qualifying_scaffold: 1,
  min_sessions: 2,
  min_days: 2,
  min_formats: 2,
  last_events: 2,
  down_min_events: 3,
  down_min_sessions: 2,
  down_min_days: 2,
  down_spread_days: 7,
  recheck_sessions: 8,
  recheck_days: 21,
});

const DAY_MS = 86400000;

function dateKey(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : '';
}

function dayNumber(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return null;
  }
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function daysBetween(fromKey, toKey) {
  const from = dayNumber(fromKey);
  const to = dayNumber(toKey);
  if (from === null || to === null) {
    return 0;
  }
  return Math.abs(to - from);
}

function sortEvidence(events) {
  return [...events].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date < right.date ? -1 : 1;
    }
    return String(left.id ?? '').localeCompare(String(right.id ?? ''));
  });
}

function sessionKey(event) {
  return event.session_id || event.sessionId || dateKey(event.date) || String(event.id ?? '');
}

function formatKey(event) {
  return event.format_key || event.formatKey || event.variant_id || event.variantId || '';
}

function uniqueSessionCount(events) {
  return new Set(events.map(sessionKey)).size;
}

function uniqueDayCount(events) {
  return new Set(events.map((event) => dateKey(event.date)).filter(Boolean)).size;
}

function isQualifying(event) {
  return (
    event.bandable !== false &&
    event.completed_with_help !== true &&
    event.completedWithHelp !== true &&
    Number(event.scaffold_level) <= BAND_RULE.max_qualifying_scaffold &&
    event.weight !== 'participation'
  );
}

function isHighSupport(event) {
  return (
    event.bandable !== false &&
    (event.completed_with_help === true ||
      event.completedWithHelp === true ||
      event.weight === 'participation' ||
      Number(event.scaffold_level) >= 2)
  );
}

function baseBand(ordered) {
  const bandable = ordered.filter((event) => event.bandable !== false);
  if (bandable.length === 0) {
    return 'not-yet-explored';
  }
  const qualifying = bandable.filter(isQualifying);
  const sessions = uniqueSessionCount(qualifying);
  const days = uniqueDayCount(qualifying);
  if (
    qualifying.length < BAND_RULE.min_qualifying_events ||
    sessions < BAND_RULE.min_sessions ||
    days < BAND_RULE.min_days
  ) {
    return 'exploring';
  }
  const formats = new Set(qualifying.map(formatKey).filter(Boolean));
  const lastEvents = bandable.slice(-BAND_RULE.last_events);
  const lastQualifying =
    lastEvents.length === BAND_RULE.last_events && lastEvents.every(isQualifying);
  if (formats.size >= BAND_RULE.min_formats && lastQualifying) {
    return 'confident';
  }
  return 'practising';
}

function findContradiction(ordered) {
  let lastHighIndex = -1;
  ordered.forEach((event, index) => {
    if (isHighSupport(event)) {
      lastHighIndex = index;
    }
  });
  if (lastHighIndex === -1) {
    return { blocked: false, resolved: false, qualifying_after: 0, at: null };
  }
  const qualifyingAfter = ordered.slice(lastHighIndex + 1).filter(isQualifying);
  return {
    blocked: qualifyingAfter.length < 2,
    resolved: qualifyingAfter.length >= 2,
    qualifying_after: qualifyingAfter.length,
    at: dateKey(ordered[lastHighIndex].date) || null,
  };
}

function dropOne(band) {
  if (band === 'confident') {
    return 'practising';
  }
  if (band === 'practising') {
    return 'exploring';
  }
  return band;
}

function findDownMove(ordered) {
  const high = [];
  ordered.forEach((event, index) => {
    if (isHighSupport(event)) {
      high.push({ event, index });
    }
  });
  if (high.length < BAND_RULE.down_min_events) {
    return { applies: false, reason: 'not-enough-high-support' };
  }
  const lastThree = high.slice(-BAND_RULE.down_min_events);
  const sessions = new Set(lastThree.map((entry) => sessionKey(entry.event)));
  const days = new Set(lastThree.map((entry) => dateKey(entry.event.date)).filter(Boolean));
  if (sessions.size < BAND_RULE.down_min_sessions || days.size < BAND_RULE.down_min_days) {
    return { applies: false, reason: 'not-spaced' };
  }
  const triggerIndex = lastThree[0].index;
  const triggerDay = dateKey(lastThree[lastThree.length - 1].event.date);
  const qualifyingAfter = ordered
    .slice(lastThree[lastThree.length - 1].index + 1)
    .filter(isQualifying);
  if (qualifyingAfter.length >= 2) {
    return { applies: false, reason: 'resolved-by-later-play', resolved_at: triggerDay };
  }
  const before = ordered.slice(0, triggerIndex);
  const beforeBand = baseBand(before);
  if (beforeBand !== 'practising' && beforeBand !== 'confident') {
    return { applies: false, reason: 'no-established-band', band_before: beforeBand };
  }
  const earlierHigh = high.slice(0, -BAND_RULE.down_min_events);
  const previousTriggerDay =
    earlierHigh.length >= BAND_RULE.down_min_events
      ? dateKey(earlierHigh[earlierHigh.length - 1].event.date)
      : null;
  const cooldownCapped = previousTriggerDay
    ? daysBetween(previousTriggerDay, triggerDay) < BAND_RULE.down_spread_days
    : false;
  return {
    applies: true,
    reason: 'three-spaced-high-support',
    band_before: beforeBand,
    support_band: dropOne(beforeBand),
    trigger_day: triggerDay || null,
    cooldown_capped: cooldownCapped,
  };
}

function sessionOrderMap(events) {
  const firstDay = new Map();
  for (const event of events) {
    const key = sessionKey(event);
    const day = dateKey(event.date);
    const current = firstDay.get(key);
    if (current === undefined || (day && day < current)) {
      firstDay.set(key, day);
    }
  }
  const ordered = [...firstDay.entries()].sort((left, right) => {
    if (left[1] === right[1]) {
      return left[0].localeCompare(right[0]);
    }
    return left[1] < right[1] ? -1 : 1;
  });
  return new Map(ordered.map(([key], index) => [key, index]));
}

function recheckState(skillEvents, allEvents, options) {
  if (skillEvents.length === 0) {
    return { due: false, reason: null, sessions_since: 0, days_since: 0 };
  }
  const ordered = sortEvidence(skillEvents);
  const last = ordered[ordered.length - 1];
  const order = sessionOrderMap(allEvents);
  const lastIndex = order.get(sessionKey(last));
  const totalSessions = order.size;
  const sessionsSince =
    lastIndex === undefined || totalSessions === 0 ? 0 : totalSessions - 1 - lastIndex;
  const todayKey = dateKey(options.today_key || options.todayKey || '');
  const daysSince = todayKey ? daysBetween(dateKey(last.date), todayKey) : 0;
  let reason = null;
  if (sessionsSince >= BAND_RULE.recheck_sessions) {
    reason = 'sessions';
  } else if (todayKey && daysSince >= BAND_RULE.recheck_days) {
    reason = 'days';
  }
  return { due: reason !== null, reason, sessions_since: sessionsSince, days_since: daysSince };
}

export function evaluateSkillBand(skillId, skillEvents, meta, options = {}) {
  const ordered = sortEvidence(skillEvents);
  const bandable = ordered.filter((event) => event.bandable !== false);
  const contradiction = findContradiction(ordered);
  const rawBase = baseBand(ordered);
  const base = rawBase === 'confident' && contradiction.blocked ? 'practising' : rawBase;
  const down = findDownMove(ordered);
  const qualifying = bandable.filter(isQualifying);
  const displayBand =
    down.applies && down.band_before ? down.band_before : base;
  const supportBand =
    down.applies && down.support_band ? down.support_band : base;
  const recheck = recheckState(ordered, options.all_events || ordered, options);
  return {
    skill_id: skillId,
    domain: meta.domain,
    provisional: meta.provisional === true,
    bandable: true,
    display_band: displayBand,
    support_band: supportBand,
    confidence: meta.provisional === true && bandable.length > 0 ? 'provisional' : 'standard',
    evidence_count: ordered.length,
    qualifying_count: qualifying.length,
    session_count: uniqueSessionCount(qualifying),
    day_count: uniqueDayCount(qualifying),
    format_count: new Set(qualifying.map(formatKey).filter(Boolean)).size,
    last_two_qualifying:
      bandable.slice(-BAND_RULE.last_events).length === BAND_RULE.last_events &&
      bandable.slice(-BAND_RULE.last_events).every(isQualifying),
    contradiction_blocked: contradiction.blocked,
    contradiction_at: contradiction.at,
    contradiction_qualifying_after: contradiction.qualifying_after,
    silent_catch_up: down.applies === true,
    down_from: down.applies ? down.band_before ?? null : null,
    down_to: down.applies ? down.support_band ?? null : null,
    down_at: down.applies ? down.trigger_day ?? null : null,
    down_cooldown_capped: down.applies === true && down.cooldown_capped === true,
    recheck_due: recheck.due,
    recheck_reason: recheck.reason,
    recheck_sessions_since: recheck.sessions_since,
    recheck_days_since: recheck.days_since,
    band_before_down: down.band_before ?? null,
  };
}

export function evaluateBands(evidence, skillMetaById = {}, options = {}) {
  const all = Array.isArray(evidence) ? evidence : [];
  const grouped = new Map();
  for (const event of all) {
    if (!event || typeof event.skill_id !== 'string' || event.skill_id.length === 0) {
      continue;
    }
    const current = grouped.get(event.skill_id) ?? [];
    current.push(event);
    grouped.set(event.skill_id, current);
  }
  const skills = [];
  const behaviourNotes = [];
  for (const [skillId, skillEvents] of [...grouped.entries()].sort((left, right) =>
    left[0].localeCompare(right[0])
  )) {
    const meta = skillMetaById[skillId];
    const inferredDomain =
      meta?.domain || skillEvents.find((event) => typeof event.domain === 'string')?.domain || 'unknown';
    const bandable =
      meta?.bandable !== false &&
      inferredDomain !== 'sel' &&
      inferredDomain !== 'motor' &&
      skillEvents.some((event) => event.bandable !== false);
    if (!bandable) {
      const latest = sortEvidence(skillEvents).slice(-1)[0];
      if (latest) {
        behaviourNotes.push({
          skill_id: skillId,
          domain: inferredDomain,
          date: latest.date ?? null,
          observable_behaviour: latest.observable_behaviour ?? null,
        });
      }
      continue;
    }
    skills.push(
      evaluateSkillBand(
        skillId,
        skillEvents,
        { domain: inferredDomain, provisional: meta?.provisional === true },
        { ...options, all_events: all }
      )
    );
  }
  return { skills, behaviour_notes: behaviourNotes };
}
