import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface GateQuestion {
  expression: string;
  answer: number;
  options: number[];
}

interface ParentGateProps {
  onPass: () => void;
  onCancel: () => void;
}

const GROWN_UP_CHECK_LABEL = 'Grown-up check';
const QUESTION_PREFIX = 'What is';
const QUESTION_SUFFIX = '?';
const CANCEL_LABEL = 'Back';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeQuestion(): GateQuestion {
  const useAddition = Math.random() < 0.5;
  let left: number;
  let right: number;
  let answer: number;
  if (useAddition) {
    left = 3 + Math.floor(Math.random() * 8);
    right = 2 + Math.floor(Math.random() * 7);
    answer = left + right;
  } else {
    left = 6 + Math.floor(Math.random() * 7);
    right = 2 + Math.floor(Math.random() * (left - 2));
    answer = left - right;
  }
  const distractors = new Set<number>();
  while (distractors.size < 2) {
    const delta = 1 + Math.floor(Math.random() * 3);
    const candidate = Math.random() < 0.5 ? answer - delta : answer + delta;
    if (candidate >= 0 && candidate !== answer) {
      distractors.add(candidate);
    }
  }
  return {
    expression: `${left} ${useAddition ? '+' : '-'} ${right}`,
    answer,
    options: shuffle([answer, ...distractors]),
  };
}

export default function ParentGate({ onPass, onCancel }: ParentGateProps) {
  const [question, setQuestion] = useState<GateQuestion>(makeQuestion);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.heading}>{GROWN_UP_CHECK_LABEL}</Text>
          <Text style={styles.question}>
            {QUESTION_PREFIX} {question.expression}
            {QUESTION_SUFFIX}
          </Text>
          <View style={styles.optionsRow}>
            {question.options.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={String(option)}
                onPress={() => {
                  if (option === question.answer) {
                    onPass();
                  } else {
                    setQuestion(makeQuestion());
                  }
                }}
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.optionButtonPressed,
                ]}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={CANCEL_LABEL}
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
          >
            <Text style={styles.cancelButtonText}>{CANCEL_LABEL}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 36, 33, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    padding: 24,
    alignItems: 'center',
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 8,
  },
  question: {
    fontSize: 22,
    fontWeight: '800',
    color: '#33302B',
    marginBottom: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 18,
  },
  optionButton: {
    minWidth: 84,
    backgroundColor: '#E1EFE8',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#2B6E58',
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  optionButtonPressed: {
    backgroundColor: '#CFE5D8',
  },
  optionText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2B6E58',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7DFCE',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButtonPressed: {
    backgroundColor: '#F1EADB',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7A7264',
  },
});
