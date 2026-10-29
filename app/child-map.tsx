import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  CharacterRecord,
  getActivePackId,
  getAdventureStops,
  getCharacterById,
  getCharacters,
  getPackAsset,
  getSongTemplates,
  getString,
} from '../lib/pack-loader';

const BACK_LABEL = 'Back';
const MAP_TITLE = 'Map';
const PLACES_LABEL = 'Places';
const CHARACTERS_LABEL = 'Characters';
const SONGS_LABEL = 'Songs';
const SONGBOOK_LABEL = 'Songbook';

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

function SectionHeading({ text, isTablet }: { text: string; isTablet: boolean }) {
  return <Text style={isTablet ? styles.sectionHeadingTablet : styles.sectionHeading}>{text}</Text>;
}

function CharacterPortrait({ character, size }: { character: CharacterRecord; size: number }) {
  const asset = getPackAsset(getActivePackId(), character.model_asset_path);
  const name = getString(character.name_ref);
  return (
    <View style={[styles.portrait, { width: size, height: size, borderRadius: size / 2 }]}>
      {asset !== undefined ? (
        <Image
          source={asset}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          accessibilityLabel={name}
        />
      ) : null}
    </View>
  );
}

export default function ChildMapScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const stops = getAdventureStops();
  const characters = getCharacters();
  const songs = getSongTemplates();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={isTablet ? styles.scrollTablet : styles.scroll}>
        <View style={styles.topRow}>
          <BackButton />
        </View>
        <Text style={isTablet ? styles.titleTablet : styles.title}>{MAP_TITLE}</Text>

        <View style={styles.section}>
          <SectionHeading text={PLACES_LABEL} isTablet={isTablet} />
          {stops.map((stop) => {
            const guide = getCharacterById(stop.guide);
            return (
              <View key={stop.id} style={isTablet ? styles.placeCardTablet : styles.placeCard}>
                {guide ? <CharacterPortrait character={guide} size={isTablet ? 72 : 56} /> : null}
                <View style={styles.placeText}>
                  <Text style={isTablet ? styles.placeTitleTablet : styles.placeTitle}>
                    {getString(stop.title_ref)}
                  </Text>
                  {guide ? (
                    <Text style={isTablet ? styles.placeGuideTablet : styles.placeGuide}>
                      {`with ${getString(guide.name_ref)}`}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <SectionHeading text={CHARACTERS_LABEL} isTablet={isTablet} />
          {characters.map((character) => (
            <View key={character.id} style={isTablet ? styles.placeCardTablet : styles.placeCard}>
              <CharacterPortrait character={character} size={isTablet ? 72 : 56} />
              <View style={styles.placeText}>
                <Text style={isTablet ? styles.placeTitleTablet : styles.placeTitle}>
                  {getString(character.name_ref)}
                </Text>
                {character.personality_lines[0] ? (
                  <Text style={isTablet ? styles.placeGuideTablet : styles.placeGuide}>
                    {getString(character.personality_lines[0])}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeading text={SONGS_LABEL} isTablet={isTablet} />
          {songs.map((song) => (
            <View key={song.id} style={isTablet ? styles.songRowTablet : styles.songRow}>
              <Text style={isTablet ? styles.placeTitleTablet : styles.placeTitle}>
                {getString(song.title_ref)}
              </Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={SONGBOOK_LABEL}
            onPress={() => router.push('/songbook')}
            style={({ pressed }) => [styles.songbookButton, pressed && styles.songbookPressed]}
          >
            <Text style={styles.songbookText}>{SONGBOOK_LABEL}</Text>
          </Pressable>
        </View>
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
    padding: 32,
    paddingBottom: 60,
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  backButtonPressed: {
    backgroundColor: '#F1EADB',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B6E58',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 16,
  },
  titleTablet: {
    fontSize: 38,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 20,
    alignSelf: 'center',
  },
  section: {
    marginBottom: 24,
    width: '100%',
    maxWidth: 720,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2B6E58',
    marginBottom: 10,
  },
  sectionHeadingTablet: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2B6E58',
    marginBottom: 12,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  placeCardTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
  },
  portrait: {
    backgroundColor: '#F1EADB',
    overflow: 'hidden',
  },
  placeText: {
    marginLeft: 14,
    flexShrink: 1,
  },
  placeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#33302B',
  },
  placeTitleTablet: {
    fontSize: 21,
    fontWeight: '800',
    color: '#33302B',
  },
  placeGuide: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7A7264',
    marginTop: 2,
  },
  placeGuideTablet: {
    fontSize: 16,
    lineHeight: 23,
    color: '#7A7264',
    marginTop: 3,
  },
  songRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  songRowTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  songbookButton: {
    marginTop: 6,
    backgroundColor: '#2B6E58',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  songbookPressed: {
    backgroundColor: '#1F5443',
  },
  songbookText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
