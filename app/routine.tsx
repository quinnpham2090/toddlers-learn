import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  RoutineRecord,
  getRoutineById,
  getRoutines,
  getString,
} from '../lib/pack-loader';
import { recordCompletion } from '../lib/together-store';

const BACK_LABEL = 'Back';
const GROWN_UP_GUIDE_LABEL = "Grown-up's guide";
const SAFETY_NOTES_LABEL = 'Safety notes';
const CHILD_INVITE_LABEL = 'Together we will';
const STEPS_LABEL = 'Our steps';
const NEXT_STEP_LABEL = 'Next';
const PRECHECK_PRESENT_LABEL = 'A grown-up is here';
const PRECHECK_SPACE_LABEL = 'The space is clear';
const START_LABEL = 'Start together';
const DONE_TOGETHER_LABEL = 'Done together';
const DONE_LABEL = 'Done';
const NO_ROUTINE_MESSAGE = 'No routine to show yet.';

type BriefingPhase = 'briefing' | 'deviceDown' | 'ritual';

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

function SafetyNotesCard({ notes, isTablet }: { notes: string[]; isTablet: boolean }) {
  return (
    <View style={isTablet ? styles.safetyCardTablet : styles.safetyCard}>
      <Text style={isTablet ? styles.cardHeadingTablet : styles.cardHeading}>
        {SAFETY_NOTES_LABEL}
      </Text>
      {notes.map((note, index) => (
        <Text key={index} style={isTablet ? styles.safetyNoteTablet : styles.safetyNote}>
          {note}
        </Text>
      ))}
    </View>
  );
}

