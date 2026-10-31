import { File, Paths } from 'expo-file-system';

export const DEFAULT_PROFILE_ID = 'default';

export interface MissionOfferState {
  profile_id: string;
  last_offer_day_key: string | null;
  last_offered_mission_id: string | null;
  saved_date: string | null;
}

const DEFAULT_STATE: MissionOfferState = {
  profile_id: DEFAULT_PROFILE_ID,
  last_offer_day_key: null,
  last_offered_mission_id: null,
  saved_date: null,
};

function stateFile(profileId: string): File {
  return new File(Paths.document, `mission-offer-state-${profileId}.json`);
}

function isMissionOfferState(value: unknown): value is MissionOfferState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const state = value as Record<string, unknown>;
  return (
    typeof state.profile_id === 'string' &&
    (state.last_offer_day_key === null || typeof state.last_offer_day_key === 'string') &&
    (state.last_offered_mission_id === null ||
      typeof state.last_offered_mission_id === 'string') &&
    (state.saved_date === null || typeof state.saved_date === 'string')
  );
}

export function loadMissionOfferState(profileId = DEFAULT_PROFILE_ID): MissionOfferState {
  try {
    const file = stateFile(profileId);
    if (!file.exists) {
      return { ...DEFAULT_STATE, profile_id: profileId };
    }
    const parsed: unknown = JSON.parse(file.textSync());
    if (!isMissionOfferState(parsed)) {
      return { ...DEFAULT_STATE, profile_id: profileId };
    }
    return { ...parsed, profile_id: parsed.profile_id || profileId };
  } catch {
    return { ...DEFAULT_STATE, profile_id: profileId };
  }
}

export function recordMissionOffer(
  missionId: string,
  dayKey: string,
  profileId = DEFAULT_PROFILE_ID
): MissionOfferState | null {
  try {
    const current = loadMissionOfferState(profileId);
    const next: MissionOfferState = {
      ...current,
      profile_id: profileId,
      last_offer_day_key: dayKey,
      last_offered_mission_id: missionId,
      saved_date: new Date().toISOString(),
    };
    stateFile(profileId).writeSync(JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}
