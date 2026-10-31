export interface EvidenceHelpOnlyLesson {
  evidence_help_only?: boolean;
}

export function completedWithHelpFor(
  lesson: EvidenceHelpOnlyLesson | null | undefined,
  scaffoldLevel: number
): boolean;

export interface StepOutcomeForEvidence {
  scaffoldLevelAtCompletion?: number;
  completedWithHelp?: boolean;
  evidenceSkillIds?: string[] | null;
  evidenceParticipation?: boolean;
}

export interface StepEvidenceEntry {
  skill_id: string;
  scaffold_level_at_completion: number;
  completed_with_help: boolean;
  participation?: true;
}

export interface EvidenceWeightRecord {
  completed_with_help?: boolean;
  participation?: boolean;
}

export function stepEvidenceEntries(
  outcome: StepOutcomeForEvidence | null | undefined,
  lessonPrimarySkillId: string
): StepEvidenceEntry[];

export function evidenceWeightFor(record: EvidenceWeightRecord | null | undefined): 'strong' | 'participation';
