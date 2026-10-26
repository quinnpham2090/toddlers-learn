import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  CharacterRecord,
  SkillDomain,
  SkillRecord,
  getActivePackId,
  getCharacters,
  getString,
  getJourneyStopSkills,
  getPackAsset,
} from '../lib/pack-loader';

const START_BUTTON_LABEL = 'Start';
const SONGBOOK_BUTTON_LABEL = 'Songbook';
const TOGETHER_BUTTON_LABEL = 'Together';

const STOP_ACCENTS: Record<SkillDomain, { soft: string; deep: string }> = {
  language: { soft: '#FBE7DF', deep: '#B4502F' },
  numeracy: { soft: '#E5EDF7', deep: '#3A5A8C' },
  music: { soft: '#F1E6F4', deep: '#6F4E82' },
  motor_routine: { soft: '#FBEEDD', deep: '#9A6A1F' },
  social_cooperative: { soft: '#E1EFE8', deep: '#2B6E58' },
  time_concepts: { soft: '#E7EDF2', deep: '#4E6E7E' },
  world_discovery: { soft: '#E8F0E0', deep: '#4F7A3A' },
};

function WelcomeLine({ text, isTablet }: { text: string; isTablet: boolean }) {
  return <Text style={isTablet ? styles.welcomeTablet : styles.welcome}>{text}</Text>;
}

function CharacterCard({ character, isTablet }: { character: CharacterRecord; isTablet: boolean }) {
  const name = getString(character.name_ref);
  const line = getString(character.personality_lines[0]);
  const asset = getPackAsset(getActivePackId(), character.model_asset_path);
  return (
    <View style={isTablet ? styles.characterCardTablet : styles.characterCard}>
      <View style={isTablet ? styles.characterImageFrameTablet : styles.characterImageFrame}>
        {asset !== undefined ? (
          <Image
            source={asset}
            style={isTablet ? styles.characterImageTablet : styles.characterImage}
            contentFit="contain"
            accessibilityLabel={name}
          />
        ) : (
          <View style={isTablet ? styles.characterImageTablet : styles.characterImage} />
        )}
      </View>
      <View style={isTablet ? styles.characterTextTablet : styles.characterText}>
        <Text style={isTablet ? styles.characterNameTablet : styles.characterName}>{name}</Text>
        <Text style={isTablet ? styles.characterLineTablet : styles.characterLine}>{line}</Text>
      </View>
    </View>
  );
}

function JourneyStop({
  stop,
  index,
  isLast,
  isTablet,
}: {
  stop: SkillRecord;
  index: number;
  isLast: boolean;
  isTablet: boolean;
}) {
  const title = getString(stop.title_ref);
  const description = getString(stop.description_ref);
  const accent = STOP_ACCENTS[stop.domain];
  return (
    <View style={styles.stopRow}>
      <View style={styles.stopRail}>
        <View
          style={[
            isTablet ? styles.stopCircleTablet : styles.stopCircle,
            { backgroundColor: accent.soft, borderColor: accent.deep },
          ]}
        >
          <Text style={[styles.stopCircleText, { color: accent.deep }]}>{index + 1}</Text>
        </View>
        {isLast ? null : <View style={styles.stopConnector} />}
      </View>
      <View style={isTablet ? styles.stopCardTablet : styles.stopCard}>
        <Text style={isTablet ? styles.stopTitleTablet : styles.stopTitle}>{title}</Text>
        <Text style={isTablet ? styles.stopDescriptionTablet : styles.stopDescription}>
          {description}
        </Text>
        <View style={styles.bandChip}>
          <Text style={isTablet ? styles.bandChipTextTablet : styles.bandChipText}>
            {stop.age_band}
          </Text>
        </View>
      </View>
    </View>
  );
}

function StartButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={START_BUTTON_LABEL}
      onPress={onPress}
      style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
    >
      <Text style={styles.startButtonText}>{START_BUTTON_LABEL}</Text>
    </Pressable>
  );
}

function SongbookButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={SONGBOOK_BUTTON_LABEL}
      onPress={onPress}
      style={({ pressed }) => [styles.songbookButton, pressed && styles.songbookButtonPressed]}
    >
      <Text style={styles.songbookButtonText}>{SONGBOOK_BUTTON_LABEL}</Text>
    </Pressable>
  );
}

function TogetherButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={TOGETHER_BUTTON_LABEL}
      onPress={onPress}
      style={({ pressed }) => [styles.togetherButton, pressed && styles.togetherButtonPressed]}
    >
      <Text style={styles.togetherButtonText}>{TOGETHER_BUTTON_LABEL}</Text>
    </Pressable>
  );
}

