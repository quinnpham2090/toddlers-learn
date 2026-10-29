import { File, Paths } from 'expo-file-system';

export const DEFAULT_PROFILE_ID = 'default';

export interface PathState {
  profile_id: string;
  first_path_session_completed_at: string | null;
  completed_path_sessions: number;
  saved_date: string | null;
}

const DEFAULT_STATE: PathState = {
  profile_id: DEFAULT_PROFILE_ID,
  first_path_session_completed_at: null,
  completed_path_sessions: 0,
  saved_date: null,
};

function stateFile(profileId: string): File {
  return new File(Paths.document, `path-state-${profileId}.json`);
}

function isPathState(value: unknown): value is PathState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const state = value as Record<string, unknown>;
  return (
    typeof state.profile_id === 'string' &&
    (state.first_path_session_completed_at === null ||
      typeof state.first_path_session_completed_at === 'string') &&
    typeof state.completed_path_sessions === 'number' &&
    (state.saved_date === null || typeof state.saved_date === 'string')
  );
}

export function loadPathState(profileId = DEFAULT_PROFILE_ID): PathState {
  try {
    const file = stateFile(profileId);
    if (!file.exists) {
      return { ...DEFAULT_STATE, profile_id: profileId };
    }
    const parsed: unknown = JSON.parse(file.textSync());
    if (!isPathState(parsed)) {
      return { ...DEFAULT_STATE, profile_id: profileId };
    }
    return {
      ...parsed,
      profile_id: parsed.profile_id || profileId,
      completed_path_sessions:
        typeof parsed.completed_path_sessions === 'number' ? parsed.completed_path_sessions : 0,
    };
  } catch {
    return { ...DEFAULT_STATE, profile_id: profileId };
  }
}

export function markPathSessionCompleted(
  profileId = DEFAULT_PROFILE_ID
): PathState | null {
  try {
    const current = loadPathState(profileId);
    const now = new Date().toISOString();
    const next: PathState = {
      ...current,
      profile_id: profileId,
      first_path_session_completed_at: current.first_path_session_completed_at ?? now,
      completed_path_sessions: current.completed_path_sessions + 1,
      saved_date: now,
    };
    stateFile(profileId).writeSync(JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}
