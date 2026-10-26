import activePackPointerJson from '../packs/active.json';
import coreManifestJson from '../packs/core/manifest.json';
import coreStringsJson from '../packs/core/strings.json';
import coreSkillsJson from '../packs/core/skills.json';
import coreLessonsJson from '../packs/core/lessons.json';
import coreSongTemplatesJson from '../packs/core/song_templates.json';
import coreSavedSongsJson from '../packs/core/saved_songs.json';
import coreCharactersJson from '../packs/core/characters.json';
import corePictureSetsJson from '../packs/core/picture_sets.json';
import coreMissionsJson from '../packs/core/missions.json';
import coreRoutinesJson from '../packs/core/routines.json';
import coreTimeConceptsJson from '../packs/core/time_concepts.json';
import testSwitchManifestJson from '../packs/test-switch/manifest.json';
import testSwitchStringsJson from '../packs/test-switch/strings.json';
import testSwitchSkillsJson from '../packs/test-switch/skills.json';
import testSwitchLessonsJson from '../packs/test-switch/lessons.json';
import testSwitchSongTemplatesJson from '../packs/test-switch/song_templates.json';
import testSwitchSavedSongsJson from '../packs/test-switch/saved_songs.json';
import testSwitchCharactersJson from '../packs/test-switch/characters.json';
import testSwitchPictureSetsJson from '../packs/test-switch/picture_sets.json';
import testSwitchMissionsJson from '../packs/test-switch/missions.json';
import testSwitchRoutinesJson from '../packs/test-switch/routines.json';
import testSwitchTimeConceptsJson from '../packs/test-switch/time_concepts.json';
import cozyBlanketSvg from '../packs/core/assets/cozy-blanket.svg';
import foldedTowelSvg from '../packs/core/assets/folded-towel.svg';
import genericPictureSvg from '../packs/core/assets/generic-picture.svg';
import guideSvg from '../packs/core/assets/guide.svg';
import pretendPillowHandsSvg from '../packs/core/assets/pretend-pillow-hands.svg';
import softCushionSvg from '../packs/core/assets/soft-cushion.svg';
import warmCupSvg from '../packs/core/assets/warm-cup.svg';
import woodenBlockSvg from '../packs/core/assets/wooden-block.svg';
import wordsGuideSvg from '../packs/core/assets/words-guide.svg';
import { ActivePackOverride, loadActivePackOverride } from './active-pack-store';
import { resolveActivePackId } from './pack-activation-resolution.js';

export type AgeBand = '2-3' | '3-4' | '4-5' | '2-5';
export type RecordStatus = 'draft' | 'review' | 'live';
export type StringTable = Record<string, string>;

export interface PackManifest {
  id: string;
  record_type: 'manifest';
  version: string;
  schema_version: string;
  supported_schema_versions: string[];
  locale: string;
  default_locale: string;
  locales_available: string[];
  age_band: AgeBand;
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  demo: boolean;
  parent_gate_required: boolean;
  retired_ids: string[];
  dependencies: string[];
  title_ref: string;
  summary_ref: string;
  file_hashes: Record<string, string>;
  pack_sha256: string;
}

export interface PackStrings {
  record_type: 'strings';
  version: string;
  locales: Record<string, StringTable>;
}

export interface ActivePackPointer {
  active_pack_id: string;
  active_pack_path: string;
  active_pack_version: string;
  active_pack_sha256: string;
  previous_pack_id: string | null;
  previous_pack_path: string | null;
  previous_pack_version: string | null;
  previous_pack_sha256: string | null;
  updated_at: string;
}

export type SpeciesOrRole =
  | 'lantern_guide'
  | 'words_companion'
  | 'rhythm_companion'
  | 'routine_helper';

