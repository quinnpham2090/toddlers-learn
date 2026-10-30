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
