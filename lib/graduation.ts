import { loadAdventureState } from './adventure-store';
import {
  ASSIGNMENT_TRIGGER_AUTOMATIC_FINISH,
  invalidatePackAssignmentCache,
  loadPackAssignment,
  savePackAssignment,
} from './pack-assignment';
import { getActivePack, getActivePackId, getRegisteredPacks } from './pack-loader';
import { evaluateGraduation, graduationEdgeFor } from './graduation-predicate.js';
import { loadSkillEvidence } from './progress-store';
import { DEFAULT_PROFILE_ID } from './path-state';

export interface GraduationProgress {
  finished: boolean;
  finishedCount: number;
  total: number;
}

function isRegisteredPackId(id: string): boolean {
  return getRegisteredPacks().some((pack) => pack.packId === id);
}

function evaluateCurrentPackFinish(profileId: string) {
  const pack = getActivePack(profileId);
  const evidence = loadSkillEvidence(profileId);
  const adventure = loadAdventureState();
  return evaluateGraduation({
    evidence,
    lessons: pack.lessons,
    skills: pack.skills,
    adventureCompleted: adventure.completed === true,
  });
}

/**
 * The single graduation check, called from the path-session completion and the
 * hub focus. Idempotent: an existing assignment short-circuits before any
 * evaluation, so a profile can graduate exactly once and a later band drop can
 * never un-graduate it. Fires only when the profile's CURRENT resolved pack is
 * an edge's from-pack. Returns whether graduation fired.
 */
export function maybeGraduate(profileId: string = DEFAULT_PROFILE_ID): boolean {
  if (loadPackAssignment(profileId)) {
    return false;
  }
  const currentPackId = getActivePackId(profileId);
  const edge = graduationEdgeFor(currentPackId);
  if (!edge) {
    return false;
  }
  if (!isRegisteredPackId(edge.to)) {
    return false;
  }
  const result = evaluateCurrentPackFinish(profileId);
  if (!result.finished) {
    return false;
  }
  const written = savePackAssignment({
    profile_id: profileId,
    assigned_pack_id: edge.to,
    graduated_from_pack_id: edge.from,
    graduated_at: new Date().toISOString(),
    trigger: ASSIGNMENT_TRIGGER_AUTOMATIC_FINISH,
  });
  if (!written) {
    return false;
  }
  invalidatePackAssignmentCache(profileId);
  return true;
}

/**
 * Progress toward the finish edge, computed by the SAME predicate the check
 * uses. Returns null when the profile's resolved pack has no defined edge
 * (so the parent dashboard shows the progress line only while on Pack 2).
 */
export function getGraduationProgress(
  profileId: string = DEFAULT_PROFILE_ID
): GraduationProgress | null {
  const currentPackId = getActivePackId(profileId);
  if (!graduationEdgeFor(currentPackId)) {
    return null;
  }
  const result = evaluateCurrentPackFinish(profileId);
  return { finished: result.finished, finishedCount: result.finishedCount, total: result.total };
}
