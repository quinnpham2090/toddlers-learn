import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  SongTemplateRecord,
  getString,
  getSongTemplateById,
  getSongTemplates,
} from '../lib/pack-loader';
import { deriveSongTitle } from '../lib/song-completion';
import { playNoteSequence, secondsPerNote } from '../lib/song-audio';
import { UserSavedSong, UserSavedSongNoteEvent, loadSavedSongs } from '../lib/song-store';

const BACK_LABEL = 'Back';
const COMPOSE_LABEL = 'Compose';
const PLAY_LABEL = 'Play';
const EMPTY_MESSAGE = 'No songs yet — compose your first song!';
const FALLBACK_TEMPO = 84;

function resolveTemplateFor(song: UserSavedSong): SongTemplateRecord | undefined {
  return getSongTemplateById(song.song_template_id) ?? getSongTemplates()[0];
}

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

function DotRow({ events }: { events: UserSavedSongNoteEvent[] }) {
  return (
    <View style={styles.dotRow}>
      {events.map((event) => (
        <View
          key={event.slot_index}
          style={[
            styles.dot,
            event.authored_by_slot === 'child_slot' ? styles.dotChild : styles.dotTemplate,
          ]}
        />
      ))}
    </View>
  );
}

function NoteBlockRow({ events, isTablet }: { events: UserSavedSongNoteEvent[]; isTablet: boolean }) {
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

function SongRow({
  song,
  template,
  selected,
  isTablet,
  onPress,
}: {
  song: UserSavedSong;
  template: SongTemplateRecord | undefined;
  selected: boolean;
  isTablet: boolean;
  onPress: () => void;
}) {
  const title = template ? deriveSongTitle(template, song.name_word_indices) : 'My Song';
  const lessonWord = template ? getString(template.lesson_word_ref) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        isTablet ? styles.songRowTablet : styles.songRow,
        selected && styles.songRowSelected,
        pressed && !selected && styles.songRowPressed,
      ]}
    >
      <View style={styles.playBadge}>
        <Text style={styles.playBadgeText}>{'▶'}</Text>
      </View>
      <View style={styles.songRowBody}>
        <Text style={isTablet ? styles.songRowTitleTablet : styles.songRowTitle}>{title}</Text>
        <View style={styles.songRowMeta}>
          {lessonWord ? (
            <View style={styles.lessonWordChip}>
              <Text style={isTablet ? styles.lessonWordTextTablet : styles.lessonWordText}>
                {lessonWord}
              </Text>
            </View>
          ) : null}
          <View style={styles.savedChip}>
            <Text style={isTablet ? styles.savedChipTextTablet : styles.savedChipText}>{'♪'}</Text>
          </View>
        </View>
        <DotRow events={song.note_events} />
      </View>
    </Pressable>
  );
}

function SongDetail({
  song,
  template,
  isTablet,
  onPlay,
}: {
  song: UserSavedSong;
  template: SongTemplateRecord | undefined;
  isTablet: boolean;
  onPlay: () => void;
}) {
  const title = template ? deriveSongTitle(template, song.name_word_indices) : 'My Song';
  return (
    <View style={isTablet ? styles.detailCardTablet : styles.detailCard}>
      <Text style={isTablet ? styles.detailTitleTablet : styles.detailTitle}>{title}</Text>
      <NoteBlockRow events={song.note_events} isTablet={isTablet} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={PLAY_LABEL}
        onPress={onPlay}
        style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
      >
        <Text style={styles.playButtonText}>{PLAY_LABEL}</Text>
      </Pressable>
    </View>
  );
}

