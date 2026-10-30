import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  CharacterRecord,
  LessonRecord,
  LessonStep,
  PictureSetItem,
  PictureSetRecord,
  ScaffoldLevel,
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
  getVoiceAsset,
} from '../lib/pack-loader';
import { playVoiceAsset, stopVoice } from '../lib/voice-audio';
import { recordStepEvidence, loadSkillEvidence } from '../lib/progress-store';
import { selectNextLesson } from '../lib/lesson-selection.js';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  getPostAdventurePathSelection,
  type PostAdventurePathSelection,
} from '../lib/path-queue';
import { markPathSessionCompleted } from '../lib/path-state';
import {
  SessionBookmark,
  clearReplayBookmark,
  clearSessionBookmark,
  loadReplayBookmark,
  loadSessionBookmark,
  setReplayBookmark,
  setSessionBookmark,
} from '../lib/resume-store';

const BACK_LABEL = 'Back';
const HELP_LABEL = 'Help';
const NEXT_LABEL = 'Next';
const DONE_LABEL = 'Done';
const SESSION_COMPLETION_LABEL = 'All done for now!';
const CONTINUE_LABEL = 'Continue where you left off';
const START_FRESH_LABEL = 'Start fresh';
const LISTEN_LABEL = 'Listen';
const LISTEN_AGAIN_LABEL = 'Listen again';
const SPEECH_LANGUAGE = 'en-US';
const SPEECH_RATE = 0.75;
const WORD_SPEECH_RATE = 0.6;
const WORD_PAUSE_MS = 900;
const CELEBRATION_FALLBACK_MS = 10000;
type SessionKind = 'lesson' | 'adventure' | 'check';
const SESSION_KIND: SessionKind = 'lesson';
const FINALE_SLIDE_MS = 700;
const FINALE_FALLBACK_MS = 10000;
const FINALE_HINT_AFTER_WRONG_TAPS = 2;
const FINALE_CONFIG: Record<
  string,
  { targetItemId: string; tileItemIds: string[]; findPromptRef: string }
> = {
  'lesson-hello-cup': {
    targetItemId: 'cup',
    tileItemIds: ['cup', 'ball', 'book'],
    findPromptRef: 'lesson.hello_cup.find_prompt',
  },
  'lesson-red-flower-yellow-flower': {
    targetItemId: 'red-flower',
    tileItemIds: ['red-flower', 'blue-flower', 'yellow-flower'],
    findPromptRef: 'lesson.red_flower_yellow_flower.find_prompt',
  },
  'lesson-where-does-this-go': {
    targetItemId: 'yellow-basket',
    tileItemIds: ['red-basket', 'yellow-basket'],
    findPromptRef: 'lesson.where_does_this_go.find_prompt',
  },
  'lesson-words-that-sound-the-same': {
    targetItemId: 'tree',
    tileItemIds: ['tree', 'spoon', 'moon'],
    findPromptRef: 'lesson.words_that_sound_the_same.find_prompt',
  },
  'lesson-finish-the-rhyme': {
    targetItemId: 'key',
    tileItemIds: ['key', 'mat', 'log'],
    findPromptRef: 'lesson.finish_the_rhyme.find_prompt',
  },
  'lesson-clap-the-beats': {
    targetItemId: 'beats-3-banana',
    tileItemIds: ['beats-3-banana', 'beats-1-cup', 'beats-2-flower'],
    findPromptRef: 'lesson.clap_the_beats.find_prompt',
  },
  'lesson-first-sounds': {
    targetItemId: 'frog',
    tileItemIds: ['frog', 'bear', 'cat'],
    findPromptRef: 'lesson.first_sounds.find_prompt',
  },
  'lesson-name-it-together': {
    targetItemId: 'ball',
    tileItemIds: ['ball', 'cup', 'book'],
    findPromptRef: 'lesson.name_it_together.find_prompt',
  },
  'lesson-big-little': {
    targetItemId: 'big-spoon',
    tileItemIds: ['big-spoon', 'little-spoon'],
    findPromptRef: 'lesson.big_little.find_prompt',
  },
  'lesson-point-to': {
    targetItemId: 'cup',
    tileItemIds: ['cup', 'ball', 'book'],
    findPromptRef: 'lesson.point_to.find_prompt',
  },
  'lesson-sort-by-kind': {
    targetItemId: 'balls-group',
    tileItemIds: ['balls-group', 'books-group'],
    findPromptRef: 'lesson.sort_by_kind.find_prompt',
  },
};


