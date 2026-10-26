import { File, Paths } from 'expo-file-system';

export interface ParentSettings {
  missions_enabled: boolean;
}

const STORE_FILE_NAME = 'parent-settings.json';
const DEFAULT_SETTINGS: ParentSettings = { missions_enabled: true };

function storeFile(): File {
  return new File(Paths.document, STORE_FILE_NAME);
}

function isParentSettings(value: unknown): value is ParentSettings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const settings = value as Record<string, unknown>;
  return typeof settings.missions_enabled === 'boolean';
}

export function loadParentSettings(): ParentSettings {
  try {
    const file = storeFile();
    if (!file.exists) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed: unknown = JSON.parse(file.textSync());
    return isParentSettings(parsed) ? parsed : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveParentSettings(settings: ParentSettings): ParentSettings | null {
  try {
    storeFile().writeSync(JSON.stringify(settings));
    return { ...settings };
  } catch {
    return null;
  }
}
