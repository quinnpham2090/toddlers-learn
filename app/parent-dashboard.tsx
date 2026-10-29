import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  LessonRecord,
  getActivePack,
  getActivePackId,
  getJourneyStopSkills,
  getLessonById,
  getLessons,
  getMissionById,
  getRoutineById,
  getSkills,
  getString,
} from '../lib/pack-loader';
import {
  SkillBand,
  SkillEvidenceRecord,
  clearSkillEvidence,
  deriveSkillBand,
  groupEvidenceBySkill,
  loadSkillEvidence,
  loadTogetherCompletions,
} from '../lib/progress-store';
import { SELECTION_CODE_VERSION, selectNextLesson } from '../lib/lesson-selection.js';
import { clearSessionBookmark } from '../lib/resume-store';
import { loadParentSettings, saveParentSettings } from '../lib/parent-settings';
import { loadSavedSongs } from '../lib/song-store';
import { buildPlacementMap } from '../lib/adventure-map';


const BACK_LABEL = 'Back';
const DASHBOARD_TITLE = 'For grown-ups';
const SKILL_BANDS_LABEL = 'Skill bands';
const TOGETHER_HISTORY_LABEL = 'Together history';
const TODAYS_NOTE_LABEL = "Today's note";
const MISSIONS_SETTING_LABEL = 'Missions setting';
const MISSIONS_TOGGLE_LABEL = 'Missions';
const MISSIONS_TOGGLE_HINT =
  'Shows the Together lane on the child’s home screen after the first path.';
const DIAGNOSTICS_LABEL = 'Diagnostics';
const PLACEMENT_MAP_LABEL = 'Parent map';
const STILL_EMPTY_MESSAGE = 'Every skill has a first bit of evidence.';
const STILL_CURIOSITY =
  'Just places to wander into when they are ready.';
const GROWING_EMPTY_MESSAGE = 'No growing notes yet.';
const RESET_SECTION_LABEL = 'Reset lesson progress';
const RESET_BUTTON_LABEL = 'Reset lesson progress';
const RESET_HINT =
  'Lesson progress only. Saved songs, together history, and parent settings are kept.';
const RESET_CONFIRM_TEXT =
  'Reset lesson progress? This erases lesson progress and the resume bookmark. Songs and together history are kept.';
const CONFIRM_LABEL = 'Confirm';
const CANCEL_LABEL = 'Cancel';
const QUIET_DAY_MESSAGE = 'A quiet day — nothing recorded yet.';
const NO_HISTORY_MESSAGE = 'No together activities yet.';

const BAND_DISPLAY: Record<SkillBand, string> = {
  'not-yet-explored': 'Not yet explored',
  exploring: 'Exploring',
  practising: 'Practising',
  confident: 'Confident',
};

const BAND_COLORS: Record<SkillBand, { soft: string; deep: string }> = {
  'not-yet-explored': { soft: '#EFEAE0', deep: '#7A7264' },
  exploring: { soft: '#E5EDF7', deep: '#3A5A8C' },
  practising: { soft: '#FBEEDD', deep: '#9A6A1F' },
  confident: { soft: '#E1EFE8', deep: '#2B6E58' },
};

interface TogetherHistoryEntry {
  kind: 'mission' | 'routine';
  title: string;
  date: string;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
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

function SectionCard({
  heading,
  isTablet,
  children,
}: {
  heading: string;
  isTablet: boolean;
  children: ReactNode;
}) {
  return (
    <View style={isTablet ? styles.sectionCardTablet : styles.sectionCard}>
      <Text style={isTablet ? styles.sectionHeadingTablet : styles.sectionHeading}>{heading}</Text>
      {children}
    </View>
  );
}

function BandRow({
  title,
  band,
  isTablet,
}: {
  title: string;
  band: SkillBand;
  isTablet: boolean;
}) {
  const colors = BAND_COLORS[band];
  return (
    <View style={styles.bandRow}>
      <Text style={isTablet ? styles.bandSkillTitleTablet : styles.bandSkillTitle}>{title}</Text>
      <View style={[styles.bandChip, { backgroundColor: colors.soft }]}>
        <Text style={[styles.bandChipText, { color: colors.deep }]}>{BAND_DISPLAY[band]}</Text>
      </View>
    </View>
  );
}

function HistoryRow({ entry, isTablet }: { entry: TogetherHistoryEntry; isTablet: boolean }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyTitleRow}>
        <Text style={isTablet ? styles.historyTitleTablet : styles.historyTitle}>
          {entry.title}
        </Text>
        <View style={styles.historyKindChip}>
          <Text style={styles.historyKindText}>{entry.kind}</Text>
        </View>
      </View>
      <Text style={isTablet ? styles.historyDateTablet : styles.historyDate}>
        {formatDate(entry.date)}
      </Text>
    </View>
  );
}

