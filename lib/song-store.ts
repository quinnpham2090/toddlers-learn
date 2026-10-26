import { File, Paths } from 'expo-file-system';
import { SongPitch } from './pack-loader';

export interface UserSavedSongNoteEvent {
  slot_index: number;
  pitch: SongPitch;
  authored_by_slot: 'template' | 'child_slot';
}

export interface UserSavedSong {
  id: string;
  song_template_id: string;
  name_wordlist_id: string;
  name_word_indices: number[];
  note_events: UserSavedSongNoteEvent[];
}

const STORE_FILE_NAME = 'saved-songs.json';
const PITCHES: SongPitch[] = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'];

function storeFile(): File {
  return new File(Paths.document, STORE_FILE_NAME);
}

function isNoteEvent(value: unknown): value is UserSavedSongNoteEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const event = value as Record<string, unknown>;
  return (
    typeof event.slot_index === 'number' &&
    typeof event.pitch === 'string' &&
    PITCHES.includes(event.pitch as SongPitch) &&
    (event.authored_by_slot === 'template' || event.authored_by_slot === 'child_slot')
  );
}

function isUserSavedSong(value: unknown): value is UserSavedSong {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const song = value as Record<string, unknown>;
  return (
    typeof song.id === 'string' &&
    typeof song.song_template_id === 'string' &&
    typeof song.name_wordlist_id === 'string' &&
    Array.isArray(song.name_word_indices) &&
    song.name_word_indices.every((index) => typeof index === 'number') &&
    Array.isArray(song.note_events) &&
    song.note_events.every(isNoteEvent)
  );
}

export function loadSavedSongs(): UserSavedSong[] {
  try {
    const file = storeFile();
    if (!file.exists) {
      return [];
    }
    const parsed: unknown = JSON.parse(file.textSync());
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isUserSavedSong);
  } catch {
    return [];
  }
}

function nextSongId(existing: UserSavedSong[]): string {
  let max = 0;
  for (const song of existing) {
    const match = /^saved-song-user-(\d+)$/.exec(song.id);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `saved-song-user-${max + 1}`;
}

export function saveSong(song: Omit<UserSavedSong, 'id'>): UserSavedSong | null {
  try {
    const existing = loadSavedSongs();
    const record: UserSavedSong = { id: nextSongId(existing), ...song };
    storeFile().writeSync(JSON.stringify([...existing, record]));
    return record;
  } catch {
    return null;
  }
}
