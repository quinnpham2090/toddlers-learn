import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  CharacterRecord,
  LessonRecord,
  LessonStep,
  PictureSetItem,
  PictureSetRecord,
  ScaffoldLevel,
  SongTemplateRecord,
  getActivePackId,
  getCharacterById,
  getCharacters,
  getJourneyStopSkills,
  getLessonById,
  getLessons,
  getPackAsset,
  getPictureSetById,
  getPictureSets,
  getString,
  getSongTemplates,
} from '../lib/pack-loader';
import { recordStepEvidence, loadSkillEvidence } from '../lib/progress-store';
import { selectNextLesson } from '../lib/lesson-selection.js';
import {
  SessionBookmark,
  clearSessionBookmark,
  loadSessionBookmark,
  setSessionBookmark,
} from '../lib/resume-store';

const BACK_LABEL = 'Back';
const HELP_LABEL = 'Help';
const NEXT_LABEL = 'Next';
const DONE_LABEL = 'Done';
const CONTINUE_LABEL = 'Continue where you left off';
const START_FRESH_LABEL = 'Start fresh';
const LISTEN_LABEL = 'Listen';
const LISTEN_AGAIN_LABEL = 'Listen again';
const SPEECH_LANGUAGE = 'en-US';
const SPEECH_RATE = 0.9;

function stopSpeech(): void {
  try {
    Speech.stop();
  } catch {
    return;
  }
}

function speakLine(text: string | null): void {
  if (!text) {
    return;
  }
  try {
    Speech.stop();
    Speech.speak(text, { language: SPEECH_LANGUAGE, rate: SPEECH_RATE });
  } catch {
    return;
  }
}

function Narrator({ text }: { text: string | null }) {
  useEffect(() => {
    if (!text) {
      stopSpeech();
      return;
    }
    speakLine(text);
    return () => {
      stopSpeech();
    };
  }, [text]);
  return null;
}

function goBack(): void {
  stopSpeech();
  router.back();
}

type ScaffoldLevelNumber = 0 | 1 | 2 | 3;
type SessionPhase = 'resume' | 'step' | 'celebration' | 'closing';

interface StepOutcome {
  stepIndex: number;
  scaffoldLevelAtCompletion: ScaffoldLevelNumber;
  completedWithHelp: boolean;
}

// Step outcomes are held in memory only, shaped for the later progress store:
// a step completed at scaffold L3 is completed-with-help and never independent evidence.
// On reaching the closing ritual they are written as one evidence entry per completed
// step against the lesson's primary skill (the pack's steps carry no skill refs of their own).

function resolveLesson(): LessonRecord | undefined {
  const lessons = getLessons();
  const journeySkills = getJourneyStopSkills();
  const evidence = loadSkillEvidence();
  const completedSkillIds = Array.from(new Set(evidence.map((record) => record.skill_id)));
  const selected = selectNextLesson({
    lessons,
    journeySkills,
    completedSkillIds,
    getLessonById,
  }) as LessonRecord | null;
  return selected ?? undefined;
}

function resolveCharacter(lesson: LessonRecord): CharacterRecord | undefined {
  const primary = getCharacterById(lesson.character_id);
  if (primary) {
    return primary;
  }
  const guide = getCharacters().find((character) => character.species_or_role === 'lantern_guide');
  return guide ?? getCharacters()[0];
}

function resolveCharacterAsset(character: CharacterRecord): number | undefined {
  const seen = new Set<string>();
  let current: CharacterRecord | undefined = character;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const asset = getPackAsset(getActivePackId(), current.model_asset_path);
    if (asset !== undefined) {
      return asset;
    }
    current = current.fallback_character_id
      ? getCharacterById(current.fallback_character_id)
      : undefined;
  }
  return undefined;
}

function resolvePictureSet(lesson: LessonRecord): PictureSetRecord | undefined {
  return (
    getPictureSetById(lesson.picture_set_id) ??
    getPictureSetById(lesson.fallback_picture_id) ??
    getPictureSets().find((set) => set.tags.includes('fallback')) ??
    getPictureSets()[0]
  );
}

function resolveSongTemplate(lesson: LessonRecord): SongTemplateRecord | undefined {
  return (
    getSongTemplates().find((template) => template.id === lesson.song_template_id) ??
    getSongTemplates()[0]
  );
}