function stopSpeech(): void {
  try {
    Speech.stop();
  } catch {
    return;
  }
}

function stopAllNarration(): void {
  stopVoice();
  stopSpeech();
}

function speakLine(text: string | null, onDone?: () => void, rate: number = SPEECH_RATE): void {
  if (!text) {
    return;
  }
  try {
    Speech.stop();
    Speech.speak(text, {
      language: SPEECH_LANGUAGE,
      rate,
      onDone,
      onError: onDone,
    });
  } catch {
    onDone?.();
  }
}

function narrateLine(
  text: string,
  stringKey: string,
  speakerId: string | null,
  rate: number,
  onDone: () => void
): void {
  const asset = speakerId ? getVoiceAsset(getActivePackId(), speakerId, stringKey) : undefined;
  if (asset !== undefined) {
    const started = playVoiceAsset(asset, onDone, onDone);
    if (started) {
      return;
    }
  }
  speakLine(text, onDone, rate);
}

function Narrator({
  text,
  stringKey,
  speakerId,
  onSpeakingChange,
}: {
  text: string | null;
  stringKey: string | null;
  speakerId: string | null;
  onSpeakingChange: (speaking: boolean) => void;
}) {
  useEffect(() => {
    if (!text || !stringKey) {
      onSpeakingChange(false);
      stopAllNarration();
      return;
    }
    onSpeakingChange(true);
    narrateLine(text, stringKey, speakerId, SPEECH_RATE, () => onSpeakingChange(false));
    return () => {
      stopAllNarration();
      onSpeakingChange(false);
    };
  }, [text, stringKey, speakerId, onSpeakingChange]);
  return null;
}

function CelebrationSpeaker({
  celebration,
  celebrationKey,
  word,
  wordKey,
  speakerId,
  onAdvance,
  onSpeakingChange,
}: {
  celebration: string;
  celebrationKey: string;
  word: string | null;
  wordKey: string | null;
  speakerId: string | null;
  onAdvance: () => void;
  onSpeakingChange: (speaking: boolean) => void;
}) {
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let pauseTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (cancelled || finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      if (fallbackTimer !== null) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (pauseTimer !== null) {
        clearTimeout(pauseTimer);
        pauseTimer = null;
      }
      onSpeakingChange(false);
      onAdvance();
    };

    const startPause = () => {
      if (cancelled) {
        return;
      }
      pauseTimer = setTimeout(finish, WORD_PAUSE_MS);
    };

    const speakWord = () => {
      if (cancelled) {
        return;
      }
      if (!word || !wordKey) {
        finish();
        return;
      }
      onSpeakingChange(true);
      narrateLine(word, wordKey, speakerId, WORD_SPEECH_RATE, () => {
        onSpeakingChange(false);
        startPause();
      });
    };

    onSpeakingChange(true);
    try {
      narrateLine(celebration, celebrationKey, speakerId, SPEECH_RATE, speakWord);
    } catch {
      speakWord();
    }

    fallbackTimer = setTimeout(finish, CELEBRATION_FALLBACK_MS);

    return () => {
      cancelled = true;
      if (fallbackTimer !== null) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (pauseTimer !== null) {
        clearTimeout(pauseTimer);
        pauseTimer = null;
      }
      stopAllNarration();
      onSpeakingChange(false);
    };
  }, []);

  return null;
}

function goBack(): void {
  stopAllNarration();
  router.back();
}

type ScaffoldLevelNumber = 0 | 1 | 2 | 3;
type SessionPhase = 'resume' | 'step' | 'celebration' | 'finale' | 'closing';

interface StepOutcome {
  stepIndex: number;
  scaffoldLevelAtCompletion: ScaffoldLevelNumber;
  completedWithHelp: boolean;
}

// Step outcomes are held in memory only, shaped for the later progress store:
// a step completed at scaffold L3 is completed-with-help and never independent evidence.
// On reaching the closing ritual they are written as one evidence entry per completed
// step against the lesson's primary skill (the pack's steps carry no skill refs of their own).

