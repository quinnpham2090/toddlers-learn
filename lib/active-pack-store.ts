import { File, Paths } from 'expo-file-system';
import { OVERRIDE_FILE_NAME, isActivePackOverrideRecord } from './pack-activation-resolution.js';

export interface ActivePackOverride {
  active_pack_id: string;
  previous_pack_id: string | null;
  updated_at: string;
}

function overrideFile(): File {
  return new File(Paths.document, OVERRIDE_FILE_NAME);
}

function tempOverrideFile(): File {
  return new File(Paths.document, `${OVERRIDE_FILE_NAME}.tmp`);
}

export function loadActivePackOverride(): ActivePackOverride | null {
  try {
    const file = overrideFile();
    if (!file.exists) {
      return null;
    }
    const parsed: unknown = JSON.parse(file.textSync());
    if (!isActivePackOverrideRecord(parsed)) {
      return null;
    }
    return {
      active_pack_id: parsed.active_pack_id,
      previous_pack_id: parsed.previous_pack_id,
      updated_at: parsed.updated_at,
    };
  } catch {
    return null;
  }
}

export function saveActivePackOverride(override: ActivePackOverride): boolean {
  try {
    const tempFile = tempOverrideFile();
    if (tempFile.exists) {
      tempFile.delete();
    }
    tempFile.writeSync(JSON.stringify(override));
    tempFile.moveSync(overrideFile(), { overwrite: true });
    return true;
  } catch {
    return false;
  }
}

export function clearActivePackOverride(): void {
  try {
    const file = overrideFile();
    if (file.exists) {
      file.delete();
    }
  } catch {
    return;
  }
}
