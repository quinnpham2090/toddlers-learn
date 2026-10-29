import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import ParentGate from '../components/ParentGate';
import {
  CharacterRecord,
  SkillDomain,
  SkillRecord,
  getActivePack,
  getActivePackId,
  getCharacters,
  getLessons,
  getString,
  getJourneyStopSkills,
  getPackAsset,
} from '../lib/pack-loader';
import { loadSkillEvidence } from '../lib/progress-store';
import { loadParentSettings } from '../lib/parent-settings';
import { loadAdventureQuestionnaire } from '../lib/adventure-parent';
import { loadAdventureState } from '../lib/adventure-store';
import { missionsUnlocked } from '../lib/mission-unlock';

const START_BUTTON_LABEL = 'Start';
const PLAY_AGAIN_LABEL = 'Play again!';
const SONGBOOK_BUTTON_LABEL = 'Songbook';
const TOGETHER_BUTTON_LABEL = 'Together';
const FOR_GROWN_UPS_LABEL = 'For grown-ups';
const ADVENTURE_LABEL = 'Adventure';
const MAP_LABEL = 'Map';
const OPEN_LABEL = 'Open';
const JUMP_LABEL = 'Jump to the current stop';

const STOP_ACCENTS: Record<SkillDomain, { soft: string; deep: string }> = {
  language: { soft: '#FBE7DF', deep: '#B4502F' },
  numeracy: { soft: '#E5EDF7', deep: '#3A5A8C' },
  music: { soft: '#F1E6F4', deep: '#6F4E82' },
  motor_routine: { soft: '#FBEEDD', deep: '#9A6A1F' },
  social_cooperative: { soft: '#E1EFE8', deep: '#2B6E58' },
  time_concepts: { soft: '#E7EDF2', deep: '#4E6E7E' },
  world_discovery: { soft: '#E8F0E0', deep: '#4F7A3A' },
};

type StopState = 'done' | 'current' | 'locked';
type ActivityIcon = 'star' | 'song' | 'together' | 'review';

function activityIconFor(interactionType: string | undefined): ActivityIcon {
  if (interactionType === 'do_together') {
    return 'together';
  }
  if (interactionType === 'sort_group') {
    return 'review';
  }
  if (interactionType === 'rhythm_tap') {
    return 'song';
  }
  return 'star';
}

function NodeIcon({ icon, color }: { icon: ActivityIcon; color: string }) {
  if (icon === 'together') {
    return (
      <View style={{ flexDirection: 'row' }}>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            borderWidth: 2.5,
            borderColor: color,
            marginRight: -5,
          }}
        />
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            borderWidth: 2.5,
            borderColor: color,
          }}
        />
      </View>
    );
  }
  const glyph = icon === 'song' ? '♪' : icon === 'review' ? '↻' : '★';
  return <Text style={{ fontSize: 26, lineHeight: 30, color }}>{glyph}</Text>;
}

function StopLockMark({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 11,
          height: 9,
          borderRadius: 6,
          borderWidth: 2.5,
          borderColor: color,
          marginBottom: -3,
        }}
      />
      <View style={{ width: 15, height: 11, borderRadius: 3.5, backgroundColor: color }} />
    </View>
  );
}