function resolveLesson(
  overrideLessonId?: string,
  pathSelection?: PostAdventurePathSelection | null
): LessonRecord | undefined {
  if (overrideLessonId) {
    const overridden = getLessonById(overrideLessonId);
    if (overridden) {
      return overridden;
    }
  }
  if (pathSelection && pathSelection.active) {
    return pathSelection.lessonId ? getLessonById(pathSelection.lessonId) : undefined;
  }
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

function ProgressDots({
  total,
  current,
  isTablet,
}: {
  total: number;
  current: number;
  isTablet: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 350, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [pulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });

  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => {
        const kind = i < current ? 'done' : i === current ? 'current' : 'upcoming';
        const dot = (
          <View
            style={[
              isTablet ? styles.dotTablet : styles.dot,
              kind === 'done' && styles.dotDone,
              kind === 'upcoming' && styles.dotUpcoming,
              kind === 'current' && styles.dotCurrent,
            ]}
          />
        );
        if (kind !== 'current') {
          return <View key={i}>{dot}</View>;
        }
        return (
          <Animated.View key={i} style={{ transform: [{ scale: pulseScale }] }}>
            {dot}
          </Animated.View>
        );
      })}
    </View>
  );
}

function GuideSpeech({
  character,
  isTablet,
  speaking,
  celebrating,
  idle,
  prompt,
  scaffoldPrompt,
  portraitSize,
  portraitRef,
  slideX,
  slideY,
  onListen,
}: {
  character: CharacterRecord;
  isTablet: boolean;
  speaking: boolean;
  celebrating: boolean;
  idle?: boolean;
  prompt: string;
  scaffoldPrompt: string | null;
  portraitSize: number;
  portraitRef?: (instance: unknown) => void;
  slideX?: Animated.Value;
  slideY?: Animated.Value;
  onListen: () => void;
}) {
  const name = getString(character.name_ref);
  const asset = resolveCharacterAsset(character);
  const bob = useRef(new Animated.Value(0)).current;
  const bobAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const mode = celebrating ? 'bounce' : speaking || idle ? 'bob' : 'rest';
    if (mode === 'rest') {
      bobAnimation.current?.stop();
      bobAnimation.current = null;
      bob.setValue(0);
      return;
    }
    const halfDuration = mode === 'bounce' ? 240 : 380;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: halfDuration, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: halfDuration, useNativeDriver: true }),
      ])
    );
    bobAnimation.current = animation;
    animation.start();
    return () => {
      bobAnimation.current?.stop();
      bobAnimation.current = null;
    };
  }, [celebrating, speaking, idle, bob]);

  const bobAmplitude = celebrating ? -13 : speaking ? -6 : 0;
  const bobTranslate = bob.interpolate({ inputRange: [0, 1], outputRange: [0, bobAmplitude] });

  return (
    <View style={isTablet ? styles.guideSpeechTablet : styles.guideSpeech}>
      <Animated.View
        ref={portraitRef}
        collapsable={false}
        style={[
          styles.guideFrameBase,
          {
            width: portraitSize,
            height: portraitSize,
            borderRadius: portraitSize / 2,
            transform: [
              { translateY: bobTranslate },
              { translateX: slideX ?? 0 },
              { translateY: slideY ?? 0 },
            ],
          },
        ]}
      >
        {asset !== undefined ? (
          <Image
            source={asset}
            style={{ width: portraitSize - 10, height: portraitSize - 10 }}
            contentFit="contain"
            accessibilityLabel={name}
          />
        ) : (
          <View style={{ width: portraitSize - 10, height: portraitSize - 10 }} />
        )}
      </Animated.View>
      <View style={isTablet ? styles.speechBubbleTablet : styles.speechBubble}>
        <Text style={isTablet ? styles.speechBubbleNameTablet : styles.speechBubbleName}>
          {name}
        </Text>
        <View style={styles.speechBubbleRow}>
          <Text
            style={[isTablet ? styles.speechBubbleTextTablet : styles.speechBubbleText, styles.promptTextFlex]}
          >
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
    </View>
  );
}

