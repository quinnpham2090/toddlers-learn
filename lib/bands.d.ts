export type Band = 'not-yet-explored' | 'exploring' | 'practising' | 'confident';

export type BandDomain =
  | 'language'
  | 'maths'
  | 'music'
  | 'science'
  | 'sel'
  | 'motor'
  | 'unknown';

export interface BandEvidence {
  id?: string;
  skill_id: string;
  scaffold_level: number;
  weight?: 'strong' | 'participation';
  completed_with_help?: boolean;
  completedWithHelp?: boolean;
  bandable?: boolean;
  date: string;
  session_id?: string;
  sessionId?: string;
  format_key?: string;
  formatKey?: string;
  variant_id?: string;
  variantId?: string;
  domain?: string;
  provisional?: boolean;
  observable_behaviour?: string | null;
  source?: 'adventure' | 'lesson';
  source_skill_id?: string;
  source_errand_id?: string;
}

export interface BandSkillMeta {
  domain: string;
  provisional?: boolean;
  bandable?: boolean;
}

export interface BandSkillResult {
  skill_id: string;
  domain: string;
  provisional: boolean;
  bandable: true;
  display_band: Band;
  support_band: Band;
  confidence: 'standard' | 'provisional';
  evidence_count: number;
  qualifying_count: number;
  session_count: number;
  day_count: number;
  format_count: number;
  last_two_qualifying: boolean;
  contradiction_blocked: boolean;
  contradiction_at: string | null;
  contradiction_qualifying_after: number;
  silent_catch_up: boolean;
  down_from: Band | null;
  down_to: Band | null;
  down_at: string | null;
  down_cooldown_capped: boolean;
  recheck_due: boolean;
  recheck_reason: 'sessions' | 'days' | null;
  recheck_sessions_since: number;
  recheck_days_since: number;
  band_before_down: Band | null;
}

export interface BandBehaviourNote {
  skill_id: string;
  domain: string;
  date: string | null;
  observable_behaviour: string | null;
}

export interface BandEvaluation {
  skills: BandSkillResult[];
  behaviour_notes: BandBehaviourNote[];
}

export const BAND_ORDER: Band[];
export const BAND_RULE: Readonly<Record<string, number>>;
export function evaluateSkillBand(
  skillId: string,
  skillEvents: BandEvidence[],
  meta: BandSkillMeta,
  options?: Record<string, unknown>
): BandSkillResult;
export function evaluateBands(
  evidence: BandEvidence[],
  skillMetaById?: Record<string, BandSkillMeta>,
  options?: Record<string, unknown>
): BandEvaluation;