export interface CharacterAppearance {
  silhouette_shape: 'rounded_lantern' | 'leaf_cape' | 'bell_pebble' | 'cloud_cushion';
  primary_palette: 'warm_ochre_teal' | 'sage_coral' | 'indigo_amber' | 'meadow_gold';
  distinctive_prop: 'wooden_chime' | 'story_leaf' | 'felt_drum' | 'sun_dial_ring';
}

export interface CharacterVoiceProfile {
  register: 'warm_alto' | 'gentle_baritone' | 'soft_mezzo';
  pacing_wpm: number;
  synth_fallback_enabled: boolean;
}

export interface OriginalityAttestation {
  attester: string;
  date: string;
  derivation_statement: string;
}

export interface CharacterRecord {
  id: string;
  record_type: 'character';
  version: string;
  locale: string;
  age_band: AgeBand;
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  name_ref: string;
  species_or_role: SpeciesOrRole;
  originality_attestation: OriginalityAttestation;
  appearance: CharacterAppearance;
  voice_profile: CharacterVoiceProfile;
  personality_lines: string[];
  world_home_id: string;
  model_asset_path: string;
  fallback_character_id: string | null;
}

export type SkillDomain =
  | 'language'
  | 'numeracy'
  | 'music'
  | 'motor_routine'
  | 'social_cooperative'
  | 'time_concepts'
  | 'world_discovery';

export interface SkillRecord {
  id: string;
  record_type: 'skill';
  version: string;
  locale: string;
  age_band: AgeBand;
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  title_ref: string;
  description_ref: string;
  domain: SkillDomain;
  is_entry_skill: boolean;
  prerequisites: string[];
  next_skills: string[];
  age_band_min: '2-3' | '3-4' | '4-5';
  evidence_needed_to_advance: number;
  catch_up_variant_of: string | null;
}

export type InteractionType =
  | 'tap_choice'
  | 'match_pair'
  | 'sort_group'
  | 'rhythm_tap'
  | 'story_echo'
  | 'do_together';

export interface LessonStep {
  step_index: number;
  prompt_ref: string;
  target_item_id: string;
  choice_item_ids: string[];
  celebration_ref: string;
}

export type ScaffoldMode =
  | 'full_task'
  | 'fewer_choices'
  | 'highlight_and_model'
  | 'do_together_final_tap';

export interface ScaffoldLevel {
  level: number;
  mode: ScaffoldMode;
  prompt_ref: string;
  max_choices: number;
  highlight_target: boolean;
  model_demonstration: boolean;
  child_final_tap_required: boolean;
}

export interface LessonRecord {
  id: string;
  record_type: 'lesson';
  version: string;
  locale: string;
  age_band: AgeBand;
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  title_ref: string;
  primary_skill_id: string;
  secondary_skill_ids: string[];
  interaction_type: InteractionType;
  character_id: string;
  picture_set_id: string;
  song_template_id: string;
  mission_id: string | null;
  routine_id: string | null;
  estimated_minutes: number;
  chunk_budget_minutes: number;
  fallback_lesson_id: string;
  fallback_picture_id: string;
  closing_win_ref: string;
  steps: LessonStep[];
  scaffolds: Record<'0' | '1' | '2' | '3', ScaffoldLevel>;
}

export interface SongWordlists {
  adjective_refs: string[];
  noun_refs: string[];
}

export type PentatonicSetId =
  | 'c_major_pentatonic'
  | 'g_major_pentatonic'
  | 'f_major_pentatonic'
  | 'd_minor_pentatonic';

export type SongPitch = 'C4' | 'D4' | 'E4' | 'G4' | 'A4' | 'C5';

export interface SongTemplateRecord {
  id: string;
  record_type: 'song_template';
  version: string;
  locale: string;
  age_band: AgeBand;
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  title_ref: string;
  lesson_word_ref: string;
  pentatonic_set_id: PentatonicSetId;
  note_slots_total: number;
  child_slots: number;
  completion_rule_id: 'resolve_to_tonic' | 'gentle_cadence_echo' | 'auto_fill_rest_on_pause';
  tempo: number;
  timbre: 'wooden_marimba' | 'soft_kalimba' | 'warm_bell' | 'felt_piano';
  name_wordlist_id: string;
  wordlists: SongWordlists;
  base_notes: SongPitch[];
}

