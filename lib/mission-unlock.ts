import { loadAdventureState } from './adventure-store';
import { DEFAULT_PROFILE_ID, loadPathState } from './path-state';

export function missionsUnlocked(profileId = DEFAULT_PROFILE_ID): boolean {
  const adventure = loadAdventureState();
  if (!adventure.completed) {
    return false;
  }
  const path = loadPathState(profileId);
  return path.first_path_session_completed_at !== null;
}
