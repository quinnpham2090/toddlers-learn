export interface MissionOfferCandidate {
  id: string;
  skill_id: string;
  age_band: string;
}

export interface MissionOfferInput {
  missions: MissionOfferCandidate[];
  completedSkillIds: string[];
  age: number;
  todayKey: string;
  lastOfferDayKey?: string | null;
  lastOfferedMissionId?: string | null;
}

export interface MissionOfferSelection {
  missionId: string;
  skillId: string;
}

export function selectMissionOffer(
  input: MissionOfferInput | null | undefined
): MissionOfferSelection | null;
