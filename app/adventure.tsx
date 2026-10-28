import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  AdventureErrandRecord,
  AdventureItemRecord,
  AdventureStopRecord,
  AdventureVariantRecord,
  CharacterRecord,
  PictureSetItem,
  getActivePackId,
  getAdventure,
  getAdventureErrandsForStop,
  getAdventureItemById,
  getAdventureStops,
  getCharacterById,
  getCharacters,
  getPackAsset,
  getPictureSets,
  getString,
  getVoiceAsset,
} from '../lib/pack-loader';
import { playVoiceAsset, stopVoice } from '../lib/voice-audio';
import {
  AdventureState,
  NewAdventureEvidence,
  adventureLocalDateKey,
  daysSince,
  loadAdventureState,
  recordAdventureEvidence,
  saveAdventureState,
} from '../lib/adventure-store';

const SPEECH_LANGUAGE = 'en-US';
const SPEECH_RATE = 0.75;
const CELEBRATION_FALLBACK_MS = 10000;
const CLOSE_LABEL = '×';
const HELP_LABEL = 'Help';
const NEXT_LABEL = 'Next';
const DONE_LABEL = 'Done';
const LISTEN_LABEL = 'Listen';
const DAY_DONE_LABEL = "That's all for today!";
const BACK_LABEL = 'Back';

type Mode = 'journey' | 'session' | 'win';
type Phase = 'check' | 'celebrate';
type ScaffoldLevelNumber = 0 | 1 | 2 | 3;

function stopAllNarration(): void {
  stopVoice();
  try {
    Speech.stop();
  } catch {
    return;
  }
}

function narrate(
  text: string,
  stringKey: string,
  speakerId: string | null,
  onDone: () => void
): void {
  const asset = speakerId ? getVoiceAsset(getActivePackId(), speakerId, stringKey) : undefined;
  if (asset !== undefined) {
    stopVoice();
    if (playVoiceAsset(asset, onDone, onDone)) {
      return;
    }
  }
  try {
    Speech.stop();
    Speech.speak(text, {
      language: SPEECH_LANGUAGE,
      rate: SPEECH_RATE,
      onDone,
      onError: onDone,
    });
  } catch {
    onDone();
  }
}


function resolveCharacter(guideId: string | undefined): CharacterRecord | undefined {
  if (guideId) {
    const character = getCharacterById(guideId);
    if (character) {
      return character;
    }
  }
  const characters = getCharacters();
  return characters.find((c) => c.species_or_role === 'lantern_guide') ?? characters[0];
}

function pictureItemMap(): Map<string, PictureSetItem> {
  const map = new Map<string, PictureSetItem>();
  for (const set of getPictureSets()) {
    for (const item of set.items) {
      map.set(item.item_id, item);
    }
  }
  return map;
}

interface ResolvedItem {
  id: string;
  label: string;
  asset: number | undefined;
  adventureItem: AdventureItemRecord | undefined;
  pictureItem: PictureSetItem | undefined;
}

function resolveItem(
  id: string,
  pictures: Map<string, PictureSetItem>
): ResolvedItem | undefined {
  const adventureItem = getAdventureItemById(id);
  if (adventureItem) {
    const asset =
      adventureItem.display === 'image' && adventureItem.asset_path
        ? getPackAsset(getActivePackId(), adventureItem.asset_path)
        : undefined;
    return {
      id,
      label: getString(adventureItem.label_ref),
      asset,
      adventureItem,
      pictureItem: undefined,
    };
  }
  const pictureItem = pictures.get(id);
  if (pictureItem) {
    return {
      id,
      label: getString(pictureItem.label_ref),
      asset: getPackAsset(getActivePackId(), pictureItem.asset_path),
      adventureItem: undefined,
      pictureItem,
    };
  }
  return undefined;
}

function DotRow({ count, big }: { count: number; big: boolean }) {
  return (
    <View style={styles.visualRow}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[styles.beatDot, big ? styles.beatDotBig : null]}
        />
      ))}
    </View>
  );
}

function ApplePile({ count, size }: { count: number; size: number }) {
  return (
    <View style={styles.visualRow}>
      {Array.from({ length: count }, (_, index) => (
        <Image
          key={index}
          source={getPackAsset(getActivePackId(), 'assets/adv_apple.jpg')}
          style={{ width: size, height: size }}
          contentFit="contain"
        />
      ))}
    </View>
  );
}

