import type { Band, BandEvidence, BandSkillMeta, BandSkillResult, BandBehaviourNote } from './bands';

export interface PathLessonLike {
  id: string;
  primary_skill_id: string;
  age_band: string;
}

export interface PathQueueItem {
  kind: 'path' | 'child-choice';
  branch:
    | 'catch-up'
    | 'consolidation'
    | 'advancement'
    | 'breadth'
    | 'entry'
    | 'bridge'
    | 'child-choice';
  skill_id: string | null;
  source_skill_id: string | null;
  source_errand_ids: string[];
  adventure_skill_ids: string[];
  domain: string | null;
  from_band: Band | null;
  support_band: Band | null;
  display_band: Band | null;
  silent_catch_up: boolean;
  provisional: boolean;
  lesson_id: string | null;
  lesson_skill_id: string | null;
  context: string | null;
  reason: string | null;
  oldest_date: string | null;
  bridge_from_domain: string | null;
  bridge_to_domain: string | null;
  candidates: string[];
}

export interface PathContinuityEntry {
  adventure_skill_id: string;
  adventure_errand_ids: string[];
  path_skill_id: string;
  first_path_item_skill_id: string;
  branch: string;
  from_band: Band | null;
  display_band: Band | null;
  provisional: boolean;
}

export interface PathQueueInput {
  evidence: BandEvidence[];
  skillMetaById?: Record<string, BandSkillMeta>;
  age?: number;
  lessons?: PathLessonLike[];
  totalSessions?: number;
  todayKey?: string;
  sparseLaunch?: boolean;
}

export interface PathSessionOption {
  skill_id: string;
  branch: string;
  domain: string;
  lesson_id: string;
}

export interface PathQueueResult {
  age: number;
  sparse_launch: boolean;
  launched_provisionally: boolean;
  total_sessions: number;
  items: PathQueueItem[];
  band_results: BandSkillResult[];
  behaviour_notes: BandBehaviourNote[];
  session_options: PathSessionOption[];
  content_gap_skill_ids: string[];
  unresolved_skill_ids: string[];
  age_filtered_skill_ids: string[];
  continuity: {
    entries: PathContinuityEntry[];
    first_by_domain: Array<PathContinuityEntry & { domain: string }>;
    missing_adventure_skills: string[];
  };
  domains: string[];
  fingerprint: string;
  validation: {
    ok: boolean;
    issues: string[];
  };
}

export function buildPathQueue(input: PathQueueInput): PathQueueResult;
