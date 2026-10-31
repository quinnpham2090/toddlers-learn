/**
 * In-memory signal that a POST-ADVENTURE PATH lesson just completed.
 *
 * Deliberately NOT persisted: the mission offer card may only appear as a
 * post-lesson offer on the hub the child lands on, never on cold start.
 * Cleared on consume and lost when the app process ends.
 */
let pendingCompletion: { skillIds: string[] } | null = null;

export function markPathLessonCompleted(skillIds: string[]): void {
  pendingCompletion = {
    skillIds: Array.isArray(skillIds)
      ? skillIds.filter((skillId) => typeof skillId === 'string' && skillId.length > 0)
      : [],
  };
}

export function consumePathLessonCompletion(): { skillIds: string[] } | null {
  const pending = pendingCompletion;
  pendingCompletion = null;
  return pending;
}