function choicesForStep(
  step: LessonStep,
  scaffold: ScaffoldLevel,
  itemsById: Map<string, PictureSetItem>
): PictureSetItem[] {
  const items = step.choice_item_ids
    .map((itemId) => itemsById.get(itemId))
    .filter((item): item is PictureSetItem => item !== undefined);
  if (items.length <= scaffold.max_choices) {
    return items;
  }
  const keep = new Set<string>([step.target_item_id]);
  for (const item of items) {
    if (keep.size >= scaffold.max_choices) {
      break;
    }
    keep.add(item.item_id);
  }
  return items.filter((item) => keep.has(item.item_id));
}

function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={BACK_LABEL}
      onPress={goBack}
      style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
    >
      <Text style={styles.backButtonText}>{BACK_LABEL}</Text>
    </Pressable>
  );
}

function ProgressPill({ text }: { text: string }) {
  return (
    <View style={styles.progressPill}>
      <Text style={styles.progressPillText}>{text}</Text>
    </View>
  );
}

function CharacterHeader({
  character,
  isTablet,
}: {
  character: CharacterRecord;
  isTablet: boolean;
}) {
  const name = getString(character.name_ref);
  const line = getString(character.personality_lines[0]);
  const asset = resolveCharacterAsset(character);
  return (
    <View style={isTablet ? styles.characterHeaderTablet : styles.characterHeader}>
      <View style={isTablet ? styles.characterFrameTablet : styles.characterFrame}>
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
      <View style={styles.characterHeaderText}>
        <Text style={isTablet ? styles.characterNameTablet : styles.characterName}>{name}</Text>
        <Text style={isTablet ? styles.characterLineTablet : styles.characterLine}>{line}</Text>
      </View>
    </View>
  );
}

function PromptCard({
  prompt,
  scaffoldPrompt,
  isTablet,
  onListen,
}: {
  prompt: string;
  scaffoldPrompt: string | null;
  isTablet: boolean;
  onListen: () => void;
}) {
  return (
    <View style={isTablet ? styles.promptCardTablet : styles.promptCard}>
      <View style={styles.promptRow}>
        <Text style={[isTablet ? styles.promptTextTablet : styles.promptText, styles.promptTextFlex]}>
          {prompt}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={LISTEN_AGAIN_LABEL}
          onPress={onListen}
          style={({ pressed }) => [styles.listenButton, pressed && styles.listenButtonPressed]}
        >
          <Text style={isTablet ? styles.listenButtonTextTablet : styles.listenButtonText}>
            {LISTEN_LABEL}
          </Text>
        </Pressable>
      </View>
      {scaffoldPrompt ? (
        <Text style={isTablet ? styles.scaffoldPromptTablet : styles.scaffoldPrompt}>
          {scaffoldPrompt}
        </Text>
      ) : null}
    </View>
  );
}