function PrecheckRow({
  label,
  checked,
  isTablet,
  onToggle,
}: {
  label: string;
  checked: boolean;
  isTablet: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      style={styles.precheckRow}
    >
      <View style={[styles.checkCircle, checked && styles.checkCircleOn]} />
      <Text style={isTablet ? styles.checkLabelTablet : styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export default function RoutineBriefingScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const routine = (idParam ? getRoutineById(idParam) : undefined) ?? getRoutines()[0];

  const [phase, setPhase] = useState<BriefingPhase>('briefing');
  const [stepIndex, setStepIndex] = useState(0);
  const [grownUpPresent, setGrownUpPresent] = useState(false);
  const [spaceClear, setSpaceClear] = useState(false);

  if (!routine) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.scroll}>
          <View style={styles.topRow}>
            <BackButton />
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{NO_ROUTINE_MESSAGE}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const title = getString(routine.title_ref);
  const parentScript = getString(routine.parent_script_ref);
  const childPrompt = getString(routine.child_prompt_ref);
  const teamGoal = getString(routine.team_goal_ref);
  const safetyNotes = routine.safety_notes_refs.map((ref) => getString(ref));
  const returnRitual = getString(routine.return_ritual_ref);
  const steps = routine.objects;
  const currentStep = steps[Math.min(stepIndex, Math.max(0, steps.length - 1))];
  const allStepsViewed = stepIndex >= steps.length;

  function handleDoneTogether() {
    recordCompletion('routine', routine.id);
    setPhase('ritual');
  }

  const headerSection = (
    <View>
      <View style={styles.topRow}>
        <BackButton />
      </View>
      <View style={styles.titleRow}>
        <Text style={isTablet ? styles.titleTablet : styles.title}>{title}</Text>
        <View style={styles.timeOfDayChip}>
          <Text style={styles.timeOfDayChipText}>{routine.time_of_day}</Text>
        </View>
      </View>
    </View>
  );

  if (phase === 'deviceDown') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.calmCenter}>
          <Text style={isTablet ? styles.calmTitleTablet : styles.calmTitle}>{title}</Text>
          <Text style={isTablet ? styles.calmPromptTablet : styles.calmPrompt}>{childPrompt}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={DONE_TOGETHER_LABEL}
            onPress={handleDoneTogether}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.primaryButtonText}>{DONE_TOGETHER_LABEL}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'ritual') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.calmCenter}>
          <View style={isTablet ? styles.ritualCardTablet : styles.ritualCard}>
            <Text style={isTablet ? styles.ritualTextTablet : styles.ritualText}>
              {returnRitual}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={DONE_LABEL}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.primaryButtonText}>{DONE_LABEL}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const guideSection = (
    <View>
      <View style={isTablet ? styles.guideCardTablet : styles.guideCard}>
        <Text style={isTablet ? styles.cardHeadingTablet : styles.cardHeading}>
          {GROWN_UP_GUIDE_LABEL}
        </Text>
        <Text style={isTablet ? styles.guideTextTablet : styles.guideText}>{parentScript}</Text>
        <Text style={isTablet ? styles.teamGoalTablet : styles.teamGoal}>{teamGoal}</Text>
      </View>
      <View style={isTablet ? styles.inviteCardTablet : styles.inviteCard}>
        <Text style={isTablet ? styles.inviteLabelTablet : styles.inviteLabel}>
          {CHILD_INVITE_LABEL}
        </Text>
        <Text style={isTablet ? styles.inviteTextTablet : styles.inviteText}>{childPrompt}</Text>
      </View>
    </View>
  );

  const stepsSection = (
    <View style={isTablet ? styles.stepsCardTablet : styles.stepsCard}>
      <Text style={isTablet ? styles.cardHeadingTablet : styles.cardHeading}>{STEPS_LABEL}</Text>
      {allStepsViewed ? (
        steps.map((step, index) => (
          <View key={`${step.object_id}-${index}`} style={styles.stepListRow}>
            <View style={styles.stepListNumber}>
              <Text style={styles.stepListNumberText}>{index + 1}</Text>
            </View>
            <Text style={isTablet ? styles.stepListTextTablet : styles.stepListText}>
              {getString(step.label_ref)}
            </Text>
          </View>
        ))
      ) : (
        <View>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>
              {`Step ${stepIndex + 1} of ${steps.length}`}
            </Text>
          </View>
          <View style={isTablet ? styles.currentStepCardTablet : styles.currentStepCard}>
            <Text style={isTablet ? styles.currentStepTextTablet : styles.currentStepText}>
              {getString(currentStep?.label_ref ?? '')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={NEXT_STEP_LABEL}
            onPress={() => setStepIndex((index) => index + 1)}
            style={({ pressed }) => [
              styles.nextStepButton,
              pressed && styles.nextStepButtonPressed,
            ]}
          >
            <Text style={styles.nextStepButtonText}>{NEXT_STEP_LABEL}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const precheckSection = (
    <View style={isTablet ? styles.precheckCardTablet : styles.precheckCard}>
      <PrecheckRow
        label={PRECHECK_PRESENT_LABEL}
        checked={grownUpPresent}
        isTablet={isTablet}
        onToggle={() => setGrownUpPresent((value) => !value)}
      />
      <PrecheckRow
        label={PRECHECK_SPACE_LABEL}
        checked={spaceClear}
        isTablet={isTablet}
        onToggle={() => setSpaceClear((value) => !value)}
      />
    </View>
  );

  const startButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={START_LABEL}
      disabled={!grownUpPresent || !spaceClear}
      onPress={() => setPhase('deviceDown')}
      style={({ pressed }) => [
        styles.primaryButton,
        (!grownUpPresent || !spaceClear) && styles.primaryButtonDisabled,
        pressed && grownUpPresent && spaceClear && styles.primaryButtonPressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{START_LABEL}</Text>
    </Pressable>
  );

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollTablet}>
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>
              {headerSection}
              {guideSection}
              {stepsSection}
            </View>
            <View style={styles.tabletColumn}>
              <SafetyNotesCard notes={safetyNotes} isTablet={isTablet} />
              {precheckSection}
              <View style={styles.startWrap}>{startButton}</View>
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
        {guideSection}
        {stepsSection}
        <SafetyNotesCard notes={safetyNotes} isTablet={isTablet} />
        {precheckSection}
        <View style={styles.startWrap}>{startButton}</View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#33302B',
  },
  titleTablet: {
    fontSize: 28,
    fontWeight: '800',
    color: '#33302B',
  },
  timeOfDayChip: {
    backgroundColor: '#E5EDF7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeOfDayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3A5A8C',
  },
  guideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
    marginBottom: 12,
  },
  guideCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 22,
    marginBottom: 14,
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
    marginBottom: 8,
  },
  cardHeadingTablet: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
    marginBottom: 10,
  },
  guideText: {
    fontSize: 15.5,
    lineHeight: 23,
    color: '#33302B',
  },
  guideTextTablet: {
    fontSize: 18,
    lineHeight: 27,
    color: '#33302B',
  },
  teamGoal: {
    marginTop: 10,
    fontSize: 13.5,
    lineHeight: 20,
    fontStyle: 'italic',
    color: '#2B6E58',
  },
  teamGoalTablet: {
    marginTop: 12,
    fontSize: 15.5,
    lineHeight: 23,
    fontStyle: 'italic',
    color: '#2B6E58',
  },
  inviteCard: {
    backgroundColor: '#E1EFE8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 16,
    marginBottom: 14,
  },
  inviteCardTablet: {
    backgroundColor: '#E1EFE8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 22,
    marginBottom: 16,
  },
  inviteLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#2B6E58',
    marginBottom: 6,
  },
  inviteLabelTablet: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#2B6E58',
    marginBottom: 8,
  },
  inviteText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#33302B',
  },
  inviteTextTablet: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '700',
    color: '#33302B',
  },
  stepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
    marginBottom: 14,
  },
  stepsCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 22,
    marginBottom: 16,
  },
  stepPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F4EBDA',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  stepPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A6A1F',
  },
  currentStepCard: {
    backgroundColor: '#FAF5EC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D8CDB6',
    padding: 18,
    alignItems: 'center',
  },
  currentStepCardTablet: {
    backgroundColor: '#FAF5EC',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D8CDB6',
    padding: 24,
    alignItems: 'center',
  },
  currentStepText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#33302B',
    textAlign: 'center',
  },
  currentStepTextTablet: {
    fontSize: 21,
    fontWeight: '800',
    color: '#33302B',
    textAlign: 'center',
  },
  nextStepButton: {
    alignSelf: 'center',
    backgroundColor: '#2B6E58',
    borderRadius: 999,
    paddingHorizontal: 26,
    paddingVertical: 11,
    marginTop: 14,
  },
  nextStepButtonPressed: {
    backgroundColor: '#225744',
  },
  nextStepButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  stepListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
  },
  stepListNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E8A24B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepListNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepListText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#33302B',
  },
  stepListTextTablet: {
    fontSize: 17.5,
    fontWeight: '700',
    color: '#33302B',
  },
  safetyCard: {
    backgroundColor: '#FDF3E3',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8CBA3',
    padding: 16,
    marginBottom: 14,
  },
  safetyCardTablet: {
    backgroundColor: '#FDF3E3',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8CBA3',
    padding: 22,
    marginBottom: 16,
  },
  safetyNote: {
    fontSize: 14,
    lineHeight: 21,
    color: '#33302B',
    marginTop: 4,
  },
  safetyNoteTablet: {
    fontSize: 16.5,
    lineHeight: 25,
    color: '#33302B',
    marginTop: 6,
  },
  precheckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
    marginBottom: 14,
  },
  precheckCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 22,
    marginBottom: 16,
  },
  precheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#2B6E58',
    backgroundColor: '#FFFFFF',
  },
  checkCircleOn: {
    backgroundColor: '#2B6E58',
  },
  checkLabel: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#33302B',
  },
  checkLabelTablet: {
    fontSize: 18,
    fontWeight: '700',
    color: '#33302B',
  },
  startWrap: {
    marginTop: 4,
  },
  primaryButton: {
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
  primaryButtonPressed: {
    backgroundColor: '#D18A33',
  },
  primaryButtonDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  calmCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  calmTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#33302B',
    textAlign: 'center',
    marginBottom: 14,
  },
  calmTitleTablet: {
    fontSize: 30,
    fontWeight: '800',
    color: '#33302B',
    textAlign: 'center',
    marginBottom: 18,
  },
  calmPrompt: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '700',
    color: '#2B6E58',
    textAlign: 'center',
    marginBottom: 32,
  },
  calmPromptTablet: {
    fontSize: 21,
    lineHeight: 32,
    fontWeight: '700',
    color: '#2B6E58',
    textAlign: 'center',
    marginBottom: 40,
  },
  ritualCard: {
    backgroundColor: '#E1EFE8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  ritualCardTablet: {
    backgroundColor: '#E1EFE8',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  ritualText: {
    fontSize: 19,
    lineHeight: 29,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
  ritualTextTablet: {
    fontSize: 24,
    lineHeight: 36,
    fontWeight: '800',
    color: '#2B6E58',
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