function AdventureTile({
  item,
  highlighted,
  picked,
  size,
  onPress,
}: {
  item: ResolvedItem;
  highlighted: boolean;
  picked: boolean;
  size: number;
  onPress: () => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const display = item.adventureItem ? item.adventureItem.display : 'image';
  const count = item.adventureItem?.count ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPressIn={() => {
        Animated.timing(pressScale, { toValue: 0.95, duration: 90, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.timing(pressScale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
      }}
      onPress={onPress}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          styles.tile,
          highlighted && styles.tileHighlighted,
          picked && styles.tilePicked,
          { transform: [{ scale: pressScale }] },
        ]}
      >
        <View style={styles.tileVisual}>
          {display === 'dots' ? (
            <DotRow count={count} big />
          ) : display === 'apple_pile' ? (
            <ApplePile count={count} size={size > 140 ? 34 : 26} />
          ) : display === 'text' ? null : item.asset !== undefined ? (
            <Image source={item.asset} style={styles.tileImage} contentFit="contain" />
          ) : null}
        </View>
        <Text style={styles.tileLabel} numberOfLines={2}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function GuideBubble({
  character,
  prompt,
  scaffoldPrompt,
  speaking,
  celebrating,
  portraitSize,
  onListen,
}: {
  character: CharacterRecord;
  prompt: string;
  scaffoldPrompt: string | null;
  speaking: boolean;
  celebrating: boolean;
  portraitSize: number;
  onListen: () => void;
}) {
  const name = getString(character.name_ref);
  const asset = getPackAsset(getActivePackId(), character.model_asset_path);
  const bob = useRef(new Animated.Value(0)).current;
  const bobAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const mode = celebrating ? 'bounce' : speaking ? 'bob' : 'rest';
    if (mode === 'rest') {
      bobAnimation.current?.stop();
      bobAnimation.current = null;
      bob.setValue(0);
      return;
    }
    const half = mode === 'bounce' ? 240 : 380;
    const amplitude = Animated.timing(bob, { toValue: 1, duration: half, useNativeDriver: true });
    const animation = Animated.loop(
      Animated.sequence([
        amplitude,
        Animated.timing(bob, { toValue: 0, duration: half, useNativeDriver: true }),
      ])
    );
    bobAnimation.current = animation;
    animation.start();
    return () => {
      bobAnimation.current?.stop();
      bobAnimation.current = null;
    };
  }, [celebrating, speaking, bob]);

  const bobTranslate = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, celebrating ? -13 : speaking ? -6 : 0],
  });

  return (
    <View style={styles.guideRow}>
      <Animated.View
        style={[
          styles.guideFrame,
          {
            width: portraitSize,
            height: portraitSize,
            borderRadius: portraitSize / 2,
            transform: [{ translateY: bobTranslate }],
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
        ) : null}
      </Animated.View>
      <View style={styles.bubble}>
        <Text style={styles.bubbleName}>{name}</Text>
        <View style={styles.bubbleRow}>
          <Text style={styles.bubbleText}>{prompt}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={LISTEN_LABEL}
            onPress={onListen}
            style={({ pressed }) => [styles.listenButton, pressed && styles.listenButtonPressed]}
          >
            <Text style={styles.listenButtonText}>{LISTEN_LABEL}</Text>
          </Pressable>
        </View>
        {scaffoldPrompt ? <Text style={styles.scaffoldPrompt}>{scaffoldPrompt}</Text> : null}
      </View>
    </View>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index < current ? styles.dotDone : index === current ? styles.dotCurrent : styles.dotUpcoming,
          ]}
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
        <Text style={styles.helpButtonText}>{HELP_LABEL}</Text>
      </Pressable>
      <View style={styles.levelChip}>
        <Text style={styles.levelChipText}>L{level}</Text>
      </View>
    </View>
  );
}

function StopNodeState({ state }: { state: 'done' | 'current' | 'place' }) {
  if (state === 'done') {
    return <Text style={styles.doneMark}>{'✓'}</Text>;
  }
  if (state === 'current') {
    return <View style={styles.currentMark} />;
  }
  return <View style={styles.placeMark} />;
}

