/**
 * Evidence-marking policy (pure, Node-safe).
 *
 * A lesson record can opt into help-only evidence marking with the optional
 * `evidence_help_only` field. When it is set, every step outcome is written as
 * completed-with-help regardless of the scaffold level the child finished at,
 * so the evidence can never qualify for a band move.
 *
 * This is the single source of truth for that rule: the session uses it when
 * writing step outcomes, and dev-harness/l6-evidence-drill.js proves the
 * downstream band behavior against this exact function.
 */
export function completedWithHelpFor(lesson, scaffoldLevel) {
  return lesson?.evidence_help_only === true || scaffoldLevel === 3;
}

/**
 * Builds the progress-store entries for one completed step.
 *
 * `evidenceSkillIds` absent/empty => exactly today's behaviour: one entry for the
 * lesson's primary skill. Present => one entry per listed skill (explicit over
 * implicit; list the primary too if it should count).
 *
 * `evidenceParticipation: true` marks every entry for the step participation-only.
 * The `participation` key is added ONLY when true, so entries for steps without the
 * flag are byte-shape-identical to before this field existed.
 */
export function stepEvidenceEntries(outcome, lessonPrimarySkillId) {
  const skills =
    Array.isArray(outcome?.evidenceSkillIds) && outcome.evidenceSkillIds.length > 0
      ? outcome.evidenceSkillIds
      : [lessonPrimarySkillId];
  const participation = outcome?.evidenceParticipation === true;
  return skills.map((skillId) => {
    const entry = {
      skill_id: skillId,
      scaffold_level_at_completion: outcome?.scaffoldLevelAtCompletion ?? 0,
      completed_with_help: outcome?.completedWithHelp === true,
    };
    if (participation) {
      entry.participation = true;
    }
    return entry;
  });
}

/**
 * Weight for a stored evidence record, used when normalising lesson evidence for
 * the bands engine. Help-marked and participation-marked records are both
 * non-qualifying; `participation` is a DISTINCT signal from `completed_with_help`
 * (the help signal stays intact for parent-map display).
 */
export function evidenceWeightFor(record) {
  return record?.completed_with_help === true || record?.participation === true
    ? 'participation'
    : 'strong';
}
