import { File, Paths } from 'expo-file-system';

export interface SessionBookmark {
  lesson_id: string;
  step_index: number;
  date: string;
}

const STORE_FILE_NAME = 'session-bookmark.json';

function storeFile(): File {
  return new File(Paths.document, STORE_FILE_NAME);
}

function isSessionBookmark(value: unknown): value is SessionBookmark {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const bookmark = value as Record<string, unknown>;
  return (
    typeof bookmark.lesson_id === 'string' &&
    typeof bookmark.step_index === 'number' &&
    typeof bookmark.date === 'string'
  );
}

export function loadSessionBookmark(): SessionBookmark | null {
  try {
    const file = storeFile();
    if (!file.exists) {
      return null;
    }
    const parsed: unknown = JSON.parse(file.textSync());
    return isSessionBookmark(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setSessionBookmark(lessonId: string, stepIndex: number): SessionBookmark | null {
  try {
    const bookmark: SessionBookmark = {
      lesson_id: lessonId,
      step_index: stepIndex,
      date: new Date().toISOString(),
    };
    storeFile().writeSync(JSON.stringify(bookmark));
    return bookmark;
  } catch {
    return null;
  }
}

export function clearSessionBookmark(): void {
  try {
    const file = storeFile();
    if (file.exists) {
      file.delete();
    }
  } catch {
    return;
  }
}
