import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  SongPitch,
  SongTemplateRecord,
  getString,
  getSongTemplateById,
  getSongTemplates,
} from '../lib/pack-loader';
import {
  CompletedNoteEvent,
  completeSong,
  deriveSongTitle,
  getPentatonicSet,
  nextNameWordIndices,
} from '../lib/song-completion';
import { playNoteSequence, secondsPerNote } from '../lib/song-audio';
import { UserSavedSong, loadSavedSongs, saveSong } from '../lib/song-store';

const BACK_LABEL = 'Back';
const CLEAR_LABEL = 'Clear';
const SONGBOOK_LABEL = 'Songbook';
const PLAY_LABEL = 'Play';
const NO_TEMPLATE_MESSAGE = 'No song to compose yet.';
const NO_SET_MESSAGE = 'This song uses notes the composer cannot play yet.';
const NO_COMPLETION_MESSAGE = 'This song finishes in a way the composer cannot complete yet.';

const PAD_COLORS = [
  { soft: '#FBE7DF', deep: '#B4502F' },
  { soft: '#FBEEDD', deep: '#9A6A1F' },
  { soft: '#E1EFE8', deep: '#2B6E58' },
  { soft: '#E8F0E0', deep: '#4F7A3A' },
  { soft: '#F1E6F4', deep: '#6F4E82' },
];

function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={BACK_LABEL}
      onPress={() => router.back()}
      style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
    >
      <Text style={styles.backButtonText}>{BACK_LABEL}</Text>
    </Pressable>
  );
}

