/**
 * Pure lesson-selection logic — Node-safe, shared by the session screen and the
 * dev-harness drill. No framework, filesystem, or pack-loader imports here.
 *
 * Selection rule: launch the FIRST lesson in journey (hub stop) order whose
 * primary skill has no progress evidence yet. When every journey-stop lesson is
 * already evidenced, replay the first one. If no lesson maps to a journey stop
 * (e.g. a fallback-only pack), fall back to the pack's fallback-lesson chain.
 */

/**
 * @typedef {{ id: string, primary_skill_id: string, fallback_lesson_id: string }} LessonLike
 * @typedef {{ id: string }} SkillLike
 */

/**
 * @param {object} params
 * @param {LessonLike[]} params.lessons
 * @param {SkillLike[]} params.journeySkills - skills in hub stop order
 * @param {string[]} params.completedSkillIds - skill ids that already have evidence
 * @param {(id: string) => (LessonLike | undefined)} params.getLessonById
 * @returns {LessonLike | null}
 */
export function selectNextLesson({ lessons, journeySkills, completedSkillIds, getLessonById }) {
  const stopLessons = [];
  const seen = new Set();
  for (const skill of journeySkills) {
    const lesson = lessons.find((candidate) => candidate.primary_skill_id === skill.id);
    if (lesson && !seen.has(lesson.id)) {
      seen.add(lesson.id);
      stopLessons.push(lesson);
    }
  }

  if (stopLessons.length === 0) {
    const first = lessons[0];
    if (!first) {
      return null;
    }
    return getLessonById(first.fallback_lesson_id) || first;
  }

  for (const lesson of stopLessons) {
    if (!completedSkillIds.includes(lesson.primary_skill_id)) {
      return lesson;
    }
  }

  return stopLessons[0];
}