function PictureGrid({
  items,
  targetItemId,
  highlightTarget,
  isTablet,
  onChoose,
}: {
  items: PictureSetItem[];
  targetItemId: string;
  highlightTarget: boolean;
  isTablet: boolean;
  onChoose: () => void;
}) {
  const single = items.length === 1;
  return (
    <View style={isTablet ? styles.gridTablet : styles.grid}>
      {items.map((item) => {
        const highlighted = highlightTarget && item.item_id === targetItemId;
        const label = getString(item.label_ref);
        const asset = getPackAsset(getActivePackId(), item.asset_path);
        return (
          <Pressable
            key={item.item_id}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onChoose}
            style={[
              single ? styles.pictureCardSingle : isTablet ? styles.pictureCardTablet : styles.pictureCard,
              highlighted && styles.pictureCardHighlighted,
            ]}
          >
            <View
              style={single ? styles.pictureFrameSingle : styles.pictureFrame}
            >
              {asset !== undefined ? (
                <Image
                  source={asset}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  accessibilityLabel={label}
                />
              ) : null}
            </View>
            <Text
              style={single ? styles.pictureLabelSingle : styles.pictureLabel}
              numberOfLines={2}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HelpControl({
  level,
  maxed,
  onPress,
}: {
  level: ScaffoldLevelNumber;
  maxed: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.helpRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={HELP_LABEL}
        onPress={onPress}
        disabled={maxed}
        style={({ pressed }) => [
          styles.helpButton,
          maxed ? styles.helpButtonMaxed : null,
          pressed && !maxed ? styles.helpButtonPressed : null,
        ]}
      >
        <Text style={maxed ? styles.helpButtonTextMaxed : styles.helpButtonText}>{HELP_LABEL}</Text>
      </Pressable>
      <View style={styles.levelChip}>
        <Text style={styles.levelChipText}>L{level}</Text>
      </View>
    </View>
  );
}

function CelebrationCard({
  celebration,
  isTablet,
  onNext,
}: {
  celebration: string;
  isTablet: boolean;
  onNext: () => void;
}) {
  return (
    <View style={isTablet ? styles.celebrationCardTablet : styles.celebrationCard}>
      <Text style={isTablet ? styles.celebrationTextTablet : styles.celebrationText}>
        {celebration}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={NEXT_LABEL}
        onPress={onNext}
        style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
      >
        <Text style={styles.nextButtonText}>{NEXT_LABEL}</Text>
      </Pressable>
    </View>
  );
}

function ClosingCard({
  closingWin,
  song,
  isTablet,
}: {
  closingWin: string;
  song: SongTemplateRecord | undefined;
  isTablet: boolean;
}) {
  const songTitle = song ? getString(song.title_ref) : null;
  const lessonWord = song ? getString(song.lesson_word_ref) : null;
  return (
    <View style={styles.closingStack}>
      <View style={isTablet ? styles.closingCardTablet : styles.closingCard}>
        <Text style={isTablet ? styles.closingTextTablet : styles.closingText}>{closingWin}</Text>
      </View>
      {song ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={songTitle ?? undefined}
          onPress={() => {
            stopSpeech();
            router.push({ pathname: '/composer', params: { templateId: song.id } });
          }}
          style={({ pressed }) => [
            isTablet ? styles.songCardTablet : styles.songCard,
            pressed && styles.songCardPressed,
          ]}
        >
          <Text style={isTablet ? styles.songTitleTablet : styles.songTitle}>{songTitle}</Text>
          <View style={styles.songWordChip}>
            <Text style={isTablet ? styles.songWordTablet : styles.songWord}>{lessonWord}</Text>
          </View>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={DONE_LABEL}
        onPress={goBack}
        style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
      >
        <Text style={styles.doneButtonText}>{DONE_LABEL}</Text>
      </Pressable>
    </View>
  );
}

function ResumeChoiceCard({
  isTablet,
  onContinue,
  onStartFresh,
}: {
  isTablet: boolean;
  onContinue: () => void;
  onStartFresh: () => void;
}) {
  return (
    <View style={isTablet ? styles.resumeCardTablet : styles.resumeCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={CONTINUE_LABEL}
        onPress={onContinue}
        style={({ pressed }) => [styles.resumePrimaryButton, pressed && styles.resumePrimaryPressed]}
      >
        <Text style={styles.resumePrimaryText}>{CONTINUE_LABEL}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={START_FRESH_LABEL}
        onPress={onStartFresh}
        style={({ pressed }) => [styles.resumeSecondaryButton, pressed && styles.resumeSecondaryPressed]}
      >
        <Text style={styles.resumeSecondaryText}>{START_FRESH_LABEL}</Text>
      </Pressable>
    </View>
  );
}

export default function SessionScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const lesson = resolveLesson();
  const [resume, setResume] = useState<{ stepIndex: number } | null>(() => {
    const bookmark: SessionBookmark | null = loadSessionBookmark();
    if (
      bookmark &&
      lesson &&
      bookmark.lesson_id === lesson.id &&
      bookmark.step_index >= 0 &&
      bookmark.step_index < lesson.steps.length
    ) {
      return { stepIndex: bookmark.step_index };
    }
    return null;
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [scaffoldLevel, setScaffoldLevel] = useState<ScaffoldLevelNumber>(0);
  const [phase, setPhase] = useState<SessionPhase>(() => (resume ? 'resume' : 'step'));
  const [stepOutcomes, setStepOutcomes] = useState<StepOutcome[]>([]);

  useEffect(() => {
    const bookmark = loadSessionBookmark();
    const stale =
      bookmark !== null &&
      (!lesson ||
        bookmark.lesson_id !== lesson.id ||
        bookmark.step_index < 0 ||
        bookmark.step_index >= lesson.steps.length);
    if (stale) {
      clearSessionBookmark();
    }
  }, [lesson]);

  if (!lesson) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topRow}>
          <BackButton />
        </View>
      </SafeAreaView>
    );
  }

  const steps = lesson.steps;
  const lessonId = lesson.id;
  const lessonPrimarySkillId = lesson.primary_skill_id;
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const character = resolveCharacter(lesson);
  const pictureSet = resolvePictureSet(lesson);
  const song = resolveSongTemplate(lesson);
  const itemsById = new Map(
    (pictureSet?.items ?? []).map((item) => [item.item_id, item])
  );
  const scaffold =
    lesson.scaffolds[String(scaffoldLevel) as '0' | '1' | '2' | '3'] ?? lesson.scaffolds['0'];
  const visibleChoices =
    phase === 'step'
      ? choicesForStep(step, scaffold, itemsById)
      : [];
  const stepPrompt = getString(step.prompt_ref);
  const scaffoldPrompt =
    scaffoldLevel > 0 ? getString(scaffold.prompt_ref) : null;
  const celebration = getString(step.celebration_ref);
  const closingWin = getString(lesson.closing_win_ref);
  const progressText = `Step ${Math.min(stepIndex + 1, steps.length)} of ${steps.length}`;
  const lessonTitle = getString(lesson.title_ref);
  const speechLine =
    phase === 'step'
      ? scaffoldPrompt ?? stepPrompt
      : phase === 'celebration'
        ? celebration
        : phase === 'closing'
          ? closingWin
          : null;

  function handleChoose() {
    setStepOutcomes((previous) => [
      ...previous,
      {
        stepIndex: step.step_index,
        scaffoldLevelAtCompletion: scaffoldLevel,
        completedWithHelp: scaffoldLevel === 3,
      },
    ]);
    setPhase('celebration');
  }

  function handleHelp() {
    setScaffoldLevel((level) => (level < 3 ? ((level + 1) as ScaffoldLevelNumber) : level));
  }

  function handleNext() {
    if (stepIndex >= steps.length - 1) {
      recordStepEvidence(
        stepOutcomes.map((outcome) => ({
          skill_id: lessonPrimarySkillId,
          scaffold_level_at_completion: outcome.scaffoldLevelAtCompletion,
          completed_with_help: outcome.completedWithHelp,
        }))
      );
      clearSessionBookmark();
      setPhase('closing');
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    setSessionBookmark(lessonId, nextIndex);
    setScaffoldLevel(0);
    setPhase('step');
  }

  function handleResume() {
    if (!resume) {
      setPhase('step');
      return;
    }
    const safeIndex = Math.max(0, Math.min(resume.stepIndex, steps.length - 1));
    setStepIndex(safeIndex);
    setScaffoldLevel(0);
    setResume(null);
    setPhase('step');
  }

  function handleStartFresh() {
    clearSessionBookmark();
    setStepIndex(0);
    setScaffoldLevel(0);
    setResume(null);
    setPhase('step');
  }

  const headerSection = (
    <View>
      <View style={styles.topRow}>
        <BackButton />
        {phase === 'step' || phase === 'celebration' ? (
          <ProgressPill text={progressText} />
        ) : null}
      </View>
      <Text style={isTablet ? styles.lessonTitleTablet : styles.lessonTitle}>{lessonTitle}</Text>
      {character ? <CharacterHeader character={character} isTablet={isTablet} /> : null}
    </View>
  );

  const promptSection =
    phase === 'resume' ? null : (
      <View>
        <PromptCard
          prompt={stepPrompt}
          scaffoldPrompt={scaffoldPrompt}
          isTablet={isTablet}
          onListen={() => speakLine(stepPrompt)}
        />
        {phase === 'step' ? (
          <HelpControl level={scaffoldLevel} maxed={scaffoldLevel === 3} onPress={handleHelp} />
        ) : null}
      </View>
    );

  const playSection =
    phase === 'resume' ? (
      <ResumeChoiceCard
        isTablet={isTablet}
        onContinue={handleResume}
        onStartFresh={handleStartFresh}
      />
    ) : phase === 'step' ? (
      <PictureGrid
        items={visibleChoices}
        targetItemId={step.target_item_id}
        highlightTarget={scaffold.highlight_target}
        isTablet={isTablet}
        onChoose={handleChoose}
      />
    ) : phase === 'celebration' ? (
      <CelebrationCard celebration={celebration} isTablet={isTablet} onNext={handleNext} />
    ) : (
      <ClosingCard closingWin={closingWin} song={song} isTablet={isTablet} />
    );

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <Narrator text={speechLine} />
        <ScrollView contentContainerStyle={styles.scrollTablet}>
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>
              {headerSection}
              {promptSection}
            </View>
            <View style={styles.tabletColumn}>{playSection}</View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <Narrator text={speechLine} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {headerSection}
        {promptSection}
        {playSection}
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
  progressPill: {
    backgroundColor: '#E1EFE8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B6E58',
  },
  lessonTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 12,
  },
  lessonTitleTablet: {
    fontSize: 28,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 16,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 12,
    marginBottom: 16,
  },
  characterHeaderTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
    marginBottom: 20,
  },
  characterFrame: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F4EBDA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  characterFrameTablet: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: '#F4EBDA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  characterImage: {
    width: 50,
    height: 50,
  },
  characterImageTablet: {
    width: 68,
    height: 68,
  },
  characterHeaderText: {
    flex: 1,
  },
  characterName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#33302B',
  },
  characterNameTablet: {
    fontSize: 18,
    fontWeight: '700',
    color: '#33302B',
  },
  characterLine: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#7A7264',
  },
  characterLineTablet: {
    marginTop: 4,
    fontSize: 14.5,
    lineHeight: 21,
    color: '#7A7264',
  },
  promptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
  },
  promptCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 22,
  },
  promptText: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
    color: '#33302B',
  },
  promptTextTablet: {
    fontSize: 21,
    lineHeight: 31,
    fontWeight: '700',
    color: '#33302B',
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  promptTextFlex: {
    flex: 1,
  },
  listenButton: {
    backgroundColor: '#F4EBDA',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8CDB6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 2,
  },
  listenButtonPressed: {
    backgroundColor: '#EADFC8',
  },
  listenButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A6A1F',
  },
  listenButtonTextTablet: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A6A1F',
  },
  scaffoldPrompt: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    color: '#2B6E58',
  },
  scaffoldPromptTablet: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 24,
    fontStyle: 'italic',
    color: '#2B6E58',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  helpButton: {
    backgroundColor: '#E1EFE8',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#2B6E58',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  helpButtonPressed: {
    backgroundColor: '#CFE5D8',
  },
  helpButtonMaxed: {
    opacity: 0.45,
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2B6E58',
  },
  helpButtonTextMaxed: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2B6E58',
  },
  levelChip: {
    backgroundColor: '#F4EBDA',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A6A1F',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  gridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 8,
  },
  pictureCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 10,
    alignItems: 'center',
  },
  pictureCardTablet: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
    alignItems: 'center',
  },
  pictureCardSingle: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
    alignItems: 'center',
  },
  pictureCardHighlighted: {
    borderWidth: 3,
    borderColor: '#E8A24B',
    backgroundColor: '#FDF3E3',
  },
  pictureFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#F4EBDA',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pictureFrameSingle: {
    width: '100%',
    maxWidth: 260,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#F4EBDA',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pictureLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#33302B',
    textAlign: 'center',
  },
  pictureLabelSingle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#33302B',
    textAlign: 'center',
  },
  celebrationCard: {
    backgroundColor: '#E1EFE8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  celebrationCardTablet: {
    backgroundColor: '#E1EFE8',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 28,
    alignItems: 'center',
    marginTop: 8,
  },
  celebrationText: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
  celebrationTextTablet: {
    fontSize: 24,
    lineHeight: 35,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#2B6E58',
    borderRadius: 999,
    paddingHorizontal: 34,
    paddingVertical: 13,
    marginTop: 16,
  },
  nextButtonPressed: {
    backgroundColor: '#225744',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  closingStack: {
    gap: 14,
    marginTop: 8,
  },
  closingCard: {
    backgroundColor: '#E1EFE8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 20,
    alignItems: 'center',
  },
  closingCardTablet: {
    backgroundColor: '#E1EFE8',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 28,
    alignItems: 'center',
  },
  closingText: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
  closingTextTablet: {
    fontSize: 24,
    lineHeight: 35,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
  songCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 18,
    alignItems: 'center',
  },
  songCardPressed: {
    backgroundColor: '#F7F1E6',
  },
  songCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 24,
    alignItems: 'center',
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#33302B',
    textAlign: 'center',
  },
  songTitleTablet: {
    fontSize: 20,
    fontWeight: '700',
    color: '#33302B',
    textAlign: 'center',
  },
  songWordChip: {
    marginTop: 10,
    backgroundColor: '#FBEEDD',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  songWord: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A6A1F',
  },
  songWordTablet: {
    fontSize: 18,
    fontWeight: '800',
    color: '#9A6A1F',
  },
  doneButton: {
    backgroundColor: '#E8A24B',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#B4622D',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  doneButtonPressed: {
    backgroundColor: '#D18A33',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  resumeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 20,
    gap: 12,
  },
  resumeCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 26,
    gap: 14,
  },
  resumePrimaryButton: {
    backgroundColor: '#2B6E58',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  resumePrimaryPressed: {
    backgroundColor: '#225744',
  },
  resumePrimaryText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  resumeSecondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#9A6A1F',
    paddingVertical: 13,
    alignItems: 'center',
  },
  resumeSecondaryPressed: {
    backgroundColor: '#F7F1E6',
  },
  resumeSecondaryText: {
    color: '#9A6A1F',
    fontSize: 15.5,
    fontWeight: '800',
    textAlign: 'center',
  },
});
