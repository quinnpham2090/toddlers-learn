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
 *  - within a skill, never offer the same mission twice in a row (with the recorded
 *    last-offered id this also yields least-recently-offered rotation between two
 *    missions that share a skill);
 *  - no matching mission => no offer (and the caller must not consume the day).
 *
 * Pure: no I/O, no side effects — returning null cannot consume a day.
 */
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

  for (const skillId of completedSkillIds) {
    const pool = eligible
      .filter((mission) => mission.skill_id === skillId)
      .map((mission) => mission.id)
      .sort();
    if (pool.length === 0) {
      continue;
    }
    const fresh = pool.filter((id) => id !== lastOfferedMissionId);
    if (fresh.length > 0) {
      return { missionId: fresh[0], skillId };
    }
  }
  return null;
}