function GuideBubble({
  character,
  text,
  isTablet,
}: {
  character: CharacterRecord;
  text: string;
  isTablet: boolean;
}) {
  const asset = getPackAsset(getActivePackId(), character.model_asset_path);
  const name = getString(character.name_ref);
  return (
    <View style={isTablet ? styles.guideRowTablet : styles.guideRow}>
      <View style={isTablet ? styles.guidePortraitTablet : styles.guidePortrait}>
        {asset !== undefined ? (
          <Image
            source={asset}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            accessibilityLabel={name}
          />
        ) : null}
      </View>
      <View style={isTablet ? styles.guideBubbleTablet : styles.guideBubble}>
        <Text style={isTablet ? styles.guideBubbleTextTablet : styles.guideBubbleText}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function ActivityCard({
  icon,
  title,
  onOpen,
  isTablet,
}: {
  icon: ActivityIcon;
  title: string;
  onOpen: () => void;
  isTablet: boolean;
}) {
  return (
    <View style={isTablet ? styles.activityCardTablet : styles.activityCard}>
      <View style={styles.activityIconBubble}>
        <NodeIcon icon={icon} color="#9A6A1F" />
      </View>
      <Text style={isTablet ? styles.activityTitleTablet : styles.activityTitle}>{title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onOpen}
        style={({ pressed }) => [styles.activityButton, pressed && styles.activityButtonPressed]}
      >
        <Text style={styles.activityButtonText}>{OPEN_LABEL}</Text>
      </Pressable>
    </View>
  );
}

function StartButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
    >
      <Text style={styles.startButtonText}>{label}</Text>
    </Pressable>
  );
}

function ForGrownUpsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={FOR_GROWN_UPS_LABEL}
      onPress={onPress}
      style={({ pressed }) => [styles.forGrownUpsButton, pressed && styles.forGrownUpsButtonPressed]}
    >
      <Text style={styles.forGrownUpsButtonText}>{FOR_GROWN_UPS_LABEL}</Text>
    </Pressable>
  );
}

function AdventureButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ADVENTURE_LABEL}
      onPress={onPress}
      style={({ pressed }) => [styles.adventureButton, pressed && styles.adventureButtonPressed]}
    >
      <Text style={styles.adventureButtonText}>{ADVENTURE_LABEL}</Text>
    </Pressable>
  );
}

function MapButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={MAP_LABEL}
      onPress={onPress}
      style={({ pressed }) => [styles.mapButton, pressed && styles.mapButtonPressed]}
    >
      <Text style={styles.mapButtonText}>{MAP_LABEL}</Text>
    </Pressable>
  );
}

