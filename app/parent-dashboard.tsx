import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  getMissionById,
  getRoutineById,
  getSkills,
  getString,
} from '../lib/pack-loader';
import {
  SkillBand,
  SkillEvidenceRecord,
  deriveSkillBand,
  groupEvidenceBySkill,
  loadSkillEvidence,
  loadTogetherCompletions,
} from '../lib/progress-store';
import { loadParentSettings, saveParentSettings } from '../lib/parent-settings';

const BACK_LABEL = 'Back';
const DASHBOARD_TITLE = 'For grown-ups';
const SKILL_BANDS_LABEL = 'Skill bands';
const TOGETHER_HISTORY_LABEL = 'Together history';
const TODAYS_NOTE_LABEL = "Today's note";
const MISSIONS_SETTING_LABEL = 'Missions setting';
const MISSIONS_TOGGLE_LABEL = 'Missions';
const MISSIONS_TOGGLE_HINT = 'Shows the Together lane on the child’s home screen.';
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

  const skills = getSkills();
  const evidence: SkillEvidenceRecord[] = loadSkillEvidence();
  const evidenceBySkill = groupEvidenceBySkill(evidence);
  const bandRows = skills.map((skill) => ({
    key: skill.id,
    title: getString(skill.title_ref),
    band: deriveSkillBand(evidenceBySkill.get(skill.id) ?? []),
  }));

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

  const noteParts: string[] = [];
  if (lessonsToday > 0) {
    noteParts.push(`finished ${lessonsToday} lesson${lessonsToday === 1 ? '' : 's'}`);
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

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollTablet}>
          <View style={styles.tabletColumns}>
            <View style={styles.tabletColumn}>
              {headerSection}
              {skillBandsSection}
              {todaysNoteSection}
            </View>
            <View style={styles.tabletColumn}>
              {historySection}
              {settingsSection}
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
        {settingsSection}
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 16,
    marginBottom: 14,
  },
  sectionCardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
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
});