export default function AdventureScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;
  const adventure = getAdventure();
  const stops = getAdventureStops();
  const pictures = pictureItemMap();
  const todayKey = adventureLocalDateKey(new Date());

  const [advState, setAdvState] = useState<AdventureState>(() => {
    const loaded = loadAdventureState();
    const startDay = loaded.started_day;
    const shouldComplete =
      !loaded.completed && startDay !== null && daysSince(startDay, todayKey) >= adventure.visit_rules.sparse_completion_day;
    const next = shouldComplete ? { ...loaded, completed: true } : loaded;
    if (shouldComplete) {
      saveAdventureState(next);
    }
    return next;
  });
  const [mode, setMode] = useState<Mode>('journey');
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [errandIndex, setErrandIndex] = useState(0);
  const [scaffoldLevel, setScaffoldLevel] = useState<ScaffoldLevelNumber>(0);
  const [phase, setPhase] = useState<Phase>('check');
  const [retryCue, setRetryCue] = useState(false);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [pickedItemId, setPickedItemId] = useState<string | null>(null);
  const advanceHandled = useRef(false);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeStop = activeStopId ? stops.find((stop) => stop.id === activeStopId) : undefined;
  const stopErrands = activeStop ? getAdventureErrandsForStop(activeStop.id) : [];
  const errand: AdventureErrandRecord | undefined = stopErrands[errandIndex];
  const variant: AdventureVariantRecord | undefined = (() => {
    if (!errand) {
      return undefined;
    }
    const used = advState.used_variants[errand.skill_id] ?? [];
    return errand.variants.find((candidate) => !used.includes(candidate.id)) ?? errand.variants[0];
  })();
  const guide = resolveCharacter(activeStop?.guide);
  const guideId = guide ? guide.id : null;

  const currentStop = advState.completed
    ? undefined
    : advState.in_progress_stop_id
      ? stops.find((stop) => stop.id === advState.in_progress_stop_id)
      : stops.find((stop) => !advState.done_stop_ids.includes(stop.id));
  const dayStopUsed = advState.last_visit_day === todayKey && advState.in_progress_stop_id === null;

  function persist(next: AdventureState): void {
    setAdvState(next);
    saveAdventureState(next);
  }

  function speakPrompt(text: string, key: string): void {
    setSpeaking(true);
    narrate(text, key, guideId, () => setSpeaking(false));
  }

  function startStop(stop: AdventureStopRecord): void {
    const errands = getAdventureErrandsForStop(stop.id);
    const resumeIndex = advState.in_progress_stop_id === stop.id ? advState.next_errand_index : 0;
    const safeIndex = Math.max(0, Math.min(resumeIndex, errands.length - 1));
    const visitDays = advState.visit_days.includes(todayKey)
      ? advState.visit_days
      : [...advState.visit_days, todayKey];
    persist({
      ...advState,
      started_day: advState.started_day ?? todayKey,
      visit_days: visitDays,
      last_visit_day: todayKey,
      in_progress_stop_id: stop.id,
      next_errand_index: safeIndex,
    });
    setActiveStopId(stop.id);
    setErrandIndex(safeIndex);
    setScaffoldLevel(0);
    setRetryCue(false);
    setWrongTaps(0);
    setPickedItemId(null);
    setPhase('check');
    setMode('session');
  }

  function handleJourneyPress(stop: AdventureStopRecord): void {
    if (mode !== 'journey' || advState.completed || dayStopUsed) {
      return;
    }
    if (currentStop && stop.id === currentStop.id) {
      startStop(stop);
    }
  }

  useEffect(() => {
    if (mode !== 'session' || phase !== 'check' || !errand || !variant) {
      return;
    }
    const promptText = getString(variant.prompt_ref);
    speakPrompt(promptText, variant.prompt_ref);
    return () => {
      stopAllNarration();
      setSpeaking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phase, errandIndex, activeStopId]);

  useEffect(() => {
    if (phase !== 'celebrate' || !errand) {
      return;
    }
    advanceHandled.current = false;
    const celebrationText = getString(errand.celebration_ref);
    narrate(celebrationText, errand.celebration_ref, guideId, () => {
      advanceFromCelebration();
    });
    fallbackTimer.current = setTimeout(() => {
      advanceFromCelebration();
    }, CELEBRATION_FALLBACK_MS);
    return () => {
      if (fallbackTimer.current !== null) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
      stopAllNarration();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, errandIndex]);

  function advanceFromCelebration(): void {
    if (advanceHandled.current) {
      return;
    }
    advanceHandled.current = true;
    if (fallbackTimer.current !== null) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
    stopAllNarration();
    const errands = activeStop ? getAdventureErrandsForStop(activeStop.id) : [];
    const nextIndex = errandIndex + 1;
    if (nextIndex < errands.length) {
      persist({ ...advState, next_errand_index: nextIndex });
      setErrandIndex(nextIndex);
      setScaffoldLevel(0);
      setRetryCue(false);
      setWrongTaps(0);
      setPickedItemId(null);
      setPhase('check');
      return;
    }
    if (activeStop) {
      const doneStopIds = advState.done_stop_ids.includes(activeStop.id)
        ? advState.done_stop_ids
        : [...advState.done_stop_ids, activeStop.id];
      const allDone = stops.every((stop) => doneStopIds.includes(stop.id));
      persist({
        ...advState,
        done_stop_ids: doneStopIds,
        in_progress_stop_id: null,
        next_errand_index: 0,
        last_visit_day: todayKey,
        completed: allDone || advState.completed,
      });
    }
    setMode('win');
  }

  function handleChoose(itemId: string): void {
    if (!errand || !variant || !activeStop || phase !== 'check') {
      return;
    }
    if (itemId !== variant.target_item_id) {
      setWrongTaps((count) => count + 1);
      setRetryCue(true);
      return;
    }
    setRetryCue(false);
    setPickedItemId(itemId);
    const weight =
      scaffoldLevel <= 1 ? errand.evidence.weight_strong : errand.evidence.weight_participation;
    const evidenceEntry: NewAdventureEvidence = {
      skill_id: errand.skill_id,
      stop_id: activeStop.id,
      errand_id: errand.id,
      variant_id: variant.id,
      scaffold_level: scaffoldLevel,
      weight,
      bandable: errand.evidence.bandable,
      observable_behaviour: errand.evidence.observable_behaviour,
    };
    recordAdventureEvidence(evidenceEntry);
    const used = advState.used_variants[errand.skill_id] ?? [];
    const windowSize = adventure.visit_rules.entry_window_visits;
    const nextUsed = [...used, variant.id].slice(-windowSize);
    persist({
      ...advState,
      used_variants: { ...advState.used_variants, [errand.skill_id]: nextUsed },
    });
    setPhase('celebrate');
  }

  function handleHelp(): void {
    if (!errand || phase !== 'check') {
      return;
    }
    const nextLevel = (scaffoldLevel < 3 ? scaffoldLevel + 1 : 3) as ScaffoldLevelNumber;
    setScaffoldLevel(nextLevel);
    if (nextLevel > scaffoldLevel) {
      const scaffoldKey = `scaffold.l${nextLevel}.prompt`;
      speakPrompt(getString(scaffoldKey), scaffoldKey);
    }
  }

  function handleListen(): void {
    if (errand && variant) {
      speakPrompt(getString(variant.prompt_ref), variant.prompt_ref);
    } else if (mode === 'win' && activeStop) {
      speakPrompt(getString(activeStop.title_ref), activeStop.title_ref);
    }
  }

  function handleDone(): void {
    stopAllNarration();
    setMode('journey');
    setActiveStopId(null);
    setPhase('check');
    setScaffoldLevel(0);
    setRetryCue(false);
    setPickedItemId(null);
  }

  const widthTile = Math.floor((Math.min(width, isTablet ? 720 : 560) - (isTablet ? 96 : 64) - 12) / 2);
  const heightTile = Math.floor((height - 420) / 2);
  const tileSize = Math.max(96, Math.min(widthTile, isTablet ? 240 : 170, Math.max(96, heightTile)));
  const portraitSize = isTablet ? 126 : 96;

  if (mode === 'journey') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={isTablet ? styles.scrollTablet : styles.scroll}>
          <View style={isTablet ? styles.journeyTablet : undefined}>
            {dayStopUsed && !advState.completed ? (
              <View style={styles.dayDoneBanner}>
                <Text style={styles.dayDoneText}>{DAY_DONE_LABEL}</Text>
              </View>
            ) : null}
            {stops.map((stop) => {
              const state = advState.done_stop_ids.includes(stop.id)
                ? 'done'
                : currentStop && currentStop.id === stop.id && !dayStopUsed
                  ? 'current'
                  : 'place';
              const stopGuide = resolveCharacter(stop.guide);
              const portraitAsset = stopGuide
                ? getPackAsset(getActivePackId(), stopGuide.model_asset_path)
                : undefined;
              const tappable = state === 'current' && !advState.completed;
              const content = (
                <View style={[styles.stopRow, state === 'current' ? styles.stopRowCurrent : null]}>
                  <View style={[styles.stopPortrait, state === 'place' ? styles.stopPortraitPlace : null]}>
                    {portraitAsset !== undefined ? (
                      <Image
                        source={portraitAsset}
                        style={styles.stopPortraitImage}
                        contentFit="contain"
                        accessibilityLabel={getString(stop.title_ref)}
                      />
                    ) : null}
                  </View>
                  <View style={styles.stopTextColumn}>
                    <Text style={[styles.stopTitle, state === 'place' ? styles.stopTitlePlace : null]}>
                      {getString(stop.title_ref)}
                    </Text>
                  </View>
                  <View style={[styles.stopMark, state === 'done' ? styles.stopMarkDone : state === 'current' ? styles.stopMarkCurrent : styles.stopMarkPlace]}>
                    <StopNodeState state={state} />
                  </View>
                </View>
              );
              if (!tappable) {
                return <View key={stop.id}>{content}</View>;
              }
              return (
                <Pressable
                  key={stop.id}
                  accessibilityRole="button"
                  accessibilityLabel={getString(stop.title_ref)}
                  onPress={() => handleJourneyPress(stop)}
                  style={({ pressed }) => [pressed ? styles.stopPressed : null]}
                >
                  {content}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (mode === 'win') {
    const songMomentRef = activeStop?.song_moment_ref;
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.winCenter}>
          {guide && activeStop ? (
            <GuideBubble
              character={guide}
              prompt={getString(activeStop.title_ref)}
              scaffoldPrompt={null}
              speaking={speaking}
              celebrating
              portraitSize={portraitSize}
              onListen={handleListen}
            />
          ) : null}
          {songMomentRef ? (
            <View style={styles.songMomentCard}>
              <Text style={styles.songMomentText}>{getString(songMomentRef)}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={DONE_LABEL}
            onPress={handleDone}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.primaryButtonText}>{DONE_LABEL}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const variantPrompt = variant ? getString(variant.prompt_ref) : '';
  const scaffoldPrompt =
    scaffoldLevel > 0 ? getString(`scaffold.l${scaffoldLevel}.prompt`) : null;
  const displayItem = variant?.display_item_id
    ? resolveItem(variant.display_item_id, pictures)
    : undefined;
  const sequenceItems = (variant?.sequence ?? [])
    .map((id) => resolveItem(id, pictures))
    .filter((item): item is ResolvedItem => item !== undefined);
  const choices = (variant?.choice_item_ids ?? [])
    .map((id) => resolveItem(id, pictures))
    .filter((item): item is ResolvedItem => item !== undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.chrome}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={CLOSE_LABEL}
          onPress={() => {
            stopAllNarration();
            router.back();
          }}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        >
          <Text style={styles.closeButtonText}>{CLOSE_LABEL}</Text>
        </Pressable>
        <ProgressDots total={stopErrands.length} current={errandIndex} />
      </View>
      <View style={styles.stage}>
        {guide ? (
          <GuideBubble
            character={guide}
            prompt={variantPrompt}
            scaffoldPrompt={scaffoldPrompt}
            speaking={speaking}
            celebrating={phase === 'celebrate'}
            portraitSize={portraitSize}
            onListen={handleListen}
          />
        ) : null}
        {displayItem ? (
          <View style={styles.displayRow}>
            {displayItem.adventureItem?.display === 'image' || displayItem.pictureItem ? (
              displayItem.asset !== undefined ? (
                <Image source={displayItem.asset} style={styles.displayImage} contentFit="contain" />
              ) : null
            ) : null}
          </View>
        ) : null}
        {variant?.show_pile_count ? (
          <View style={styles.displayRow}>
            <ApplePile count={variant.show_pile_count} size={28} />
          </View>
        ) : null}
        {sequenceItems.length > 0 ? (
          <View style={styles.sequenceRow}>
            {sequenceItems.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.sequenceChip}>
                {item.asset !== undefined ? (
                  <Image source={item.asset} style={styles.sequenceImage} contentFit="contain" />
                ) : (
                  <Text style={styles.sequenceText}>{item.label}</Text>
                )}
              </View>
            ))}
          </View>
        ) : null}
        {phase === 'celebrate' && errand ? (
          <View style={styles.celebrationBanner}>
            <Text style={styles.celebrationText}>{getString(errand.celebration_ref)}</Text>
          </View>
        ) : null}
        <View style={styles.grid}>
          {phase === 'check'
            ? choices.map((item) => (
                <AdventureTile
                  key={item.id}
                  item={item}
                  highlighted={wrongTaps >= 2 && item.id === (variant ? variant.target_item_id : '')}
                  picked={pickedItemId === item.id}
                  size={tileSize}
                  onPress={() => handleChoose(item.id)}
                />
              ))
            : null}
        </View>
      </View>
      <View style={styles.footer}>
        {phase === 'check' && retryCue ? (
          <View style={styles.retryBanner}>
            <Text style={styles.retryText}>{getString('session.retry_cue')}</Text>
          </View>
        ) : null}
        {phase === 'check' ? (
          <HelpControl level={scaffoldLevel} maxed={scaffoldLevel === 3} onPress={handleHelp} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={NEXT_LABEL}
            onPress={advanceFromCelebration}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.primaryButtonText}>{NEXT_LABEL}</Text>
          </Pressable>
        )}
      </View>
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
    paddingBottom: 40,
  },
  scrollTablet: {
    padding: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  journeyTablet: {
    width: '100%',
    maxWidth: 720,
  },
  dayDoneBanner: {
    backgroundColor: '#E1EFE8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  dayDoneText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2B6E58',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 14,
    marginBottom: 14,
  },
  stopRowCurrent: {
    borderColor: '#E8A24B',
    borderWidth: 2,
    shadowColor: '#B4622D',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  stopPressed: {
    opacity: 0.85,
  },
  stopPortrait: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#F4EBDA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stopPortraitPlace: {
    opacity: 0.55,
  },
  stopPortraitImage: {
    width: 68,
    height: 68,
  },
  stopTextColumn: {
    flex: 1,
  },
  stopTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#33302B',
  },
  stopTitlePlace: {
    color: '#9C9484',
  },
  stopMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMarkDone: {
    backgroundColor: '#2B6E58',
  },
  stopMarkCurrent: {
    backgroundColor: '#FBEEDD',
    borderWidth: 2,
    borderColor: '#E8A24B',
  },
  stopMarkPlace: {
    backgroundColor: '#EFEAE0',
  },
  doneMark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  currentMark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E8A24B',
  },
  placeMark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D8CDB6',
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  stage: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  guideFrame: {
    backgroundColor: '#F4EBDA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleName: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
    marginBottom: 4,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bubbleText: {
    flex: 1,
    fontSize: 16.5,
    lineHeight: 24,
    fontWeight: '700',
    color: '#33302B',
  },
  listenButton: {
    backgroundColor: '#F4EBDA',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8CDB6',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  listenButtonPressed: {
    backgroundColor: '#EADFC8',
  },
  listenButtonText: {
    fontSize: 13,
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
  displayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  displayImage: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: '#F4EBDA',
  },
  sequenceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  sequenceChip: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F4EBDA',
    borderWidth: 1,
    borderColor: '#E7DFCE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sequenceImage: {
    width: 46,
    height: 46,
  },
  sequenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#33302B',
  },
  celebrationBanner: {
    backgroundColor: '#E1EFE8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  tile: {
    flex: 1,
    backgroundColor: '#F4EBDA',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileHighlighted: {
    borderColor: '#E8A24B',
    borderWidth: 3,
    backgroundColor: '#FDF3E3',
  },
  tilePicked: {
    borderColor: '#E8A24B',
    borderWidth: 2,
    shadowColor: '#B4622D',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tileVisual: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileLabel: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 17,
    minHeight: 34,
    fontWeight: '700',
    color: '#33302B',
    textAlign: 'center',
  },
  visualRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  beatDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2B6E58',
  },
  beatDotBig: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  retryBanner: {
    backgroundColor: '#FBEEDD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8CBA3',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  retryText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#9A6A1F',
    textAlign: 'center',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  winCenter: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
  },
  songMomentCard: {
    backgroundColor: '#E1EFE8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFDCCB',
    padding: 16,
    alignItems: 'center',
  },
  songMomentText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2B6E58',
    textAlign: 'center',
  },
});