function SlotStrip({
  template,
  childNotes,
  completed,
  isTablet,
}: {
  template: SongTemplateRecord;
  childNotes: SongPitch[];
  completed: { events: CompletedNoteEvent[] } | null;
  isTablet: boolean;
}) {
  return (
    <View style={styles.slotRow}>
      {Array.from({ length: template.note_slots_total }, (_, slot) => {
        let pitch: SongPitch | null = null;
        let kind: 'child' | 'childEmpty' | 'template' | 'templateEmpty' = 'templateEmpty';
        if (slot < template.child_slots) {
          if (completed) {
            pitch = completed.events[slot]?.pitch ?? null;
            kind = 'child';
          } else if (slot < childNotes.length) {
            pitch = childNotes[slot];
            kind = 'child';
          } else {
            kind = 'childEmpty';
          }
        } else if (completed) {
          pitch = completed.events[slot]?.pitch ?? null;
          kind = 'template';
        } else if (slot < template.base_notes.length) {
          pitch = template.base_notes[slot];
          kind = 'template';
        }
        return (
          <View
            key={slot}
            style={[
              isTablet ? styles.slotTablet : styles.slot,
              kind === 'child' && styles.slotChild,
              kind === 'childEmpty' && styles.slotChildEmpty,
              kind === 'template' && styles.slotTemplate,
              kind === 'templateEmpty' && styles.slotTemplateEmpty,
            ]}
          >
            <Text
              style={[
                isTablet ? styles.slotTextTablet : styles.slotText,
                kind === 'child' && styles.slotTextChild,
                kind === 'childEmpty' && styles.slotTextEmpty,
                kind === 'template' && styles.slotTextTemplate,
                kind === 'templateEmpty' && styles.slotTextEmpty,
              ]}
            >
              {pitch ?? '\u2022'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function PadGrid({
  pads,
  isTablet,
  onPadTap,
}: {
  pads: SongPitch[];
  isTablet: boolean;
  onPadTap: (pitch: SongPitch) => void;
}) {
  return (
    <View style={isTablet ? styles.padGridTablet : styles.padGrid}>
      {pads.map((pitch, index) => {
        const colors = PAD_COLORS[index % PAD_COLORS.length];
        return (
          <Pressable
            key={pitch}
            accessibilityRole="button"
            accessibilityLabel={pitch}
            onPress={() => onPadTap(pitch)}
            style={({ pressed }) => [
              isTablet ? styles.padTablet : styles.pad,
              { backgroundColor: colors.soft, borderColor: colors.deep },
              pressed && { backgroundColor: '#F7F1E6' },
            ]}
          >
            <Text style={[isTablet ? styles.padTextTablet : styles.padText, { color: colors.deep }]}>
              {pitch}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NoteBlockRow({
  events,
  isTablet,
}: {
  events: CompletedNoteEvent[];
  isTablet: boolean;
}) {
  return (
    <View style={styles.noteBlockRow}>
      {events.map((event) => (
        <View
          key={event.slot_index}
          style={[
            isTablet ? styles.noteBlockTablet : styles.noteBlock,
            event.authored_by_slot === 'child_slot' ? styles.noteBlockChild : styles.noteBlockTemplate,
          ]}
        >
          <Text
            style={
              event.authored_by_slot === 'child_slot'
                ? styles.noteBlockChildText
                : styles.noteBlockTemplateText
            }
          >
            {event.pitch}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CompletedCard({
  title,
  events,
  isTablet,
  onPlay,
  onOpenSongbook,
}: {
  title: string;
  events: CompletedNoteEvent[];
  isTablet: boolean;
  onPlay: () => void;
  onOpenSongbook: () => void;
}) {
  return (
    <View style={isTablet ? styles.completedCardTablet : styles.completedCard}>
      <Text style={isTablet ? styles.completedTitleTablet : styles.completedTitle}>{title}</Text>
      <NoteBlockRow events={events} isTablet={isTablet} />
      <View style={styles.completedButtonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={PLAY_LABEL}
          onPress={onPlay}
          style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
        >
          <Text style={styles.playButtonText}>{PLAY_LABEL}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={SONGBOOK_LABEL}
          onPress={onOpenSongbook}
          style={({ pressed }) => [
            styles.songbookNavButton,
            pressed && styles.songbookNavButtonPressed,
          ]}
        >
          <Text style={styles.songbookNavButtonText}>{SONGBOOK_LABEL}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NoticeCard({ text, isTablet }: { text: string; isTablet: boolean }) {
  return (
    <View style={isTablet ? styles.noticeCardTablet : styles.noticeCard}>
      <Text style={isTablet ? styles.noticeTextTablet : styles.noticeText}>{text}</Text>
    </View>
  );
}

export default function ComposerScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const params = useLocalSearchParams<{ templateId: string | string[] }>();
  const templateIdParam = Array.isArray(params.templateId)
    ? params.templateId[0]
    : params.templateId;
  const template =
    (templateIdParam ? getSongTemplateById(templateIdParam) : undefined) ??
    getSongTemplates()[0];
  const set = template ? getPentatonicSet(template) : undefined;
  const [childNotes, setChildNotes] = useState<SongPitch[]>([]);
  const [completed, setCompleted] = useState<{
    events: CompletedNoteEvent[];
    title: string;
    saved: UserSavedSong | null;
  } | null>(null);

  if (!template || !set) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.scroll}>
          <View style={styles.topRow}>
            <BackButton />
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {template ? NO_SET_MESSAGE : NO_TEMPLATE_MESSAGE}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const fragmentFull = childNotes.length >= template.child_slots;
  const templateTitle = getString(template.title_ref);
  const completionBlocked = fragmentFull && completed === null;

  function handlePadTap(pitch: SongPitch) {
    playNoteSequence([pitch], secondsPerNote(template.tempo));
    if (completed !== null) {
      setCompleted(null);
      setChildNotes([pitch]);
      return;
    }
    if (childNotes.length >= template.child_slots) {
      setChildNotes([pitch]);
      return;
    }
    const next = [...childNotes, pitch];
    setChildNotes(next);
    if (next.length < template.child_slots) {
      return;
    }
    const events = completeSong(template, next);
    if (!events) {
      return;
    }
    const savedCount = loadSavedSongs().length;
    const nameWordIndices = nextNameWordIndices(template, savedCount);
    const title = deriveSongTitle(template, nameWordIndices);
    const saved = saveSong({
      song_template_id: template.id,
      name_wordlist_id: template.name_wordlist_id,
      name_word_indices: nameWordIndices,
      note_events: events,
    });
    setCompleted({ events, title, saved });
    playNoteSequence(
      events.map((event) => event.pitch),
      secondsPerNote(template.tempo)
    );
  }

  function handleClear() {
    setChildNotes([]);
    setCompleted(null);
  }

  function handleReplay() {
    if (!completed) {
      return;
    }
    playNoteSequence(
      completed.events.map((event) => event.pitch),
      secondsPerNote(template.tempo)
    );
  }

  const headerSection = (
    <View>
      <View style={styles.topRow}>
        <BackButton />
      </View>
      <Text style={isTablet ? styles.templateTitleTablet : styles.templateTitle}>
        {templateTitle}
      </Text>
      <SlotStrip
        template={template}
        childNotes={childNotes}
        completed={completed}
        isTablet={isTablet}
      />
    </View>
  );

  const composeSection = (
    <View>
      <PadGrid pads={set.pads} isTablet={isTablet} onPadTap={handlePadTap} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={CLEAR_LABEL}
        onPress={handleClear}
        style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
      >
        <Text style={styles.clearButtonText}>{CLEAR_LABEL}</Text>
      </Pressable>
    </View>
  );

  const resultSection = completed ? (
    <CompletedCard
      title={completed.title}
      events={completed.events}
      isTablet={isTablet}
      onPlay={handleReplay}
      onOpenSongbook={() => router.push('/songbook')}
    />
  ) : completionBlocked ? (
    <NoticeCard text={NO_COMPLETION_MESSAGE} isTablet={isTablet} />
  ) : null;

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollTablet}>
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>
              {headerSection}
              <View style={styles.resultWrap}>{resultSection}</View>
            </View>
            <View style={styles.tabletColumn}>
              {composeSection}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {headerSection}
        {composeSection}
        {resultSection}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF5EC',
  },
  scroll: {
    padding: 20,
    paddingBottom: 44,
  },
  scrollTablet: {
    padding: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  tabletColumns: {
    flexDirection: 'row',
    gap: 36,
    width: '100%',
    maxWidth: 1040,
    alignItems: 'flex-start',
  },
  tabletColumn: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButtonPressed: {
    backgroundColor: '#F1EADB',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33302B',
  },
  templateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 14,
  },
  templateTitleTablet: {
    fontSize: 28,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 18,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  slot: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTablet: {
    width: 56,
    height: 56,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotChild: {
    backgroundColor: '#E8A24B',
    borderColor: '#B4622D',
  },
  slotChildEmpty: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8CDB6',
  },
  slotTemplate: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7DFCE',
  },
  slotTemplateEmpty: {
    backgroundColor: '#F4EFE3',
    borderColor: '#E7DFCE',
  },
  slotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  slotTextTablet: {
    fontSize: 16,
    fontWeight: '700',
  },
  slotTextChild: {
    color: '#FFFFFF',
  },
  slotTextTemplate: {
    color: '#7A7264',
  },
  slotTextEmpty: {
    color: '#C4BBA5',
  },
  padGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14,
  },
  padGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 18,
  },
  pad: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padTablet: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padText: {
    fontSize: 17,
    fontWeight: '800',
  },
  padTextTablet: {
    fontSize: 21,
    fontWeight: '800',
  },
  clearButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#9A6A1F',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  clearButtonPressed: {
    backgroundColor: '#F7F1E6',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A6A1F',
  },
  resultWrap: {
    marginTop: 4,
  },
  completedCard: {
    backgroundColor: '#E1EFE8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 20,
    alignItems: 'center',
  },
  completedCardTablet: {
    backgroundColor: '#E1EFE8',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 28,
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
    marginBottom: 14,
  },
  completedTitleTablet: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
    marginBottom: 18,
  },
  noteBlockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  noteBlock: {
    minWidth: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBlockTablet: {
    minWidth: 54,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBlockChild: {
    backgroundColor: '#E8A24B',
    borderColor: '#B4622D',
  },
  noteBlockTemplate: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E6DD',
  },
  noteBlockChildText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  noteBlockTemplateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A7264',
  },
  completedButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  playButton: {
    backgroundColor: '#2B6E58',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  playButtonPressed: {
    backgroundColor: '#225744',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  songbookNavButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#2B6E58',
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  songbookNavButtonPressed: {
    backgroundColor: '#F1EADB',
  },
  songbookNavButtonText: {
    color: '#2B6E58',
    fontSize: 16,
    fontWeight: '800',
  },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 18,
    alignItems: 'center',
  },
  noticeCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 24,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#7A7264',
    textAlign: 'center',
  },
  noticeTextTablet: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '700',
    color: '#7A7264',
    textAlign: 'center',
  },
  emptyState: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#7A7264',
    textAlign: 'center',
  },
});
