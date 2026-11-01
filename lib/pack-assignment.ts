import { File, Paths } from 'expo-file-system';
import {
  ASSIGNMENT_FILE_PREFIX,
  ASSIGNMENT_TRIGGER_AUTOMATIC_FINISH,
  isPackAssignmentRecord,
} from './pack-assignment-resolution.js';

export interface PackAssignment {
  profile_id: string;
  assigned_pack_id: string;
  graduated_from_pack_id: string;
  graduated_at: string;
  trigger: string;
}

export { ASSIGNMENT_TRIGGER_AUTOMATIC_FINISH };

function assignmentFile(profileId: string): File {
  return new File(Paths.document, `${ASSIGNMENT_FILE_PREFIX}${profileId}.json`);
}

function tempAssignmentFile(profileId: string): File {
  return new File(Paths.document, `${ASSIGNMENT_FILE_PREFIX}${profileId}.json.tmp`);
}

const cachedAssignments = new Map<string, PackAssignment | null>();

export function loadPackAssignment(profileId: string): PackAssignment | null {
  if (cachedAssignments.has(profileId)) {
    return cachedAssignments.get(profileId) ?? null;
  }
  const record = readPackAssignmentUncached(profileId);
  cachedAssignments.set(profileId, record);
  return record;
}

function readPackAssignmentUncached(profileId: string): PackAssignment | null {
  try {
    const file = assignmentFile(profileId);
    if (!file.exists) {
      return null;
    }
    const parsed: unknown = JSON.parse(file.textSync());
    if (!isPackAssignmentRecord(parsed)) {
      return null;
    }
    return {
      profile_id: parsed.profile_id,
      assigned_pack_id: parsed.assigned_pack_id,
      graduated_from_pack_id: parsed.graduated_from_pack_id,
      graduated_at: parsed.graduated_at,
      trigger: parsed.trigger,
    };
  } catch {
    return null;
  }
}

export function savePackAssignment(assignment: PackAssignment): boolean {
  try {
    const tempFile = tempAssignmentFile(assignment.profile_id);
    if (tempFile.exists) {
      tempFile.delete();
    }
    tempFile.writeSync(JSON.stringify(assignment));
    tempFile.moveSync(assignmentFile(assignment.profile_id), { overwrite: true });
    invalidatePackAssignmentCache(assignment.profile_id);
    return true;
  } catch {
    return false;
  }
}

export function clearPackAssignment(profileId: string): void {
  try {
    const file = assignmentFile(profileId);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // fail-safe: never crash on cleanup
  } finally {
    invalidatePackAssignmentCache(profileId);
  }
}

export function invalidatePackAssignmentCache(profileId?: string): void {
  if (typeof profileId === 'string') {
    cachedAssignments.delete(profileId);
    return;
  }
  cachedAssignments.clear();
}