export default function HubWorld() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const characters = getCharacters();
  const stops = getJourneyStopSkills();
  const guide = characters.find((character) => character.species_or_role === 'lantern_guide');
  const welcomeText = guide ? getString(guide.personality_lines[0]) : null;

  const startSection = (
    <View style={isTablet ? styles.startSectionTablet : styles.startSection}>
      <StartButton onPress={() => router.push('/session')} />
      <SongbookButton onPress={() => router.push('/songbook')} />
      <TogetherButton onPress={() => router.push('/together')} />
    </View>
  );

  const pathSection = (
    <View style={styles.pathList}>
      {stops.map((stop, index) => (
        <JourneyStop
          key={stop.id}
          stop={stop}
          index={index}
          isLast={index === stops.length - 1}
          isTablet={isTablet}
        />
      ))}
    </View>
  );

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollTablet}>
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>
              {welcomeText ? <WelcomeLine text={welcomeText} isTablet /> : null}
              <View style={styles.characterColumn}>
                {characters.map((character) => (
                  <CharacterCard key={character.id} character={character} isTablet />
                ))}
              </View>
              {startSection}
            </View>
            <View style={styles.tabletColumn}>{pathSection}</View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {welcomeText ? <WelcomeLine text={welcomeText} isTablet={false} /> : null}
        <View style={styles.characterRow}>
          {characters.map((character) => (
            <CharacterCard key={character.id} character={character} isTablet={false} />
          ))}
        </View>
        {pathSection}
        {startSection}
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
  welcome: {
    fontSize: 17,
    lineHeight: 25,
    color: '#33302B',
    marginBottom: 18,
  },
  welcomeTablet: {
    fontSize: 22,
    lineHeight: 32,
    color: '#33302B',
    marginBottom: 24,
  },
  characterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  characterColumn: {
    gap: 16,
    marginBottom: 24,
  },
  characterCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  characterCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  characterImageFrame: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: '#F4EBDA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  characterImageFrameTablet: {
    width: 110,
    height: 110,
    borderRadius: 22,
    backgroundColor: '#F4EBDA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  characterImage: {
    width: 76,
    height: 76,
  },
  characterImageTablet: {
    width: 100,
    height: 100,
  },
  characterText: {
    flex: 1,
  },
  characterTextTablet: {
    flex: 1,
  },
  characterName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#33302B',
  },
  characterNameTablet: {
    fontSize: 20,
    fontWeight: '700',
    color: '#33302B',
  },
  characterLine: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#7A7264',
  },
  characterLineTablet: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: '#7A7264',
  },
  pathList: {
    marginBottom: 22,
  },
  stopRow: {
    flexDirection: 'row',
  },
  stopRail: {
    alignItems: 'center',
    width: 40,
  },
  stopCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopCircleTablet: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopCircleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  stopConnector: {
    flex: 1,
    width: 3,
    backgroundColor: '#E7DFCE',
    marginTop: 4,
    marginBottom: 8,
  },
  stopCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 14,
    marginLeft: 10,
    marginBottom: 12,
  },
  stopCardTablet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 20,
    marginLeft: 14,
    marginBottom: 16,
  },
  stopTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#33302B',
  },
  stopTitleTablet: {
    fontSize: 19,
    fontWeight: '700',
    color: '#33302B',
  },
  stopDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: '#7A7264',
  },
  stopDescriptionTablet: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: '#7A7264',
  },
  bandChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#E1EFE8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bandChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2B6E58',
  },
  bandChipTextTablet: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B6E58',
  },
  startSection: {
    marginTop: 6,
    gap: 10,
  },
  startSectionTablet: {
    gap: 10,
  },
  startButton: {
    backgroundColor: '#E8A24B',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#B4622D',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  startButtonPressed: {
    backgroundColor: '#D18A33',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  songbookButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#2B6E58',
    paddingVertical: 12,
    alignItems: 'center',
  },
  songbookButtonPressed: {
    backgroundColor: '#F1EADB',
  },
  songbookButtonText: {
    color: '#2B6E58',
    fontSize: 15,
    fontWeight: '800',
  },
  togetherButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#9A6A1F',
    paddingVertical: 12,
    alignItems: 'center',
  },
  togetherButtonPressed: {
    backgroundColor: '#F7F1E6',
  },
  togetherButtonText: {
    color: '#9A6A1F',
    fontSize: 15,
    fontWeight: '800',
  },
});