export interface SongNoteEvent {
  slot_index: number;
  pitch: SongPitch;
  authored_by_slot: 'template' | 'child_slot';
}

export interface SavedSongRecord {
  id: string;
  record_type: 'saved_song';
  version: string;
  locale: string;
  age_band: AgeBand;
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  song_template_id: string;
  name_wordlist_id: string;
  name_word_indices: number[];
  note_events: SongNoteEvent[];
}

export type DepictionTag =
  | 'household_safe'
  | 'soft_fabric'
  | 'wooden_toy'
  | 'nature_item'
  | 'small_object'
  | 'sharp'
  | 'hot'
  | 'requires_stairs';

export interface PictureSetItem {
  item_id: string;
  label_ref: string;
  alt_text_parent_ref: string;
  asset_path: string;
  asset_sha256: string;
  size_class: 'handheld_safe' | 'large_household' | 'small_blocked';
  passes_choke_tube_proxy: boolean;
  depiction_tags: DepictionTag[];
}

export interface PictureSetRecord {
  id: string;
  record_type: 'picture_set';
  version: string;
  locale: string;
  age_band: AgeBand;
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  title_ref: string;
  alt_text_parent_ref: string;
  depiction_tags: DepictionTag[];
  items: PictureSetItem[];
}

export interface MissionRoutineObject {
  object_id: string;
  picture_ref: string;
  label_ref: string;
  alternative_object_id: string;
  alternative_picture_ref: string;
  fallback_body_action_id: string;
  fallback_body_picture_ref: string;
}

export interface MissionPrecheck {
  required: boolean;
  prompt_ref: string;
  space_clear_check: boolean;
  adult_present_check: boolean;
}

export interface MissionRecord {
  id: string;
  record_type: 'mission';
  version: string;
  locale: string;
  age_band: AgeBand;
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  title_ref: string;
  skill_id: string;
  parent_script_ref: string;
  child_prompt_ref: string;
  team_goal_ref: string;
  parent_precheck: MissionPrecheck;
  parent_gate_required: boolean;
  estimated_minutes: number;
  cooperative_only: boolean;
  song_id: string | null;
  song_fallback_rule: 'use_lesson_song_template' | 'hum_gentle_cadence';
  return_ritual_ref: string;
  safety_notes_refs: string[];
  objects: MissionRoutineObject[];
}

export interface RoutineRecord {
  id: string;
  record_type: 'routine';
  version: string;
  locale: string;
  age_band: AgeBand;
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  title_ref: string;
  anchor: 'morning_wake' | 'mealtime_prep' | 'tidy_together' | 'bath_splash' | 'bedtime_winddown';
  time_of_day: 'morning' | 'midday' | 'afternoon' | 'evening';
  skill_id: string;
  parent_script_ref: string;
  child_prompt_ref: string;
  team_goal_ref: string;
  cooperative_only: boolean;
  song_id: string | null;
  song_fallback_rule: 'use_lesson_song_template' | 'hum_gentle_cadence';
  return_ritual_ref: string;
  safety_notes_refs: string[];
  objects: MissionRoutineObject[];
}

export type TimeConceptKey =
  | 'now_next'
  | 'day_night'
  | 'first_then'
  | 'morning_afternoon_evening'
  | 'before_after'
  | 'yesterday_today_tomorrow'
  | 'seasons_cycle';

export interface TimeConceptRecord {
  id: string;
  record_type: 'time_concept';
  version: string;
  locale: string;
  age_band: '2-3' | '3-4' | '4-5';
  status: RecordStatus;
  tags: string[];
  created_by: string;
  reviewed_by: string;
  notes_author: string;
  concept_key: TimeConceptKey;
  title_ref: string;
  prompt_ref: string;
  picture_set_id: string;
}

