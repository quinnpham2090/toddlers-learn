export interface EvidenceHelpOnlyLesson {
  evidence_help_only?: boolean;
}

export function completedWithHelpFor(
  lesson: EvidenceHelpOnlyLesson | null | undefined,
  scaffoldLevel: number
): boolean;
