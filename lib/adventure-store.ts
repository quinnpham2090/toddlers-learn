import { File, Paths } from 'expo-file-system';

export type AdventureWeight = 'strong' | 'participation';

export interface AdventureEvidenceRecord {
  id: string;
  skill_id: string;
  stop_id: string;
  errand_id: string;
  variant_id: string;
  scaffold_level: number;
  weight: AdventureWeight;
  bandable: boolean;
  observable_behaviour: string;
  date: string;
  source: 'adventure';
}

export interface NewAdventureEvidence {
  skill_id: string;
  stop_id: string;
  errand_id: string;
  variant_id: string;
  scaffold_level: number;
  weight: AdventureWeight;
  bandable: boolean;
  observable_behaviour: string;
}

export interface AdventureState {
  started_day: string | null;
  visit_days: string[];
  last_visit_day: string | null;
  done_stop_ids: string[];
  in_progress_stop_id: string | null;
  next_errand_index: number;
  completed: boolean;
  used_variants: Record<string, string[]>;
  day_key: string | null;
  stops_today: number;
  activities_today: number;
}

const EVIDENCE_FILE = 'adventure-evidence.json';
const STATE_FILE = 'adventure-state.json';

export function adventureLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_STATE: AdventureState = {
  started_day: null,
  visit_days: [],
  last_visit_day: null,
  done_stop_ids: [],
  in_progress_stop_id: null,
  next_errand_index: 0,
  completed: false,
  used_variants: {},
  day_key: null,
  stops_today: 0,
  activities_today: 0,
};

function evidenceFile(): File {
  return new File(Paths.document, EVIDENCE_FILE);
}

function stateFile(): File {
  return new File(Paths.document, STATE_FILE);
}

function isEvidenceRecord(value: unknown): value is AdventureEvidenceRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.skill_id === 'string' &&
    typeof record.stop_id === 'string' &&
    typeof record.errand_id === 'string' &&
    typeof record.variant_id === 'string' &&
    typeof record.scaffold_level === 'number' &&
    (record.weight === 'strong' || record.weight === 'participation') &&
    typeof record.bandable === 'boolean' &&
    typeof record.observable_behaviour === 'string' &&
    typeof record.date === 'string' &&
    record.source === 'adventure'
  );
}

export function loadAdventureEvidence(): AdventureEvidenceRecord[] {
  try {
    const file = evidenceFile();
    if (!file.exists) {
      return [];
    }
    const parsed: unknown = JSON.parse(file.textSync());
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isEvidenceRecord);
  } catch {
    return [];
  }
}

function nextEvidenceId(existing: AdventureEvidenceRecord[]): number {
  let max = 0;
  for (const record of existing) {
    const match = /^adventure-evidence-(\d+)$/.exec(record.id);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return max;
}

export function recordAdventureEvidence(
  entry: NewAdventureEvidence
): AdventureEvidenceRecord | null {
  try {
    const existing = loadAdventureEvidence();
    const record: AdventureEvidenceRecord = {
      id: `adventure-evidence-${nextEvidenceId(existing) + 1}`,
      ...entry,
      date: new Date().toISOString(),
      source: 'adventure',
    };
    evidenceFile().writeSync(JSON.stringify([...existing, record]));
    return record;
  } catch {
    return null;
  }
}

function isAdventureState(value: unknown): value is AdventureState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const state = value as Record<string, unknown>;
  return (
    (state.started_day === null || typeof state.started_day === 'string') &&
    Array.isArray(state.visit_days) &&
    state.visit_days.every((day) => typeof day === 'string') &&
    (state.last_visit_day === null || typeof state.last_visit_day === 'string') &&
    Array.isArray(state.done_stop_ids) &&
    state.done_stop_ids.every((id) => typeof id === 'string') &&
    (state.in_progress_stop_id === null || typeof state.in_progress_stop_id === 'string') &&
    typeof state.next_errand_index === 'number' &&
    typeof state.completed === 'boolean' &&
    typeof state.used_variants === 'object' &&
    state.used_variants !== null &&
    (state.day_key === null || state.day_key === undefined || typeof state.day_key === 'string') &&
    (state.stops_today === undefined || typeof state.stops_today === 'number') &&
    (state.activities_today === undefined || typeof state.activities_today === 'number')
  );
}

export function loadAdventureState(): AdventureState {
  try {
    const file = stateFile();
    if (!file.exists) {
      return { ...DEFAULT_STATE, used_variants: {} };
    }
    const parsed: unknown = JSON.parse(file.textSync());
    if (!isAdventureState(parsed)) {
      return { ...DEFAULT_STATE, used_variants: {} };
    }
    return {
      ...parsed,
      day_key: typeof parsed.day_key === 'string' ? parsed.day_key : null,
      stops_today: typeof parsed.stops_today === 'number' ? parsed.stops_today : 0,
      activities_today: typeof parsed.activities_today === 'number' ? parsed.activities_today : 0,
    };
  } catch {
    return { ...DEFAULT_STATE, used_variants: {} };
  }
}

export function saveAdventureState(state: AdventureState): AdventureState | null {
  try {
    stateFile().writeSync(JSON.stringify(state));
    return state;
  } catch {
    return null;
  }
}

export function daysSince(startDay: string | null, todayKey: string): number {
  if (!startDay) {
    return 0;
  }
  const start = new Date(`${startDay}T00:00:00`);
  const today = new Date(`${todayKey}T00:00:00`);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return diff >= 0 ? diff : 0;
}
