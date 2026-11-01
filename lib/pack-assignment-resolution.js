/**
 * Per-profile pack-assignment resolution (pure, Node-safe).
 *
 * Mirrors lib/pack-activation-resolution.js: the storage layer
 * (lib/pack-assignment.ts) and the Node drill both import these shared
 * primitives, so the type guard and the resolution order have exactly one
 * definition.
 */

export const ASSIGNMENT_FILE_PREFIX = 'pack-assignment-';
export const ASSIGNMENT_TRIGGER_AUTOMATIC_FINISH = 'automatic-finish';

/**
 * @typedef {object} PackAssignmentRecord
 * @property {string} profile_id
 * @property {string} assigned_pack_id
 * @property {string} graduated_from_pack_id
 * @property {string} graduated_at
 * @property {string} trigger
 */

/**
 * A missing file means "not graduated" (not an error). A corrupt or mistyped
 * record reads as null, so it can never crash the app or block graduation.
 *
 * @param {unknown} value
 * @returns {value is PackAssignmentRecord}
 */
export function isPackAssignmentRecord(value) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof record.profile_id === 'string' &&
    record.profile_id.length > 0 &&
    typeof record.assigned_pack_id === 'string' &&
    record.assigned_pack_id.length > 0 &&
    typeof record.graduated_from_pack_id === 'string' &&
    record.graduated_from_pack_id.length > 0 &&
    typeof record.graduated_at === 'string' &&
    record.graduated_at.length > 0 &&
    typeof record.trigger === 'string' &&
    record.trigger.length > 0
  );
}

/**
 * Per-profile resolution order: device override (test-switch / manual) ->
 * per-profile assignment (graduation) -> bundle pointer -> first known pack.
 * A bad or unknown value always falls through to the next level.
 *
 * @param {string | null} overrideId
 * @param {string | null} assignmentId
 * @param {string | null} pointerId
 * @param {string[]} knownPackIds
 * @returns {string | null}
 */
export function resolveActivePackIdWithAssignment(overrideId, assignmentId, pointerId, knownPackIds) {
  if (typeof overrideId === 'string' && knownPackIds.includes(overrideId)) {
    return overrideId;
  }
  if (typeof assignmentId === 'string' && knownPackIds.includes(assignmentId)) {
    return assignmentId;
  }
  if (typeof pointerId === 'string' && knownPackIds.includes(pointerId)) {
    return pointerId;
  }
  return knownPackIds.length > 0 ? knownPackIds[0] : null;
}