function SettingsToggleRow({
  label,
  hint,
  checked,
  isTablet,
  onToggle,
}: {
  label: string;
  hint: string;
  checked: boolean;
  isTablet: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      style={styles.settingsRow}
    >
      <View style={styles.settingsTextColumn}>
        <Text style={isTablet ? styles.settingsLabelTablet : styles.settingsLabel}>{label}</Text>
        <Text style={isTablet ? styles.settingsHintTablet : styles.settingsHint}>{hint}</Text>
      </View>
      <View style={[styles.switchTrack, checked && styles.switchTrackOn]}>
        <View style={[styles.switchThumb, checked && styles.switchThumbOn]} />
      </View>
    </Pressable>
  );
}

function DiagnosticRow({
  label,
  value,
  isTablet,
}: {
  label: string;
  value: string;
  isTablet: boolean;
}) {
  return (
    <View style={styles.diagRow}>
      <Text style={isTablet ? styles.diagLabelTablet : styles.diagLabel}>{label}</Text>
      <Text style={isTablet ? styles.diagValueTablet : styles.diagValue}>{value}</Text>
    </View>
  );
}

export default function ParentDashboardScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [missionsEnabled, setMissionsEnabled] = useState(() => {
    try {
      return loadParentSettings().missions_enabled;
    } catch {
      return true;
    }
  });
  const [evidence, setEvidence] = useState<SkillEvidenceRecord[]>(() => loadSkillEvidence());
  const [resetConfirming, setResetConfirming] = useState(false);

  const skills = getSkills();
  const evidenceBySkill = groupEvidenceBySkill(evidence);
  const bandRows = skills.map((skill) => ({
    key: skill.id,
    title: getString(skill.title_ref),
    band: deriveSkillBand(evidenceBySkill.get(skill.id) ?? []),
  }));

  const journeySkills = getJourneyStopSkills();
  const evidenceByJourneySkill = journeySkills.map((skill) => ({
    id: skill.id,
    title: getString(skill.title_ref),
    count: (evidenceBySkill.get(skill.id) ?? []).length,
  }));
  const completedSkillIds = Array.from(new Set(evidence.map((record) => record.skill_id)));
  const nextLesson = selectNextLesson({
    lessons: getLessons(),
    journeySkills,
    completedSkillIds,
    getLessonById,
  }) as LessonRecord | null;
  const placementMap = buildPlacementMap();
  const activePackId = getActivePackId();
  const activePackVersion = getActivePack().manifest.version;

  const completions = loadTogetherCompletions();
  const history: TogetherHistoryEntry[] = completions
    .map((completion) => {
      const record =
        completion.kind === 'mission'
          ? getMissionById(completion.item_id)
          : getRoutineById(completion.item_id);
      const title = record ? getString(record.title_ref) : completion.item_id;
      return { kind: completion.kind, title, date: completion.date };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const todayKey = localDateKey(new Date());
  const todaysEvidence = evidence.filter(
    (record) => localDateKey(new Date(record.date)) === todayKey
  );
  const lessonsToday = new Set(todaysEvidence.map((record) => record.date)).size;
  const togetherToday = history.filter(
    (entry) => localDateKey(new Date(entry.date)) === todayKey
  ).length;
  const songsToday = loadSavedSongs().filter(
    (song) => song.saved_date && localDateKey(new Date(song.saved_date)) === todayKey
  ).length;

  const noteParts: string[] = [];
  if (lessonsToday > 0) {
    noteParts.push(`finished ${lessonsToday} lesson${lessonsToday === 1 ? '' : 's'}`);
  }
  if (songsToday > 0) {
    noteParts.push(`saved ${songsToday} song${songsToday === 1 ? '' : 's'}`);
  }
  if (togetherToday > 0) {
    noteParts.push(
      `completed ${togetherToday} together activit${togetherToday === 1 ? 'y' : 'ies'}`
    );
  }
  const todaysNote =
    noteParts.length > 0 ? `Today we ${noteParts.join(' and ')}.` : QUIET_DAY_MESSAGE;

  function handleToggleMissions() {
    const next = { missions_enabled: !missionsEnabled };
    const saved = saveParentSettings(next);
    if (saved) {
      setMissionsEnabled(saved.missions_enabled);
    }
  }

  function handleConfirmReset() {
    clearSkillEvidence();
    clearSessionBookmark();
    setEvidence(loadSkillEvidence());
    setResetConfirming(false);
  }

  const headerSection = (
    <View>
      <View style={styles.topRow}>
        <BackButton />
      </View>
      <Text style={isTablet ? styles.dashboardTitleTablet : styles.dashboardTitle}>
        {DASHBOARD_TITLE}
      </Text>
    </View>
  );

  const skillBandsSection = (
    <SectionCard heading={SKILL_BANDS_LABEL} isTablet={isTablet}>
      {bandRows.map((row) => (
        <BandRow key={row.key} title={row.title} band={row.band} isTablet={isTablet} />
      ))}
    </SectionCard>
  );

  const historySection = (
    <SectionCard heading={TOGETHER_HISTORY_LABEL} isTablet={isTablet}>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>{NO_HISTORY_MESSAGE}</Text>
      ) : (
        history.map((entry, index) => (
          <HistoryRow key={`${entry.kind}-${entry.date}-${index}`} entry={entry} isTablet={isTablet} />
        ))
      )}
    </SectionCard>
  );

  const todaysNoteSection = (
    <SectionCard heading={TODAYS_NOTE_LABEL} isTablet={isTablet}>
      <Text style={isTablet ? styles.noteTextTablet : styles.noteText}>{todaysNote}</Text>
    </SectionCard>
  );

  const stillByDomain = placementMap.stillGettingToKnow.reduce<
    { domain: string; label: string; titles: string[] }[]
  >((groups, item) => {
    const existing = groups.find((group) => group.domain === item.domain);
    if (existing) {
      existing.titles.push(item.title);
      return groups;
    }
    groups.push({ domain: item.domain, label: item.domainLabel, titles: [item.title] });
    return groups;
  }, []);

  const placementMapSection = (
    <SectionCard heading={PLACEMENT_MAP_LABEL} isTablet={isTablet}>
      <Text style={styles.mapDisclaimer}>{placementMap.disclaimer}</Text>
      {placementMap.rows.map((row) => {
        const colors = BAND_COLORS[row.band];
        return (
          <View key={row.domain} style={styles.mapRow}>
            <View style={styles.mapHeader}>
              <Text style={isTablet ? styles.mapDomainTablet : styles.mapDomain}>
                {row.domainLabel}
              </Text>
              <View style={[styles.bandChip, { backgroundColor: colors.soft }]}>
                <Text style={[styles.bandChipText, { color: colors.deep }]}>
                  {BAND_DISPLAY[row.band]}
                  {row.provisional ? ' (early signal)' : ''}
                </Text>
              </View>
              {row.provisional ? (
                <View style={styles.provisionalChip}>
                  <Text style={styles.provisionalChipText}>PROVISIONAL</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.mapLine}>
              {row.strength ?? 'Nothing recorded here yet.'}
            </Text>
            {row.workingOn ? <Text style={styles.mapLine}>{row.workingOn}</Text> : null}
            <Text style={styles.mapLine}>{row.nextUp}</Text>
            {row.provisional ? (
              <Text style={styles.mapProvisionalNote}>{placementMap.scienceProvisionalNote}</Text>
            ) : null}
          </View>
        );
      })}
      <View style={styles.mapSubsection}>
        <Text style={isTablet ? styles.mapSubheadingTablet : styles.mapSubheading}>
          {placementMap.stillGettingToKnowLabel}
        </Text>
        <Text style={styles.mapCuriosity}>{STILL_CURIOSITY}</Text>
        {stillByDomain.length === 0 ? (
          <Text style={styles.mapLine}>{STILL_EMPTY_MESSAGE}</Text>
        ) : (
          stillByDomain.map((group) => (
            <Text key={group.domain} style={styles.mapLine}>
              {group.label}: {group.titles.join(', ')}
            </Text>
          ))
        )}
      </View>
      <View style={styles.growingStrip}>
        <Text style={isTablet ? styles.mapSubheadingTablet : styles.mapSubheading}>
          {placementMap.growingNotesLabel}
        </Text>
        {placementMap.growingNotes.length === 0 ? (
          <Text style={styles.mapLine}>{GROWING_EMPTY_MESSAGE}</Text>
        ) : (
          placementMap.growingNotes.map((note) => (
            <Text key={note.skillId} style={styles.growingNote}>
              {note.title}: {note.note}
            </Text>
          ))
        )}
      </View>
    </SectionCard>
  );

  const settingsSection = (
    <SectionCard heading={MISSIONS_SETTING_LABEL} isTablet={isTablet}>
      <SettingsToggleRow
        label={MISSIONS_TOGGLE_LABEL}
        hint={MISSIONS_TOGGLE_HINT}
        checked={missionsEnabled}
        isTablet={isTablet}
        onToggle={handleToggleMissions}
      />
    </SectionCard>
  );

  const resetSection = (
    <SectionCard heading={RESET_SECTION_LABEL} isTablet={isTablet}>
      {resetConfirming ? (
        <View>
          <Text style={isTablet ? styles.resetConfirmTextTablet : styles.resetConfirmText}>
            {RESET_CONFIRM_TEXT}
          </Text>
          <View style={styles.resetButtonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={CONFIRM_LABEL}
              onPress={handleConfirmReset}
              style={({ pressed }) => [
                styles.resetConfirmButton,
                pressed && styles.resetConfirmButtonPressed,
              ]}
            >
              <Text style={styles.resetConfirmButtonText}>{CONFIRM_LABEL}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={CANCEL_LABEL}
              onPress={() => setResetConfirming(false)}
              style={({ pressed }) => [
                styles.resetCancelButton,
                pressed && styles.resetCancelButtonPressed,
              ]}
            >
              <Text style={styles.resetCancelButtonText}>{CANCEL_LABEL}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View>
          <Text style={isTablet ? styles.resetHintTablet : styles.resetHint}>{RESET_HINT}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={RESET_BUTTON_LABEL}
            onPress={() => setResetConfirming(true)}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetButtonPressed,
            ]}
          >
            <Text style={styles.resetButtonText}>{RESET_BUTTON_LABEL}</Text>
          </Pressable>
        </View>
      )}
    </SectionCard>
  );

  const diagnosticsSection = (
    <SectionCard heading={DIAGNOSTICS_LABEL} isTablet={isTablet}>
      <DiagnosticRow
        label="Active pack"
        value={`${activePackId} (v${activePackVersion})`}
        isTablet={isTablet}
      />
      <DiagnosticRow
        label="Next lesson"
        value={
          nextLesson
            ? `${nextLesson.id} — ${getString(nextLesson.title_ref)}`
            : 'none resolvable'
        }
        isTablet={isTablet}
      />
      <DiagnosticRow
        label="Selection code version"
        value={SELECTION_CODE_VERSION}
        isTablet={isTablet}
      />
      <View style={styles.diagEvidenceBlock}>
        <Text style={isTablet ? styles.diagLabelTablet : styles.diagLabel}>
          Evidence by journey skill
        </Text>
        {evidenceByJourneySkill.map((row) => (
          <Text
            key={row.id}
            style={isTablet ? styles.diagEvidenceLineTablet : styles.diagEvidenceLine}
          >
            {row.title}: {row.count}
          </Text>
        ))}
      </View>
    </SectionCard>
  );

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollTablet}>
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>
              {headerSection}
              {skillBandsSection}
              {todaysNoteSection}
              {placementMapSection}
            </View>
            <View style={styles.tabletColumn}>
              {historySection}
              {settingsSection}
              {resetSection}
              {diagnosticsSection}
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
        {skillBandsSection}
        {historySection}
        {todaysNoteSection}
        {placementMapSection}
        {settingsSection}
        {resetSection}
        {diagnosticsSection}
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
  dashboardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 16,
  },
  dashboardTitleTablet: {
    fontSize: 30,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
    marginBottom: 14,
  },
  sectionCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 22,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
    marginBottom: 10,
  },
  sectionHeadingTablet: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
    marginBottom: 12,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
  },
  bandSkillTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#33302B',
  },
  bandSkillTitleTablet: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#33302B',
  },
  bandChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bandChipText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  historyRow: {
    paddingVertical: 8,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#33302B',
  },
  historyTitleTablet: {
    fontSize: 17.5,
    fontWeight: '700',
    color: '#33302B',
  },
  historyKindChip: {
    backgroundColor: '#F4EBDA',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  historyKindText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A6A1F',
  },
  historyDate: {
    marginTop: 3,
    fontSize: 13,
    color: '#7A7264',
  },
  historyDateTablet: {
    marginTop: 4,
    fontSize: 14.5,
    color: '#7A7264',
  },
  noteText: {
    fontSize: 15.5,
    lineHeight: 23,
    color: '#33302B',
  },
  noteTextTablet: {
    fontSize: 18,
    lineHeight: 27,
    color: '#33302B',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 6,
  },
  settingsTextColumn: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#33302B',
  },
  settingsLabelTablet: {
    fontSize: 18,
    fontWeight: '700',
    color: '#33302B',
  },
  settingsHint: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    color: '#7A7264',
  },
  settingsHintTablet: {
    marginTop: 4,
    fontSize: 14.5,
    lineHeight: 21,
    color: '#7A7264',
  },
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#C4BBA5',
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
  switchTrackOn: {
    borderColor: '#2B6E58',
    backgroundColor: '#2B6E58',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C4BBA5',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14.5,
    lineHeight: 21,
    color: '#7A7264',
  },
  diagRow: {
    paddingVertical: 6,
  },
  diagLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7A7264',
    marginBottom: 2,
  },
  diagLabelTablet: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7A7264',
    marginBottom: 3,
  },
  diagValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#33302B',
  },
  diagValueTablet: {
    fontSize: 17,
    fontWeight: '700',
    color: '#33302B',
  },
  diagEvidenceBlock: {
    marginTop: 8,
  },
  diagEvidenceLine: {
    fontSize: 14,
    color: '#33302B',
    marginTop: 3,
  },
  diagEvidenceLineTablet: {
    fontSize: 16,
    color: '#33302B',
    marginTop: 4,
  },
  mapDisclaimer: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7A7264',
    marginBottom: 12,
  },
  mapRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1EADB',
    paddingTop: 12,
    marginTop: 4,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  mapDomain: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#33302B',
  },
  mapDomainTablet: {
    fontSize: 18,
    fontWeight: '800',
    color: '#33302B',
  },
  provisionalChip: {
    backgroundColor: '#FBEEDD',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  provisionalChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
  },
  mapLine: {
    fontSize: 14,
    lineHeight: 20,
    color: '#33302B',
    marginTop: 2,
  },
  mapBehaviour: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    color: '#7A7264',
    marginTop: 4,
  },
  mapProvisionalNote: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    color: '#9A6A1F',
    marginTop: 4,
  },
  mapSubsection: {
    borderTopWidth: 1,
    borderTopColor: '#F1EADB',
    marginTop: 14,
    paddingTop: 12,
  },
  mapSubheading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 4,
  },
  mapSubheadingTablet: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 5,
  },
  mapCuriosity: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7A7264',
    marginBottom: 4,
  },
  growingStrip: {
    backgroundColor: '#E1EFE8',
    borderRadius: 14,
    marginTop: 14,
    padding: 12,
  },
  growingNote: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#2B6E58',
    marginTop: 4,
  },
  resetHint: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#7A7264',
    marginBottom: 12,
  },
  resetHintTablet: {
    fontSize: 15.5,
    lineHeight: 23,
    color: '#7A7264',
    marginBottom: 14,
  },
  resetConfirmText: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
    color: '#33302B',
    marginBottom: 14,
  },
  resetConfirmTextTablet: {
    fontSize: 17.5,
    lineHeight: 27,
    fontWeight: '700',
    color: '#33302B',
    marginBottom: 16,
  },
  resetButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resetButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#B4502F',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resetButtonPressed: {
    backgroundColor: '#FBE7DF',
  },
  resetButtonText: {
    color: '#B4502F',
    fontSize: 15,
    fontWeight: '800',
  },
  resetConfirmButton: {
    backgroundColor: '#B4502F',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  resetConfirmButtonPressed: {
    backgroundColor: '#9A3F24',
  },
  resetConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  resetCancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  resetCancelButtonPressed: {
    backgroundColor: '#F1EADB',
  },
  resetCancelButtonText: {
    color: '#7A7264',
    fontSize: 15,
    fontWeight: '700',
  },
});
