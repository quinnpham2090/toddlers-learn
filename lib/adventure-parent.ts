import { File, Paths } from 'expo-file-system';

export interface AdventureQuestionnaire {
  age: number;
  languages: string[];
  english_at_home: boolean;
  preschool: string;
  speech_concern: boolean;
  motor_concern: boolean;
  interests: string[];
  saved_date: string;
}

const STORE_FILE_NAME = 'adventure-parent.json';

function storeFile(): File {
  return new File(Paths.document, STORE_FILE_NAME);
}

function isQuestionnaire(value: unknown): value is AdventureQuestionnaire {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.age === 'number' &&
    Array.isArray(record.languages) &&
    record.languages.every((entry) => typeof entry === 'string') &&
    typeof record.english_at_home === 'boolean' &&
    typeof record.preschool === 'string' &&
    typeof record.speech_concern === 'boolean' &&
    typeof record.motor_concern === 'boolean' &&
    Array.isArray(record.interests) &&
    record.interests.every((entry) => typeof entry === 'string') &&
    typeof record.saved_date === 'string'
  );
}

export function loadAdventureQuestionnaire(): AdventureQuestionnaire | null {
  try {
    const file = storeFile();
    if (!file.exists) {
      return null;
    }
    const parsed: unknown = JSON.parse(file.textSync());
    return isQuestionnaire(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAdventureQuestionnaire(
  input: Omit<AdventureQuestionnaire, 'saved_date' | 'english_at_home'>
): AdventureQuestionnaire | null {
  try {
    const record: AdventureQuestionnaire = {
      ...input,
      english_at_home: input.languages.includes('English'),
      saved_date: new Date().toISOString(),
    };
    storeFile().writeSync(JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

export function englishErrandsEnabled(questionnaire: AdventureQuestionnaire | null): boolean {
  if (!questionnaire) {
    return true;
  }
  return questionnaire.english_at_home;
}

export function adventureAge(questionnaire: AdventureQuestionnaire | null): number {
  return questionnaire ? questionnaire.age : 3;
}
