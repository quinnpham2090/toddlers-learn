export const OVERRIDE_FILE_NAME = 'active-pack.json';

/**
 * @typedef {object} ActivePackOverrideRecord
 * @property {string} active_pack_id
 * @property {string | null} previous_pack_id
 * @property {string} updated_at
 */

/**
 * @param {unknown} value
 * @returns {value is ActivePackOverrideRecord}
 */
export function isActivePackOverrideRecord(value) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof record.active_pack_id === 'string' &&
    record.active_pack_id.length > 0 &&
    (record.previous_pack_id === null || typeof record.previous_pack_id === 'string') &&
    typeof record.updated_at === 'string'
  );
}

/**
 * Resolution order: on-device override (if it names a known pack) ->
 * bundle pointer (if it names a known pack) -> first known pack.
 * A bad value always falls through to the next level.
 *
 * @param {string | null} overrideId
 * @param {string | null} pointerId
 * @param {string[]} knownPackIds
 * @returns {string | null}
 */
export function resolveActivePackId(overrideId, pointerId, knownPackIds) {
  if (typeof overrideId === 'string' && knownPackIds.includes(overrideId)) {
    return overrideId;
  }
  if (typeof pointerId === 'string' && knownPackIds.includes(pointerId)) {
    return pointerId;
  }
  return knownPackIds.length > 0 ? knownPackIds[0] : null;
}