export interface PackFiles {
  packId: string;
  manifest: PackManifest;
  strings: PackStrings;
  skills: SkillRecord[];
  lessons: LessonRecord[];
  songTemplates: SongTemplateRecord[];
  savedSongs: SavedSongRecord[];
  characters: CharacterRecord[];
  pictureSets: PictureSetRecord[];
  missions: MissionRecord[];
  routines: RoutineRecord[];
  timeConcepts: TimeConceptRecord[];
}

const activePackPointer = activePackPointerJson as ActivePackPointer;

/*
 * EXTENSION POINT — future packs.
 * Metro cannot require() a variable path, so every shipped pack must be
 * statically imported above and registered here by its pack id. To add a
 * pack: import its files, add an entry to PACK_REGISTRY, and register its
 * static assets in PACK_ASSET_REGISTRY below.
 */
const PACK_REGISTRY: Record<string, PackFiles> = {
  core: {
    packId: 'core',
    manifest: coreManifestJson as PackManifest,
    strings: coreStringsJson as PackStrings,
    skills: coreSkillsJson as SkillRecord[],
    lessons: coreLessonsJson as LessonRecord[],
    songTemplates: coreSongTemplatesJson as SongTemplateRecord[],
    savedSongs: coreSavedSongsJson as SavedSongRecord[],
    characters: coreCharactersJson as CharacterRecord[],
    pictureSets: corePictureSetsJson as PictureSetRecord[],
    missions: coreMissionsJson as MissionRecord[],
    routines: coreRoutinesJson as RoutineRecord[],
    timeConcepts: coreTimeConceptsJson as TimeConceptRecord[],
  },
  'test-switch': {
    packId: 'test-switch',
    manifest: testSwitchManifestJson as PackManifest,
    strings: testSwitchStringsJson as PackStrings,
    skills: testSwitchSkillsJson as SkillRecord[],
    lessons: testSwitchLessonsJson as LessonRecord[],
    songTemplates: testSwitchSongTemplatesJson as SongTemplateRecord[],
    savedSongs: testSwitchSavedSongsJson as SavedSongRecord[],
    characters: testSwitchCharactersJson as CharacterRecord[],
    pictureSets: testSwitchPictureSetsJson as PictureSetRecord[],
    missions: testSwitchMissionsJson as MissionRecord[],
    routines: testSwitchRoutinesJson as RoutineRecord[],
    timeConcepts: testSwitchTimeConceptsJson as TimeConceptRecord[],
  },
};

const PACK_ASSET_REGISTRY: Record<string, Record<string, number>> = {
  core: {
    'assets/cozy-blanket.svg': cozyBlanketSvg,
    'assets/folded-towel.svg': foldedTowelSvg,
    'assets/generic-picture.svg': genericPictureSvg,
    'assets/guide.svg': guideSvg,
    'assets/pretend-pillow-hands.svg': pretendPillowHandsSvg,
    'assets/soft-cushion.svg': softCushionSvg,
    'assets/warm-cup.svg': warmCupSvg,
    'assets/wooden-block.svg': woodenBlockSvg,
    'assets/words-guide.svg': wordsGuideSvg,
  },
  'test-switch': {
    'assets/cozy-blanket.svg': cozyBlanketSvg,
    'assets/folded-towel.svg': foldedTowelSvg,
    'assets/generic-picture.svg': genericPictureSvg,
    'assets/guide.svg': guideSvg,
    'assets/pretend-pillow-hands.svg': pretendPillowHandsSvg,
    'assets/soft-cushion.svg': softCushionSvg,
    'assets/warm-cup.svg': warmCupSvg,
    'assets/wooden-block.svg': woodenBlockSvg,
    'assets/words-guide.svg': wordsGuideSvg,
  },
};

let cachedOverride: ActivePackOverride | null | undefined;

