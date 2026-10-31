/**
 * Mission offer selection (pure, Node-safe).
 *
 * Single source of truth for "which mission (if any) is offered after a completed
 * post-adventure path lesson". The hub calls this; dev-harness/mission-offer-drill.js
 * exercises the same function, so the proof cannot drift from the app.
 *
 * Rules (founder-approved design):
 *  - offer only for age band 3-4 (child age AND the mission's own age_band);
 *  - at most one offer per visit-day (local-date key): a day already offered is refused;
 *  - prefer the just-practised lesson's skills, primary first;
 *  - within a skill, never offer the same mission on BACK-TO-BACK calendar days: the
 *    last-offered mission is blocked only when its offer day is exactly one calendar
 *    day before today (local YYYY-MM-DD arithmetic, month/year boundaries included).
 *    A gap of two or more days allows the same mission again, so a single-mission
 *    skill is not starved; with two same-skill missions this also yields
 *    least-recently-offered rotation;
 *  - no matching mission => no offer (and the caller must not consume the day).
 *
 * Pure: no I/O, no side effects — returning null cannot consume a day.
 */
function dayNumber(key) {
  if (typeof key !== 'string') {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }
  return Math.floor(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000
  );
}

function isPreviousCalendarDay(previousKey, todayKey) {
  const previous = dayNumber(previousKey);
  const today = dayNumber(todayKey);
  if (previous === null || today === null) {
    return false;
  }
  return today - previous === 1;
}

function parseAgeBand(band) {
  if (typeof band !== 'string') {
    return null;
  }
  const match = /^(\d+)-(\d+)$/.exec(band);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null;
}

export function selectMissionOffer(input) {
  const source = input ?? {};
  const missions = Array.isArray(source.missions) ? source.missions : [];
  const completedSkillIds = Array.isArray(source.completedSkillIds) ? source.completedSkillIds : [];
  const age = source.age;
  const todayKey = source.todayKey;
  const lastOfferDayKey = source.lastOfferDayKey ?? null;
  const lastOfferedMissionId = source.lastOfferedMissionId ?? null;

  if (typeof age !== 'number' || age < 3 || age > 4) {
    return null;
  }
  if (typeof todayKey !== 'string' || todayKey.length === 0 || lastOfferDayKey === todayKey) {
    return null;
  }

  const eligible = missions.filter((mission) => {
    if (!mission || typeof mission.id !== 'string' || typeof mission.skill_id !== 'string') {
      return false;
    }
    const band = parseAgeBand(mission.age_band);
    return band !== null && age >= band.min && age <= band.max;
  });

  const backToBack = isPreviousCalendarDay(lastOfferDayKey, todayKey);

  for (const skillId of completedSkillIds) {
    const pool = eligible
      .filter((mission) => mission.skill_id === skillId)
      .map((mission) => mission.id)
      .sort();
    if (pool.length === 0) {
      continue;
    }
    const fresh = pool.filter(
      (id) => !(backToBack && id === lastOfferedMissionId)
    );
    if (fresh.length > 0) {
      return { missionId: fresh[0], skillId };
    }
  }
  return null;
}
