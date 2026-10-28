import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AdventureQuestionnaire,
  loadAdventureQuestionnaire,
  saveAdventureQuestionnaire,
} from '../lib/adventure-parent';

const CANCEL_LABEL = 'Back';
const TITLE = 'Before we begin';
const INTRO =
  'This is for grown-ups. A two-minute picture of your family so the adventure fits your child. It is stored on this device only and never shown to your child.';
const AGE_LABEL = 'How old is your child?';
const LANGUAGES_LABEL = 'Languages spoken at home';
const PRESCHOOL_LABEL = 'Preschool or nursery';
const CONCERNS_LABEL = 'Anything we should keep in mind?';
const INTERESTS_LABEL = 'Things your child loves';
const SAVE_LABEL = 'Save and start';
const NOTES =
  'These answers only shape the adventure: the language of sound-and-rhyme play, tap-only choices for little hands, and how long a visit can be. They never label your child.';

const AGES = [2, 3, 4, 5];
const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Cantonese', 'Vietnamese', 'Arabic', 'Hindi', 'French', 'Other'];
const PRESCHOOL_OPTIONS = ['Not yet', 'Part-time', 'Full-time'];
const INTERESTS = ['Animals', 'Vehicles', 'Nature', 'Music', 'Building', 'Art', 'Books'];

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && styles.chipPressed,
      ]}
    >
      <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

export default function AdventureSetupScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const existing: AdventureQuestionnaire | null = loadAdventureQuestionnaire();
  const [age, setAge] = useState<number | null>(existing ? existing.age : null);
  const [languages, setLanguages] = useState<string[]>(existing ? existing.languages : []);
  const [preschool, setPreschool] = useState<string>(existing ? existing.preschool : 'Not yet');
  const [speechConcern, setSpeechConcern] = useState(existing ? existing.speech_concern : false);
  const [motorConcern, setMotorConcern] = useState(existing ? existing.motor_concern : false);
  const [interests, setInterests] = useState<string[]>(existing ? existing.interests : []);

  function toggleList(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
  }

  function handleSave(): void {
    if (age === null) {
      return;
    }
    saveAdventureQuestionnaire({
      age,
      languages,
      preschool,
      speech_concern: speechConcern,
      motor_concern: motorConcern,
      interests,
    });
    router.replace('/adventure');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={isTablet ? styles.scrollTablet : styles.scroll}>
        <View style={isTablet ? styles.cardTablet : styles.card}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={CANCEL_LABEL}
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <Text style={styles.backButtonText}>{CANCEL_LABEL}</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>{TITLE}</Text>
          <Text style={styles.intro}>{INTRO}</Text>

          <Text style={styles.fieldLabel}>{AGE_LABEL}</Text>
          <View style={styles.chipRow}>
            {AGES.map((value) => (
              <Chip
                key={value}
                label={String(value)}
                selected={age === value}
                onPress={() => setAge(value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>{LANGUAGES_LABEL}</Text>
          <View style={styles.chipRow}>
            {LANGUAGES.map((value) => (
              <Chip
                key={value}
                label={value}
                selected={languages.includes(value)}
                onPress={() => setLanguages((current) => toggleList(current, value))}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>{PRESCHOOL_LABEL}</Text>
          <View style={styles.chipRow}>
            {PRESCHOOL_OPTIONS.map((value) => (
              <Chip key={value} label={value} selected={preschool === value} onPress={() => setPreschool(value)} />
            ))}
          </View>

          <Text style={styles.fieldLabel}>{CONCERNS_LABEL}</Text>
          <View style={styles.chipRow}>
            <Chip
              label="Speech or language"
              selected={speechConcern}
              onPress={() => setSpeechConcern((value) => !value)}
            />
            <Chip label="Motor skills" selected={motorConcern} onPress={() => setMotorConcern((value) => !value)} />
          </View>

          <Text style={styles.fieldLabel}>{INTERESTS_LABEL}</Text>
          <View style={styles.chipRow}>
            {INTERESTS.map((value) => (
              <Chip
                key={value}
                label={value}
                selected={interests.includes(value)}
                onPress={() => setInterests((current) => toggleList(current, value))}
              />
            ))}
          </View>

          <Text style={styles.notes}>{NOTES}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={SAVE_LABEL}
            disabled={age === null}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              age === null && styles.saveButtonDisabled,
              pressed && age !== null && styles.saveButtonPressed,
            ]}
          >
            <Text style={styles.saveButtonText}>{SAVE_LABEL}</Text>
          </Pressable>
        </View>
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
    paddingBottom: 40,
  },
  scrollTablet: {
    padding: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 20,
  },
  cardTablet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 28,
    width: '100%',
    maxWidth: 720,
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 8,
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 8,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: '#7A7264',
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#9A6A1F',
    marginTop: 10,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FAF5EC',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#D8CDB6',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: '#2B6E58',
    borderColor: '#2B6E58',
  },
  chipPressed: {
    backgroundColor: '#F1EADB',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33302B',
  },
  chipTextSelected: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  notes: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    color: '#7A7264',
  },
  saveButton: {
    marginTop: 18,
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
  saveButtonPressed: {
    backgroundColor: '#D18A33',
  },
  saveButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