function readOverrideCached(): ActivePackOverride | null {
  if (cachedOverride === undefined) {
    cachedOverride = loadActivePackOverride();
  }
  return cachedOverride;
}

export function invalidateActivePackOverrideCache(): void {
  cachedOverride = undefined;
}

export function getRegisteredPacks(): PackFiles[] {
  return Object.values(PACK_REGISTRY);
}

export function getActivePackId(): string {
  const override = readOverrideCached();
  const resolved = resolveActivePackId(
    override ? override.active_pack_id : null,
    activePackPointer.active_pack_id,
    Object.keys(PACK_REGISTRY)
  );
  if (resolved === null) {
    throw new Error('No content packs are present in the static pack registry.');
  }
  return resolved;
}

export function getActivePack(): PackFiles {
  const activePackId = getActivePackId();
  const pack = PACK_REGISTRY[activePackId];
  if (!pack) {
    throw new Error(`Active pack "${activePackId}" is not present in the static pack registry.`);
  }
  return pack;
}

export function getStrings(locale?: string): StringTable {
  const pack = getActivePack();
  const locales = pack.strings.locales;
  const requested = locale ?? pack.manifest.default_locale;
  if (locales[requested]) {
    return locales[requested];
  }
  return locales[pack.manifest.default_locale];
}

export function getString(ref: string, locale?: string): string {
  const table = getStrings(locale);
  return table[ref] ?? ref;
}

export function getSkills(): SkillRecord[] {
  return getActivePack().skills;
}

export function getSkillById(id: string): SkillRecord | undefined {
  return getSkills().find((skill) => skill.id === id);
}

export function getLessons(): LessonRecord[] {
  return getActivePack().lessons;
}

export function getLessonById(id: string): LessonRecord | undefined {
  return getLessons().find((lesson) => lesson.id === id);
}

export function getCharacters(): CharacterRecord[] {
  return getActivePack().characters;
}

export function getCharacterById(id: string): CharacterRecord | undefined {
  return getCharacters().find((character) => character.id === id);
}

export function getPictureSets(): PictureSetRecord[] {
  return getActivePack().pictureSets;
}

export function getPictureSetById(id: string): PictureSetRecord | undefined {
  return getPictureSets().find((set) => set.id === id);
}

export function getMissions(): MissionRecord[] {
  return getActivePack().missions;
}

export function getMissionById(id: string): MissionRecord | undefined {
  return getMissions().find((mission) => mission.id === id);
}

export function getRoutines(): RoutineRecord[] {
  return getActivePack().routines;
}

export function getRoutineById(id: string): RoutineRecord | undefined {
  return getRoutines().find((routine) => routine.id === id);
}

export function getTimeConcepts(): TimeConceptRecord[] {
  return getActivePack().timeConcepts;
}

export function getSongTemplates(): SongTemplateRecord[] {
  return getActivePack().songTemplates;
}

export function getSongTemplateById(id: string): SongTemplateRecord | undefined {
  return getSongTemplates().find((template) => template.id === id);
}

export function getSavedSongs(): SavedSongRecord[] {
  return getActivePack().savedSongs;
}

export function getJourneyStopSkills(): SkillRecord[] {
  const skills = getSkills();
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const visited = new Set<string>();
  const order: SkillRecord[] = [];
  const queue: string[] = skills
    .filter((skill) => skill.is_entry_skill)
    .map((skill) => skill.id);
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || visited.has(id)) {
      continue;
    }
    visited.add(id);
    const skill = byId.get(id);
    if (!skill) {
      continue;
    }
    order.push(skill);
    for (const nextId of skill.next_skills) {
      queue.push(nextId);
    }
  }
  for (const skill of skills) {
    if (!visited.has(skill.id)) {
      order.push(skill);
    }
  }
  return order;
}

export function getPackAsset(packId: string, assetPath: string): number | undefined {
  return PACK_ASSET_REGISTRY[packId]?.[assetPath];
}
