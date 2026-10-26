import { SongPitch, SongTemplateRecord, getString } from './pack-loader';

export interface CompletedNoteEvent {
  slot_index: number;
  pitch: SongPitch;
  authored_by_slot: 'template' | 'child_slot';
}

export interface PentatonicSetDefinition {
  pads: SongPitch[];
  tonic: SongPitch;
}

const PENTATONIC_SETS: Partial<Record<string, PentatonicSetDefinition>> = {
  c_major_pentatonic: {
    pads: ['C4', 'D4', 'E4', 'G4', 'A4'],
    tonic: 'C4',
  },
};

export function getPentatonicSet(template: SongTemplateRecord): PentatonicSetDefinition | undefined {
  return PENTATONIC_SETS[template.pentatonic_set_id];
}

export function completeSong(
  template: SongTemplateRecord,
  childNotes: SongPitch[]
): CompletedNoteEvent[] | null {
  if (childNotes.length !== template.child_slots) {
    return null;
  }
  if (template.note_slots_total < template.child_slots) {
    return null;
  }
  if (template.base_notes.length < template.note_slots_total) {
    return null;
  }
  if (template.completion_rule_id !== 'resolve_to_tonic') {
    return null;
  }
  const set = getPentatonicSet(template);
  if (!set) {
    return null;
  }
  const events: CompletedNoteEvent[] = [];
  for (let slot = 0; slot < template.child_slots; slot += 1) {
    events.push({
      slot_index: slot,
      pitch: childNotes[slot],
      authored_by_slot: 'child_slot',
    });
  }
  for (let slot = template.child_slots; slot < template.note_slots_total; slot += 1) {
    const base = template.base_notes[slot];
    const isFinalSlot = slot === template.note_slots_total - 1;
    events.push({
      slot_index: slot,
      pitch: isFinalSlot && base !== set.tonic ? set.tonic : base,
      authored_by_slot: 'template',
    });
  }
  return events;
}

export function nextNameWordIndices(
  template: SongTemplateRecord,
  savedSongCount: number
): number[] {
  const adjectiveCount = Math.max(1, template.wordlists.adjective_refs.length);
  const nounCount = Math.max(1, template.wordlists.noun_refs.length);
  return [savedSongCount % adjectiveCount, savedSongCount % nounCount];
}

export function deriveSongTitle(
  template: SongTemplateRecord,
  nameWordIndices: number[]
): string {
  const adjectives = template.wordlists.adjective_refs;
  const adjective =
    adjectives.length > 0 ? getString(adjectives[nameWordIndices[0] % adjectives.length]) : '';
  const lessonWord = getString(template.lesson_word_ref);
  if (adjective.length === 0) {
    return `My ${lessonWord} Song`;
  }
  return `My ${adjective} ${lessonWord} Song`;
}
