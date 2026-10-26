import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ParentGate from '../components/ParentGate';
import {
  MissionRecord,
  RoutineRecord,
  getMissions,
  getRoutines,
  getString,
} from '../lib/pack-loader';

const BACK_LABEL = 'Back';
const MISSIONS_SECTION_LABEL = 'Missions';
const ROUTINES_SECTION_LABEL = 'Routines';
const NO_MISSIONS_MESSAGE = 'No missions yet.';
const NO_ROUTINES_MESSAGE = 'No routines yet.';

interface PendingTarget {
  kind: 'mission' | 'routine';
  id: string;
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

function SectionHeading({ text, isTablet }: { text: string; isTablet: boolean }) {
  return <Text style={isTablet ? styles.sectionHeadingTablet : styles.sectionHeading}>{text}</Text>;
}

function EmptySection({ text }: { text: string }) {
  return (
    <View style={styles.emptySection}>
      <Text style={styles.emptySectionText}>{text}</Text>
    </View>
  );
}

function MissionRow({
  mission,
  isTablet,
  onPress,
}: {
  mission: MissionRecord;
  isTablet: boolean;
  onPress: () => void;
}) {
  const title = getString(mission.title_ref);
  const teamGoal = getString(mission.team_goal_ref);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        isTablet ? styles.itemRowTablet : styles.itemRow,
        pressed && styles.itemRowPressed,
      ]}
    >
      <Text style={isTablet ? styles.itemTitleTablet : styles.itemTitle}>{title}</Text>
      <Text style={isTablet ? styles.itemSubtitleTablet : styles.itemSubtitle}>{teamGoal}</Text>
    </Pressable>
  );
}

function RoutineRow({
  routine,
  isTablet,
  onPress,
}: {
  routine: RoutineRecord;
  isTablet: boolean;
  onPress: () => void;
}) {
  const title = getString(routine.title_ref);
  const teamGoal = getString(routine.team_goal_ref);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        isTablet ? styles.itemRowTablet : styles.itemRow,
        pressed && styles.itemRowPressed,
      ]}
    >
      <View style={styles.itemTitleRow}>
        <Text style={isTablet ? styles.itemTitleTablet : styles.itemTitle}>{title}</Text>
        <View style={styles.timeOfDayChip}>
          <Text style={styles.timeOfDayChipText}>{routine.time_of_day}</Text>
        </View>
      </View>
      <Text style={isTablet ? styles.itemSubtitleTablet : styles.itemSubtitle}>{teamGoal}</Text>
    </Pressable>
  );
}

export default function TogetherScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const missions = getMissions();
  const routines = getRoutines();
  const [pending, setPending] = useState<PendingTarget | null>(null);

  function handlePass() {
    const target = pending;
    setPending(null);
    if (!target) {
      return;
    }
    router.push({
      pathname: target.kind === 'mission' ? '/mission' : '/routine',
      params: { id: target.id },
    });
  }

  const missionsSection = (
    <View style={styles.section}>
      <SectionHeading text={MISSIONS_SECTION_LABEL} isTablet={isTablet} />
      {missions.length === 0 ? (
        <EmptySection text={NO_MISSIONS_MESSAGE} />
      ) : (
        <View style={styles.sectionList}>
          {missions.map((mission) => (
            <MissionRow
              key={mission.id}
              mission={mission}
              isTablet={isTablet}
              onPress={() => setPending({ kind: 'mission', id: mission.id })}
            />
          ))}
        </View>
      )}
    </View>
  );

  const routinesSection = (
    <View style={styles.section}>
      <SectionHeading text={ROUTINES_SECTION_LABEL} isTablet={isTablet} />
      {routines.length === 0 ? (
        <EmptySection text={NO_ROUTINES_MESSAGE} />
      ) : (
        <View style={styles.sectionList}>
          {routines.map((routine) => (
            <RoutineRow
              key={routine.id}
              routine={routine}
              isTablet={isTablet}
              onPress={() => setPending({ kind: 'routine', id: routine.id })}
            />
          ))}
        </View>
      )}
    </View>
  );

  const gate = pending ? (
    <ParentGate onPass={handlePass} onCancel={() => setPending(null)} />
  ) : null;

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollTablet}>
          <View style={styles.topRow}>
            <BackButton />
          </View>
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>{missionsSection}</View>
            <View style={styles.tabletColumn}>{routinesSection}</View>
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
        {missionsSection}
        {routinesSection}
      </ScrollView>
      {gate}
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
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 12,
  },
  sectionHeadingTablet: {
    fontSize: 24,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 16,
  },
  sectionList: {
    gap: 12,
  },
  itemRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
  },
  itemRowTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 20,
  },
  itemRowPressed: {
    backgroundColor: '#F7F1E6',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#33302B',
  },
  itemTitleTablet: {
    fontSize: 19,
    fontWeight: '800',
    color: '#33302B',
  },
  itemSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: '#7A7264',
  },
  itemSubtitleTablet: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: '#7A7264',
  },
  timeOfDayChip: {
    backgroundColor: '#E5EDF7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeOfDayChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3A5A8C',
  },
  emptySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 18,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7A7264',
    textAlign: 'center',
  },
});
