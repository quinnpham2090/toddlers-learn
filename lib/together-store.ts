import { File, Paths } from 'expo-file-system';

export type TogetherKind = 'mission' | 'routine';

export interface TogetherCompletion {
  id: string;
  kind: TogetherKind;
  item_id: string;
  date: string;
  alternative_level_used?: number;
}

const STORE_FILE_NAME = 'together-completions.json';
const KINDS: TogetherKind[] = ['mission', 'routine'];

function storeFile(): File {
  return new File(Paths.document, STORE_FILE_NAME);
}

function isTogetherCompletion(value: unknown): value is TogetherCompletion {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    KINDS.includes(record.kind as TogetherKind) &&
    typeof record.item_id === 'string' &&
    typeof record.date === 'string' &&
    (record.alternative_level_used === undefined ||
      typeof record.alternative_level_used === 'number')
  );
}

export function loadTogetherCompletions(): TogetherCompletion[] {
  try {
    const file = storeFile();
    if (!file.exists) {
      return [];
    }
    const parsed: unknown = JSON.parse(file.textSync());
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isTogetherCompletion);
  } catch {
    return [];
  }
}

function nextCompletionId(existing: TogetherCompletion[]): string {
  let max = 0;
  for (const record of existing) {
    const match = /^together-completion-(\d+)$/.exec(record.id);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `together-completion-${max + 1}`;
}

export function recordCompletion(
  kind: TogetherKind,
  itemId: string,
  alternativeLevelUsed?: number
): TogetherCompletion | null {
  try {
    const existing = loadTogetherCompletions();
    const record: TogetherCompletion = {
      id: nextCompletionId(existing),
      kind,
      item_id: itemId,
      date: new Date().toISOString(),
    };
    if (kind === 'mission' && alternativeLevelUsed !== undefined) {
      record.alternative_level_used = alternativeLevelUsed;
    }
    storeFile().writeSync(JSON.stringify([...existing, record]));
    return record;
  } catch {
    return null;
  }
}
