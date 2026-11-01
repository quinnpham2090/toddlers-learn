import { File, Paths } from 'expo-file-system';
import { DEFAULT_PROFILE_ID } from './path-state';

export type SkillBand = 'not-yet-explored' | 'exploring' | 'practising' | 'confident';

export type EvidenceSource = 'session';

export interface SkillEvidenceRecord {
  id: string;
  skill_id: string;
  scaffold_level_at_completion: number;
  completed_with_help: boolean;
  date: string;
  source: EvidenceSource;
  participation?: boolean;
}

export interface NewSkillEvidence {
  skill_id: string;
  scaffold_level_at_completion: number;
  completed_with_help: boolean;
  participation?: boolean;
}

const LEGACY_STORE_FILE_NAME = 'skill-evidence.json';

function storeFileName(profileId: string): string {
  return `skill-evidence-${profileId}.json`;
}

function storeFile(profileId: string): File {
  return new File(Paths.document, storeFileName(profileId));
}

/**
 * One-time, non-destructive migration: on first read for the DEFAULT profile,
 * if the per-profile file is absent but the legacy global file exists, copy it
 * across. The legacy file is never deleted by the app (a human can remove it
 * later) and is ignored by every reader once the per-profile file exists.
 */
function migrateLegacyEvidenceForDefaultProfile(profileId: string): void {
  if (profileId !== DEFAULT_PROFILE_ID) {
    return;
  }
  try {
    const target = storeFile(profileId);
    if (target.exists) {
      return;
    }
    const legacy = new File(Paths.document, LEGACY_STORE_FILE_NAME);
    if (!legacy.exists) {
      return;
    }
    target.writeSync(legacy.textSync());
  } catch {
    // fail-safe: migration must never crash a read
  }
}

function isSkillEvidenceRecord(value: unknown): value is SkillEvidenceRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.skill_id === 'string' &&
    typeof record.scaffold_level_at_completion === 'number' &&
    typeof record.completed_with_help === 'boolean' &&
    typeof record.date === 'string' &&
    record.source === 'session' &&
    (record.participation === undefined || typeof record.participation === 'boolean')
  );
}

export function loadSkillEvidence(profileId: string = DEFAULT_PROFILE_ID): SkillEvidenceRecord[] {
  try {
    migrateLegacyEvidenceForDefaultProfile(profileId);
    const file = storeFile(profileId);
    if (!file.exists) {
      return [];
    }
    const parsed: unknown = JSON.parse(file.textSync());
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isSkillEvidenceRecord);
  } catch {
    return [];
  }
}

function maxEvidenceId(existing: SkillEvidenceRecord[]): number {
  let max = 0;
  for (const record of existing) {
    const match = /^skill-evidence-(\d+)$/.exec(record.id);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return max;
}

export function recordStepEvidence(
  entries: NewSkillEvidence[],
  profileId: string = DEFAULT_PROFILE_ID
): SkillEvidenceRecord[] | null {
  if (entries.length === 0) {
    return [];
  }
  try {
    const existing = loadSkillEvidence(profileId);
    const date = new Date().toISOString();
    let counter = maxEvidenceId(existing);
    const records: SkillEvidenceRecord[] = entries.map((entry) => {
      counter += 1;
      return {
        id: `skill-evidence-${counter}`,
        ...entry,
        date,
        source: 'session',
      };
    });
    storeFile(profileId).writeSync(JSON.stringify([...existing, ...records]));
    return records;
  } catch {
    return null;
  }
}

export function clearSkillEvidence(profileId: string = DEFAULT_PROFILE_ID): void {
  try {
    const file = storeFile(profileId);
    if (file.exists) {
      file.delete();
    }
  } catch {
    return;
  }
}

export function deriveSkillBand(evidence: SkillEvidenceRecord[]): SkillBand {
  if (evidence.length === 0) {
    return 'not-yet-explored';
  }
  const independent = evidence.filter((record) => !record.completed_with_help);
  if (independent.length === 0) {
    return 'exploring';
  }
  if (independent.length >= 3) {
    return 'confident';
  }
  return 'practising';
}

export function groupEvidenceBySkill(
  evidence: SkillEvidenceRecord[]
): Map<string, SkillEvidenceRecord[]> {
  const grouped = new Map<string, SkillEvidenceRecord[]>();
  for (const record of evidence) {
    const current = grouped.get(record.skill_id);
    if (current) {
      current.push(record);
    } else {
      grouped.set(record.skill_id, [record]);
    }
  }
  return grouped;
}

export { loadTogetherCompletions } from './together-store';
export type { TogetherCompletion } from './together-store';