export default function HubWorld() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [missionsEnabled, setMissionsEnabled] = useState(true);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [grownUpsGateOpen, setGrownUpsGateOpen] = useState(false);
  const [adventureGateOpen, setAdventureGateOpen] = useState(false);
  const [adventureStarted, setAdventureStarted] = useState(false);
  const [stopStates, setStopStates] = useState<StopState[]>(() => computeStopStates().states);
  const [stopLessonIds, setStopLessonIds] = useState<(string | null)[]>(
    () => computeStopStates().lessonIds
  );
  const [expandedStop, setExpandedStop] = useState<number | null>(null);
  const [currentNodeY, setCurrentNodeY] = useState(0);
  const scrollRef = useRef<ScrollViewInstance | null>(null);

  function computeStopStates(): { states: StopState[]; lessonIds: (string | null)[] } {
    const evidence = loadSkillEvidence();
    const completedSkillIds = new Set(evidence.map((record) => record.skill_id));
    const journeySkills = getJourneyStopSkills();
    const lessons = getLessons();
    const lessonIds = journeySkills.map((skill) => {
      const lesson = lessons.find((candidate) => candidate.primary_skill_id === skill.id);
      return lesson ? lesson.id : null;
    });
    const firstOpenIndex = journeySkills.findIndex((skill) => !completedSkillIds.has(skill.id));
    const states = journeySkills.map((_, index) => {
      if (firstOpenIndex === -1) {
        return 'done' as StopState;
      }
      if (index < firstOpenIndex) {
        return 'done' as StopState;
      }
      if (index === firstOpenIndex) {
        return 'current' as StopState;
      }
      return 'locked' as StopState;
    });
    return { states, lessonIds };
  }

  useFocusEffect(
    useCallback(() => {
      setMissionsEnabled(loadParentSettings().missions_enabled);
      setMissionsOpen(missionsUnlocked());
      setAdventureStarted(loadAdventureState().visit_days.length > 0);
      const { states, lessonIds } = computeStopStates();
      setStopStates(states);
      setStopLessonIds(lessonIds);
      setExpandedStop(null);
      return () => {};
    }, [])
  );

  const allLessonsCompleted =
    stopStates.length > 0 && stopStates.every((state) => state === 'done');

  const characters = getCharacters();
  const stops = getJourneyStopSkills();
  const lessons = getLessons();
  const guide = characters.find((character) => character.species_or_role === 'lantern_guide');

  const activePack = getActivePack();
  const packTitle = getString(activePack.manifest.title_ref);

  const currentIndex = stopStates.findIndex((state) => state === 'current');
  const currentStop = currentIndex >= 0 ? stops[currentIndex] : undefined;

  function characterForStop(stop: SkillRecord): CharacterRecord | null {
    const lesson = lessons.find((candidate) => candidate.primary_skill_id === stop.id);
    if (lesson) {
      const character = characters.find((candidate) => candidate.id === lesson.character_id);
      if (character) {
        return character;
      }
    }
    return guide ?? characters[0] ?? null;
  }

  function handleNodePress(index: number): void {
    setExpandedStop((current) => (current === index ? null : index));
  }

  function handleJumpToCurrent(): void {
    scrollRef.current?.scrollTo({ y: Math.max(0, currentNodeY - 16), animated: true });
  }

  const bannerStop = currentStop ?? stops[stops.length - 1];
  const bannerAccent = bannerStop ? STOP_ACCENTS[bannerStop.domain] : null;

  const bannerSection =
    bannerStop && bannerAccent ? (
      <View style={[styles.stopBanner, { backgroundColor: bannerAccent.deep }]}>
        <Text style={styles.stopBannerText}>{getString(bannerStop.title_ref)}</Text>
      </View>
    ) : null;

  const pathNodes = stops.map((stop, index) => {
    const state = stopStates[index] ?? 'locked';
    const lessonId = stopLessonIds[index] ?? null;
    const accent = STOP_ACCENTS[stop.domain];
    const lesson = lessons.find((candidate) => candidate.primary_skill_id === stop.id);
    const icon = activityIconFor(lesson?.interaction_type);
    const character = characterForStop(stop);
    const isExpanded = expandedStop === index;
    const nodeSize = state === 'current' ? (isTablet ? 96 : 78) : isTablet ? 80 : 66;
    const nodeColor =
      state === 'locked' ? '#EFEAE0' : accent.deep;
    const iconColor = state === 'locked' ? '#C4BBA5' : '#FFFFFF';

    const node = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={getString(stop.title_ref)}
        disabled={state === 'locked'}
        onPress={() => handleNodePress(index)}
        style={({ pressed }) => [pressed && state !== 'locked' ? styles.pathNodePressed : null]}
      >
        <View
          style={[
            styles.pathNode,
            {
              width: nodeSize,
              height: nodeSize,
              borderRadius: nodeSize / 2,
              backgroundColor: nodeColor,
            },
            state === 'current' && styles.pathNodeCurrent,
            state === 'locked' && styles.pathNodeLocked,
          ]}
        >
          {state === 'locked' ? <StopLockMark color={iconColor} /> : <NodeIcon icon={icon} color={iconColor} />}
        </View>
      </Pressable>
    );

    const nodeRow =
      state === 'current' && character ? (
        <View style={styles.currentNodeRow}>
          {index % 2 === 0 ? (
            <GuideBubble
              character={character}
              text={getString(character.personality_lines[0])}
              isTablet={isTablet}
            />
          ) : null}
          {node}
          {index % 2 === 1 ? (
            <GuideBubble
              character={character}
              text={getString(character.personality_lines[0])}
              isTablet={isTablet}
            />
          ) : null}
        </View>
      ) : (
        <View
          style={[
            styles.nodeRow,
            index % 2 === 0 ? styles.nodeRowLeft : styles.nodeRowRight,
          ]}
        >
          {node}
        </View>
      );

    const overview = isExpanded && state !== 'locked' ? (
      <View style={styles.overviewCard}>
        <Text style={styles.overviewStopTitle}>{getString(stop.title_ref)}</Text>
        {lesson ? (
          <View style={styles.lessonTile}>
            <Text style={styles.lessonTileTitle}>{getString(lesson.title_ref)}</Text>
            <View style={[styles.lessonDot, state === 'done' && styles.lessonDotDone]} />
          </View>
        ) : null}
        <View style={styles.bandChip}>
          <Text style={styles.bandChipText}>{stop.age_band}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={state === 'current' ? START_BUTTON_LABEL : PLAY_AGAIN_LABEL}
          onPress={() => {
            if (state === 'current') {
              router.push('/session');
              return;
            }
            if (lessonId) {
              router.push({ pathname: '/session', params: { lessonId } });
            }
          }}
          style={({ pressed }) => [styles.overviewButton, pressed && styles.overviewButtonPressed]}
        >
          <Text style={styles.overviewButtonText}>
            {state === 'current' ? START_BUTTON_LABEL : PLAY_AGAIN_LABEL}
          </Text>
        </Pressable>
      </View>
    ) : null;

    return (
      <View
        key={stop.id}
        onLayout={
          index === currentIndex
            ? (event) => setCurrentNodeY(event.nativeEvent.layout.y)
            : undefined
        }
      >
        {nodeRow}
        {overview}
      </View>
    );
  });

  const songbookCard = (
    <ActivityCard
      icon="song"
      title={SONGBOOK_BUTTON_LABEL}
      onOpen={() => router.push('/songbook')}
      isTablet={isTablet}
    />
  );
  const togetherCard = missionsEnabled && missionsOpen ? (
    <ActivityCard
      icon="together"
      title={TOGETHER_BUTTON_LABEL}
      onOpen={() => router.push('/together')}
      isTablet={isTablet}
    />
  ) : null;

  const pathSection = (
    <View style={styles.pathList}>
      {pathNodes.map((node, index) => (
        <View key={stops[index].id}>
          {node}
          {index === 1 ? songbookCard : null}
          {index === 2 ? togetherCard : null}
        </View>
      ))}
      {stops.length < 2 ? songbookCard : null}
      {stops.length < 3 ? togetherCard : null}
    </View>
  );

  const actionSection = (
    <View style={isTablet ? styles.actionSectionTablet : styles.actionSection}>
      {allLessonsCompleted ? (
        <View style={styles.completionBanner}>
          <Text style={isTablet ? styles.completionBannerTextTablet : styles.completionBannerText}>
            {`You finished all the lessons in ${packTitle}!`}
          </Text>
        </View>
      ) : null}
      {!adventureStarted ? (
        <AdventureButton onPress={() => setAdventureGateOpen(true)} />
      ) : null}
      <StartButton
        label={allLessonsCompleted ? PLAY_AGAIN_LABEL : START_BUTTON_LABEL}
        onPress={() => router.push('/session')}
      />
      <MapButton onPress={() => router.push('/child-map')} />
      {adventureStarted ? (
        <AdventureButton onPress={() => setAdventureGateOpen(true)} />
      ) : null}
      <ForGrownUpsButton onPress={() => setGrownUpsGateOpen(true)} />
    </View>
  );

  const adventureGate = adventureGateOpen ? (
    <ParentGate
      onPass={() => {
        setAdventureGateOpen(false);
        const questionnaire = loadAdventureQuestionnaire();
        router.push(questionnaire ? '/adventure' : '/adventure-setup');
      }}
      onCancel={() => setAdventureGateOpen(false)}
    />
  ) : null;

  const grownUpsGate = grownUpsGateOpen ? (
    <ParentGate
      onPass={() => {
        setGrownUpsGateOpen(false);
        router.push('/parent-dashboard');
      }}
      onCancel={() => setGrownUpsGateOpen(false)}
    />
  ) : null;

  const jumpButton =
    stops.length > 1 ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={JUMP_LABEL}
        onPress={handleJumpToCurrent}
        style={({ pressed }) => [styles.jumpButton, pressed && styles.jumpButtonPressed]}
      >
        <Text style={styles.jumpButtonText}>{'↑'}</Text>
      </Pressable>
    ) : null;

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollTablet}>
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>
              {actionSection}
            </View>
            <View style={styles.tabletColumn}>
              {bannerSection}
              {pathSection}
            </View>
          </View>
        </ScrollView>
        {jumpButton}
        {adventureGate}
        {grownUpsGate}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        {bannerSection}
        {pathSection}
        {actionSection}
      </ScrollView>
      {jumpButton}
      {adventureGate}
      {grownUpsGate}
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
    paddingBottom: 110,
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
  stopBanner: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 18,
    alignItems: 'center',
  },
  stopBannerText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  pathList: {
    marginBottom: 10,
  },
  nodeRow: {
    paddingVertical: 14,
  },
  nodeRowLeft: {
    alignItems: 'flex-start',
    paddingLeft: '8%',
  },
  nodeRowRight: {
    alignItems: 'flex-end',
    paddingRight: '8%',
  },
  currentNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  pathNode: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B4622D',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pathNodeCurrent: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  pathNodeLocked: {
    shadowOpacity: 0,
    elevation: 0,
  },
  pathNodePressed: {
    opacity: 0.8,
  },
  guideRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideRowTablet: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guidePortrait: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#F4EBDA',
    overflow: 'hidden',
  },
  guidePortraitTablet: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: '#F4EBDA',
    overflow: 'hidden',
  },
  guideBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  guideBubbleTablet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  guideBubbleText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
    color: '#33302B',
  },
  guideBubbleTextTablet: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#33302B',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  overviewStopTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
    marginBottom: 10,
  },
  lessonTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF5EC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D8CDB6',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  lessonTileTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#33302B',
  },
  lessonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E7DFCE',
  },
  lessonDotDone: {
    backgroundColor: '#2B6E58',
  },
  bandChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
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
  overviewButton: {
    backgroundColor: '#E8A24B',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  overviewButtonPressed: {
    backgroundColor: '#D18A33',
  },
  overviewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 8,
  },
  activityCardTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginVertical: 10,
  },
  activityIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FBEEDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '800',
    color: '#33302B',
  },
  activityTitleTablet: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#33302B',
  },
  activityButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#9A6A1F',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  activityButtonPressed: {
    backgroundColor: '#F7F1E6',
  },
  activityButtonText: {
    color: '#9A6A1F',
    fontSize: 13.5,
    fontWeight: '800',
  },
  actionSection: {
    marginTop: 14,
    gap: 10,
  },
  actionSectionTablet: {
    marginTop: 6,
    gap: 12,
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
  adventureButton: {
    backgroundColor: '#2B6E58',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#225744',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  adventureButtonPressed: {
    backgroundColor: '#225744',
  },
  adventureButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  mapButton: {
    marginTop: 10,
    backgroundColor: '#E1EFE8',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mapButtonPressed: {
    backgroundColor: '#CFE4D9',
  },
  mapButtonText: {
    color: '#2B6E58',
    fontSize: 16,
    fontWeight: '800',
  },
  forGrownUpsButton: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8CDB6',
    paddingVertical: 9,
    alignItems: 'center',
  },
  forGrownUpsButtonPressed: {
    backgroundColor: '#F4EDDD',
  },
  forGrownUpsButtonText: {
    color: '#9C9484',
    fontSize: 13,
    fontWeight: '700',
  },
  completionBanner: {
    backgroundColor: '#E1EFE8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  completionBannerText: {
    color: '#2B6E58',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  completionBannerTextTablet: {
    color: '#2B6E58',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  jumpButton: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2B6E58',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#225744',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  jumpButtonPressed: {
    backgroundColor: '#225744',
  },
  jumpButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: -2,
  },
});
