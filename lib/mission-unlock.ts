import { getJourneyStopSkills } from './pack-loader';
import { loadAdventureState } from './adventure-store';
import { loadSkillEvidence } from './progress-store';
import { DEFAULT_PROFILE_ID, loadPathState, markPathSessionCompleted } from './path-state';

export function missionsUnlocked(profileId = DEFAULT_PROFILE_ID): boolean {
  const adventure = loadAdventureState();
  if (!adventure.completed) {
    return false;
  }
  const path = loadPathState(profileId);
  return path.first_path_session_completed_at !== null;
}

export function journeyLessonsAllEvidenced(): boolean {
  const journeySkills = getJourneyStopSkills();
  if (journeySkills.length === 0) {
    return false;
  }
  const evidenced = new Set(loadSkillEvidence().map((record) => record.skill_id));
  return journeySkills.every((skill) => evidenced.has(skill.id));
}

export function reconcileMissionUnlockGate(profileId = DEFAULT_PROFILE_ID): boolean {
  const adventure = loadAdventureState();
  if (!adventure.completed) {
    return false;
  }
  if (journeyLessonsAllEvidenced()) {
    const path = loadPathState(profileId);
    if (path.first_path_session_completed_at === null) {
      markPathSessionCompleted(profileId);
    }
    return true;
  }
  return missionsUnlocked(profileId);
}