export default function SongbookScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const [songs, setSongs] = useState<UserSavedSong[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSongs(loadSavedSongs());
      setSelectedId(null);
    }, [])
  );

  function handleSelect(song: UserSavedSong) {
    const nextSelected = song.id === selectedId ? null : song.id;
    setSelectedId(nextSelected);
    if (nextSelected !== null) {
      const template = resolveTemplateFor(song);
      playNoteSequence(
        song.note_events.map((event) => event.pitch),
        secondsPerNote(template?.tempo ?? FALLBACK_TEMPO)
      );
    }
  }

  function handleReplay(song: UserSavedSong) {
    const template = resolveTemplateFor(song);
    playNoteSequence(
      song.note_events.map((event) => event.pitch),
      secondsPerNote(template?.tempo ?? FALLBACK_TEMPO)
    );
  }

  const selectedSong = songs.find((song) => song.id === selectedId) ?? null;

  const emptyState = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{EMPTY_MESSAGE}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={COMPOSE_LABEL}
        onPress={() => router.push('/composer')}
        style={({ pressed }) => [styles.composeButton, pressed && styles.composeButtonPressed]}
      >
        <Text style={styles.composeButtonText}>{COMPOSE_LABEL}</Text>
      </Pressable>
    </View>
  );

  const songList = (
    <View style={styles.songList}>
      {songs.map((song) => (
        <View key={song.id}>
          <SongRow
            song={song}
            template={resolveTemplateFor(song)}
            selected={song.id === selectedId}
            isTablet={isTablet}
            onPress={() => handleSelect(song)}
          />
          {isTablet ? null : song.id === selectedId && selectedSong ? (
            <SongDetail
              song={selectedSong}
              template={resolveTemplateFor(selectedSong)}
              isTablet={isTablet}
              onPlay={() => handleReplay(selectedSong)}
            />
          ) : null}
        </View>
      ))}
    </View>
  );

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollTablet}>
          <View style={styles.topRow}>
            <BackButton />
          </View>
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>
              {songs.length === 0 ? emptyState : songList}
            </View>
            <View style={styles.tabletColumn}>
              {selectedSong ? (
                <SongDetail
                  song={selectedSong}
                  template={resolveTemplateFor(selectedSong)}
                  isTablet={isTablet}
                  onPlay={() => handleReplay(selectedSong)}
                />
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <BackButton />
        </View>
        {songs.length === 0 ? emptyState : songList}
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
    marginBottom: 16,
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
  songList: {
    gap: 12,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
  },
  songRowTablet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 20,
  },
  playBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E1EFE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeText: {
    fontSize: 16,
    color: '#2B6E58',
    marginLeft: 2,
  },
  songRowBody: {
    flex: 1,
  },
  songRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FBEEDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  savedChipText: {
    fontSize: 13,
    color: '#9A6A1F',
  },
  savedChipTextTablet: {
    fontSize: 15,
    color: '#9A6A1F',
  },
  songRowSelected: {
    borderColor: '#2B6E58',
    borderWidth: 2,
  },
  songRowPressed: {
    backgroundColor: '#F7F1E6',
  },
  songRowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#33302B',
  },
  songRowTitleTablet: {
    fontSize: 19,
    fontWeight: '800',
    color: '#33302B',
  },
  lessonWordChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#FBEEDD',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lessonWordText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A6A1F',
  },
  lessonWordTextTablet: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A6A1F',
  },
  dotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  dotChild: {
    backgroundColor: '#E8A24B',
  },
  dotTemplate: {
    backgroundColor: '#D8CDB6',
  },
  detailCard: {
    marginTop: 12,
    backgroundColor: '#E1EFE8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 18,
    alignItems: 'center',
  },
  detailCardTablet: {
    backgroundColor: '#E1EFE8',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 24,
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
    marginBottom: 12,
  },
  detailTitleTablet: {
    fontSize: 21,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
    marginBottom: 16,
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
  playButton: {
    backgroundColor: '#2B6E58',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 16,
  },
  playButtonPressed: {
    backgroundColor: '#225744',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 22,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '800',
    color: '#33302B',
    textAlign: 'center',
  },
  composeButton: {
    backgroundColor: '#E8A24B',
    borderRadius: 999,
    paddingHorizontal: 30,
    paddingVertical: 12,
    marginTop: 16,
    shadowColor: '#B4622D',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  composeButtonPressed: {
    backgroundColor: '#D18A33',
  },
  composeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