function PictureChoice({
  item,
  single,
  highlighted,
  picked,
  isTablet,
  size,
  onChoose,
}: {
  item: PictureSetItem;
  single: boolean;
  highlighted: boolean;
  picked?: boolean;
  isTablet: boolean;
  size: number;
  onChoose: (itemId: string) => void;
}) {
  const label = getString(item.label_ref);
  const asset = getPackAsset(getActivePackId(), item.asset_path);
  const pressScale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.timing(pressScale, { toValue: 0.95, duration: 90, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    Animated.timing(pressScale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={() => onChoose(item.item_id)}
      style={
        single
          ? styles.pictureCardSlotSingle
          : size > 0
            ? { width: size, height: size }
            : isTablet
              ? styles.pictureCardSlotTablet
              : styles.pictureCardSlot
      }
    >
      <Animated.View
        style={[
          single ? styles.pictureCardSingle : isTablet ? styles.pictureCardTablet : styles.pictureCard,
          size > 0 && styles.pictureCardSized,
          { transform: [{ scale: pressScale }] },
        ]}
      >
        <View
          style={
            single ? styles.pictureFrameSingle : size > 0 ? styles.pictureFrameSized : styles.pictureFrame
          }
        >
          {asset !== undefined ? (
            <Image
              source={asset}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              accessibilityLabel={label}
            />
          ) : (
            <View pointerEvents="none" style={styles.tilePlaceholder} />
          )}
        </View>
        {highlighted || picked ? (
          <View pointerEvents="none" style={[styles.tileRing, picked && styles.tileRingPicked]} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function PictureGrid({
  items,
  targetItemId,
  highlightTarget,
  isTablet,
  tileSize,
  onChoose,
}: {
  items: PictureSetItem[];
  targetItemId: string;
  highlightTarget: boolean;
  isTablet: boolean;
  tileSize: number;
  onChoose: (itemId: string) => void;
}) {
  const single = items.length === 1;
  return (
    <View style={isTablet ? styles.gridTablet : styles.grid}>
      {items.map((item) => (
        <PictureChoice
          key={item.item_id}
          item={item}
          single={single}
          highlighted={highlightTarget && item.item_id === targetItemId}
          isTablet={isTablet}
          size={single ? 0 : tileSize}
          onChoose={onChoose}
        />
      ))}
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

interface MeasurableInstance {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

function FinaleNarrator({
  text,
  stringKey,
  speakerId,
}: {
  text: string;
  stringKey: string;
  speakerId: string | null;
}) {
  useEffect(() => {
    narrateLine(text, stringKey, speakerId, SPEECH_RATE, () => {});
    return () => {
      stopAllNarration();
    };
  }, []);
  return null;
}

const BURST_COLORS = ['#E8A24B', '#2B6E58', '#B4502F', '#6F4E82', '#4F7A3A', '#3A5A8C'];

function CelebrationBurst() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: 700, useNativeDriver: true });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [progress]);

  const directions = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad), y: Math.sin(rad) };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {directions.map((dir, i) => {
        const dotOpacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.9, 0] });
        const dotScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.1] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '30%',
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dir.x * 86] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dir.y * 86] }) },
                { scale: dotScale },
              ],
              opacity: dotOpacity,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: BURST_COLORS[i % BURST_COLORS.length],
              }}
            />
          </Animated.View>
        );
      })}
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
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;
  const [stage, setStage] = useState({ width, height: height * 0.62 });
  const [finaleWrongTaps, setFinaleWrongTaps] = useState(0);
  const [finalePickedId, setFinalePickedId] = useState<string | null>(null);
  const finaleSlideX = useRef(new Animated.Value(0)).current;
  const finaleSlideY = useRef(new Animated.Value(0)).current;
  const finalePickupHandled = useRef(false);
  const finaleFinished = useRef(false);
  const finaleFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portraitInstance = useRef<MeasurableInstance | null>(null);
  const tileInstances = useRef<Record<string, MeasurableInstance | null>>({});

  const params = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const overrideLessonId = Array.isArray(params.lessonId)
    ? params.lessonId[0]
    : params.lessonId;
  const overrideActive = typeof overrideLessonId === 'string' && overrideLessonId.length > 0;

  const [pathSelection] = useState<PostAdventurePathSelection | null>(() =>
    overrideActive ? null : getPostAdventurePathSelection()
  );
  const lesson = useMemo(
    () => resolveLesson(overrideActive ? overrideLessonId : undefined, pathSelection),
    [overrideActive, overrideLessonId, pathSelection]
  );
  const loadBookmark = overrideActive ? loadReplayBookmark : loadSessionBookmark;
  const saveBookmark = overrideActive ? setReplayBookmark : setSessionBookmark;
  const clearBookmark = overrideActive ? clearReplayBookmark : clearSessionBookmark;
  const [resume, setResume] = useState<{ stepIndex: number } | null>(() => {
    const bookmark: SessionBookmark | null = loadBookmark();
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
  const [retryCue, setRetryCue] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const advanceHandledRef = useRef(false);
  const stepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bookmark = loadBookmark();
    const stale =
      bookmark !== null &&
      (!lesson ||
        bookmark.lesson_id !== lesson.id ||
        bookmark.step_index < 0 ||
        bookmark.step_index >= lesson.steps.length);
    if (stale) {
      clearBookmark();
    }
  }, [lesson, loadBookmark, clearBookmark]);

  useEffect(() => {
    stepAnim.setValue(0);
    const animation = Animated.timing(stepAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [stepIndex, phase, stepAnim]);

  if (!lesson) {
    if (overrideActive) {
      return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.topRow}>
            <BackButton />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topRow}>
          <BackButton />
        </View>
        <View style={styles.completionStage}>
          <Text style={styles.completionTitle}>{SESSION_COMPLETION_LABEL}</Text>
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
  const itemsById = new Map(
    (pictureSet?.items ?? []).map((item) => [item.item_id, item])
  );
  const scaffold =
    lesson.scaffolds[String(scaffoldLevel) as '0' | '1' | '2' | '3'] ?? lesson.scaffolds['0'];
  const visibleChoices =
    phase === 'step'
      ? choicesForStep(step, scaffold, itemsById)
      : [];
  const finaleConfig = FINALE_CONFIG[lesson.id];
  const finaleEnabled = SESSION_KIND === 'lesson' && finaleConfig !== undefined;
  const finaleItems = finaleConfig
    ? finaleConfig.tileItemIds
        .map((itemId) => itemsById.get(itemId))
        .filter((item): item is PictureSetItem => item !== undefined)
    : [];
  const stepPrompt = getString(step.prompt_ref);
  const scaffoldPrompt =
    scaffoldLevel > 0 ? getString(scaffold.prompt_ref) : null;
  const celebration = getString(step.celebration_ref);
  const closingWin = getString(lesson.closing_win_ref);
  const targetItem = itemsById.get(step.target_item_id);
  const targetWord = targetItem ? getString(targetItem.label_ref) : null;
  const lessonTitle = getString(lesson.title_ref);

  const horizontalPad = isTablet ? 32 : 20;
  const columnsGap = isTablet ? 36 : 0;
  const contentWidth = Math.max(0, stage.width - horizontalPad * 2);
  const gridWidth = isTablet ? Math.max(0, (contentWidth - columnsGap) / 2) : contentWidth;
  const fitItems = phase === 'finale' ? finaleItems : visibleChoices;
  const choiceRows = fitItems.length > 1 ? Math.ceil(fitItems.length / 2) : 1;
  const preferredPortrait = isTablet ? 126 : 90;
  const portraitFloor = isTablet ? 96 : 72;
  const minTile = isTablet ? 120 : 96;
  const bubbleReserve = isTablet ? 170 : 150;
  const dotsHeight = phase === 'step' || phase === 'celebration' ? 34 : 0;
  const verticalReserve = isTablet ? 40 : 24;

  const widthTile = Math.floor((gridWidth - 12) / 2);
  let portraitSize = preferredPortrait;
  let tileSize = widthTile;
  if (fitItems.length > 1) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const guideRow = Math.max(portraitSize, bubbleReserve) + 14;
      const fixedHeight = dotsHeight + guideRow + verticalReserve;
      const byHeight = Math.floor((stage.height - fixedHeight - (choiceRows - 1) * 12) / choiceRows);
      if (widthTile <= byHeight) {
        tileSize = widthTile;
        break;
      }
      if (byHeight >= minTile) {
        tileSize = byHeight;
        break;
      }
      if (portraitSize > portraitFloor) {
        portraitSize = Math.max(portraitFloor, portraitSize - 8);
        continue;
      }
      tileSize = Math.max(minTile, byHeight);
      break;
    }
  }
  const speechLine =
    phase === 'step'
      ? scaffoldPrompt ?? stepPrompt
      : phase === 'closing'
        ? closingWin
        : null;
  const speechKey =
    phase === 'step'
      ? scaffoldPrompt
        ? scaffold.prompt_ref
        : step.prompt_ref
      : phase === 'closing'
        ? lesson.closing_win_ref
        : null;

  function handleChoose(itemId: string) {
    if (itemId !== step.target_item_id) {
      setRetryCue(true);
      return;
    }
    setRetryCue(false);
    advanceHandledRef.current = false;
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
    if (advanceHandledRef.current) {
      return;
    }
    advanceHandledRef.current = true;
    stopAllNarration();
    setRetryCue(false);
    if (stepIndex >= steps.length - 1) {
      recordStepEvidence(
        stepOutcomes.map((outcome) => ({
          skill_id: lessonPrimarySkillId,
          scaffold_level_at_completion: outcome.scaffoldLevelAtCompletion,
          completed_with_help: outcome.completedWithHelp,
        }))
      );
      if (pathSelection?.active) {
        markPathSessionCompleted();
      }
      clearBookmark();
      setFinaleWrongTaps(0);
      setFinalePickedId(null);
      finalePickupHandled.current = false;
      finaleFinished.current = false;
      finaleSlideX.setValue(0);
      finaleSlideY.setValue(0);
      setRetryCue(false);
      setPhase(finaleEnabled ? 'finale' : 'closing');
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    saveBookmark(lessonId, nextIndex);
    setScaffoldLevel(0);
    setPhase('step');
  }

  function handleResume() {
    setRetryCue(false);
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
    clearBookmark();
    setStepIndex(0);
    setScaffoldLevel(0);
    setResume(null);
    setRetryCue(false);
    setPhase('step');
  }

  function finishFinale() {
    if (finaleFinished.current) {
      return;
    }
    finaleFinished.current = true;
    if (finaleFallbackTimer.current !== null) {
      clearTimeout(finaleFallbackTimer.current);
      finaleFallbackTimer.current = null;
    }
    setPhase('closing');
  }

  function handleFinaleChoose(itemId: string) {
    if (!finaleConfig || finalePickupHandled.current) {
      return;
    }
    if (itemId !== finaleConfig.targetItemId) {
      setFinaleWrongTaps((count) => count + 1);
      setRetryCue(true);
      return;
    }
    finalePickupHandled.current = true;
    setRetryCue(false);
    setFinalePickedId(itemId);
    const tile = tileInstances.current[itemId];
    const portrait = portraitInstance.current;
    if (tile && portrait) {
      portrait.measureInWindow((px: number, py: number, pw: number, ph: number) => {
        tile.measureInWindow((tx: number, ty: number, tw: number, th: number) => {
          Animated.parallel([
            Animated.timing(finaleSlideX, {
              toValue: tx + tw / 2 - (px + pw / 2),
              duration: FINALE_SLIDE_MS,
              useNativeDriver: true,
            }),
            Animated.timing(finaleSlideY, {
              toValue: ty + th / 2 - (py + ph / 2),
              duration: FINALE_SLIDE_MS,
              useNativeDriver: true,
            }),
          ]).start();
        });
      });
    }
    const finaleStep =
      steps.find((candidate) => candidate.target_item_id === finaleConfig.targetItemId) ?? step;
    narrateLine(
      getString(finaleStep.celebration_ref),
      finaleStep.celebration_ref,
      character?.id ?? null,
      SPEECH_RATE,
      () => finishFinale()
    );
    finaleFallbackTimer.current = setTimeout(() => finishFinale(), FINALE_FALLBACK_MS);
  }

  function handleListenAgain() {
    const listenText =
      phase === 'finale' && finaleConfig ? getString(finaleConfig.findPromptRef) : speechLine;
    const listenKey = phase === 'finale' && finaleConfig ? finaleConfig.findPromptRef : speechKey;
    if (!listenText || !listenKey) {
      return;
    }
    setSpeaking(true);
    narrateLine(listenText, listenKey, character?.id ?? null, SPEECH_RATE, () =>
      setSpeaking(false)
    );
  }

  const progressFraction = steps.length > 0 ? (stepIndex + 1) / steps.length : 0;

  const chromeSection = (
    <View style={styles.chrome}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={BACK_LABEL}
        onPress={goBack}
        style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
      >
        <Text style={styles.closeButtonText}>{'×'}</Text>
      </Pressable>
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${Math.round(progressFraction * 100)}%` }]}
        />
      </View>
    </View>
  );

  const guideSpeech = character ? (
    <GuideSpeech
      character={character}
      isTablet={isTablet}
      speaking={speaking}
      celebrating={phase === 'celebration'}
      idle={phase === 'finale'}
      prompt={
        phase === 'closing'
          ? closingWin
          : phase === 'celebration'
            ? celebration
            : phase === 'finale' && finaleConfig
              ? getString(finaleConfig.findPromptRef)
              : stepPrompt
      }
      scaffoldPrompt={phase === 'step' ? scaffoldPrompt : null}
      portraitSize={portraitSize}
      portraitRef={(instance: unknown) => {
        portraitInstance.current = instance as MeasurableInstance | null;
      }}
      slideX={finaleSlideX}
      slideY={finaleSlideY}
      onListen={handleListenAgain}
    />
  ) : null;

  const headerSection = (
    <View>
      {phase === 'step' || phase === 'celebration' ? (
        <View style={styles.dotsWrap}>
          <ProgressDots total={steps.length} current={stepIndex} isTablet={isTablet} />
        </View>
      ) : null}
      {phase === 'closing' ? (
        <Text style={isTablet ? styles.lessonTitleTablet : styles.lessonTitle}>{lessonTitle}</Text>
      ) : null}
      {phase === 'resume' ? null : guideSpeech}
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
        tileSize={tileSize}
        onChoose={handleChoose}
      />
    ) : phase === 'celebration' ? (
      <View style={styles.celebrationStage}>
        <CelebrationBurst />
      </View>
    ) : phase === 'finale' && finaleConfig ? (
      <View style={styles.grid}>
        {finaleItems.map((item) => (
          <View
            key={item.item_id}
            collapsable={false}
            ref={(instance: unknown) => {
              tileInstances.current[item.item_id] = instance as MeasurableInstance | null;
            }}
          >
            <PictureChoice
              item={item}
              single={false}
              highlighted={
                finaleWrongTaps >= FINALE_HINT_AFTER_WRONG_TAPS &&
                item.item_id === finaleConfig.targetItemId
              }
              picked={finalePickedId === item.item_id}
              isTablet={isTablet}
              size={tileSize}
              onChoose={handleFinaleChoose}
            />
          </View>
        ))}
        {finalePickedId ? <CelebrationBurst /> : null}
      </View>
    ) : null;

  const footerBanner =
    phase === 'celebration' ? (
      <View style={styles.feedbackBanner}>
        <Text style={isTablet ? styles.feedbackBannerTextTablet : styles.feedbackBannerText}>
          {celebration}
        </Text>
      </View>
    ) : (phase === 'step' || phase === 'finale') && retryCue ? (
      <View style={[styles.feedbackBanner, styles.feedbackBannerRetry]}>
        <Text
          style={[
            isTablet ? styles.feedbackBannerTextTablet : styles.feedbackBannerText,
            styles.feedbackBannerRetryText,
          ]}
        >
          {getString('session.retry_cue')}
        </Text>
      </View>
    ) : null;

  const footerButton =
    phase === 'celebration' ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={NEXT_LABEL}
        onPress={handleNext}
        style={({ pressed }) => [styles.footerPrimary, pressed && styles.footerPrimaryPressed]}
      >
        <Text style={styles.footerPrimaryText}>{NEXT_LABEL}</Text>
      </Pressable>
    ) : phase === 'closing' ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={DONE_LABEL}
        onPress={goBack}
        style={({ pressed }) => [styles.footerPrimary, pressed && styles.footerPrimaryPressed]}
      >
        <Text style={styles.footerPrimaryText}>{DONE_LABEL}</Text>
      </Pressable>
    ) : phase === 'step' ? (
      <HelpControl level={scaffoldLevel} maxed={scaffoldLevel === 3} onPress={handleHelp} />
    ) : null;

  const footer =
    phase === 'resume' ? null : (
      <View style={isTablet ? styles.footerTablet : styles.footer}>
        {footerBanner}
        {footerButton}
      </View>
    );

  const stepOpacity = stepAnim;
  const stepTranslate = stepAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const stepAnimStyle = { opacity: stepOpacity, transform: [{ translateX: stepTranslate }] };

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <Narrator
          text={speechLine}
          stringKey={speechKey}
          speakerId={character?.id ?? null}
          onSpeakingChange={setSpeaking}
        />
        {phase === 'finale' && finaleConfig ? (
          <FinaleNarrator
            text={getString(finaleConfig.findPromptRef)}
            stringKey={finaleConfig.findPromptRef}
            speakerId={character?.id ?? null}
          />
        ) : null}
        {phase === 'finale' && finaleConfig ? (
        <FinaleNarrator
          text={getString(finaleConfig.findPromptRef)}
          stringKey={finaleConfig.findPromptRef}
          speakerId={character?.id ?? null}
        />
      ) : null}
      {phase === 'celebration' ? (
          <CelebrationSpeaker
            celebration={celebration}
            celebrationKey={step.celebration_ref}
            word={targetWord}
            wordKey={targetItem?.label_ref ?? null}
            speakerId={character?.id ?? null}
            onAdvance={handleNext}
            onSpeakingChange={setSpeaking}
          />
        ) : null}
        {chromeSection}
        <View
          style={styles.stageTablet}
          onLayout={(event) =>
            setStage({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })
          }
        >
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>
              <Animated.View style={stepAnimStyle}>{headerSection}</Animated.View>
            </View>
            <View style={styles.tabletColumn}>
              <Animated.View style={stepAnimStyle}>{playSection}</Animated.View>
            </View>
          </View>
        </View>
        {footer}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <Narrator
        text={speechLine}
        stringKey={speechKey}
        speakerId={character?.id ?? null}
        onSpeakingChange={setSpeaking}
      />
      {phase === 'celebration' ? (
        <CelebrationSpeaker
          celebration={celebration}
          celebrationKey={step.celebration_ref}
          word={targetWord}
          wordKey={targetItem?.label_ref ?? null}
          speakerId={character?.id ?? null}
          onAdvance={handleNext}
          onSpeakingChange={setSpeaking}
        />
      ) : null}
      {chromeSection}
      <View
        style={styles.stage}
        onLayout={(event) =>
          setStage({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })
        }
      >
        <Animated.View style={stepAnimStyle}>
          {headerSection}
          {playSection}
        </Animated.View>
      </View>
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF5EC',
  },
  stage: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  stageTablet: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrameBase: {
    backgroundColor: '#F4EBDA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pictureCardSized: {
    flex: 1,
  },
  pictureFrameSized: {
    width: '100%',
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DFCE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: '#F1EADB',
  },
  closeButtonText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
    color: '#7A7264',
    marginTop: -2,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E7DFCE',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2B6E58',
  },
  dotsWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  guideSpeech: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  guideSpeechTablet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  speechBubbleTablet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  speechBubbleName: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
    marginBottom: 4,
  },
  speechBubbleNameTablet: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
    marginBottom: 5,
  },
  speechBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  speechBubbleText: {
    fontSize: 16.5,
    lineHeight: 24,
    fontWeight: '700',
    color: '#33302B',
  },
  speechBubbleTextTablet: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: '#33302B',
  },
  celebrationStage: {
    height: 80,
    marginTop: 6,
  },
  feedbackBanner: {
    borderRadius: 16,
    backgroundColor: '#E1EFE8',
    borderWidth: 1,
    borderColor: '#BFDCCB',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  feedbackBannerRetry: {
    backgroundColor: '#FBEEDD',
    borderColor: '#E8CBA3',
  },
  feedbackBannerText: {
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
  feedbackBannerTextTablet: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
  completionStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
  feedbackBannerRetryText: {
    color: '#9A6A1F',
    fontSize: 14.5,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E7DFCE',
    backgroundColor: '#FAF5EC',
  },
  footerTablet: {
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E7DFCE',
    backgroundColor: '#FAF5EC',
  },
  footerPrimary: {
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
  footerPrimaryPressed: {
    backgroundColor: '#D18A33',
  },
  footerPrimaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2B6E58',
  },
  dotTablet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2B6E58',
  },
  dotDone: {
    backgroundColor: '#2B6E58',
  },
  dotCurrent: {
    backgroundColor: '#E8A24B',
    borderColor: '#B4622D',
    borderWidth: 2,
  },
  dotUpcoming: {
    backgroundColor: '#E7DFCE',
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
  retryCue: {
    marginTop: 10,
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '700',
    color: '#9A6A1F',
  },
  retryCueTablet: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: '#9A6A1F',
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
  pictureCardSlot: {
    flexBasis: '47%',
    flexGrow: 0,
  },
  pictureCardSlotTablet: {
    flexBasis: '47%',
    flexGrow: 0,
  },
  pictureCardSlotSingle: {
    alignSelf: 'stretch',
  },
  pictureCard: {
    flexDirection: 'column',
    alignItems: 'stretch',
    borderRadius: 14,
  },
  pictureCardTablet: {
    flexDirection: 'column',
    alignItems: 'stretch',
    borderRadius: 14,
  },
  pictureCardSingle: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tilePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F4EBDA',
  },
  tileRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#E8A24B',
  },
  tileRingPicked: {
    borderWidth: 5,
    borderColor: '#B4622D',
  },
  pictureFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pictureFrameSingle: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
