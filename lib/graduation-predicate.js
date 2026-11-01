/**
 * Per-profile automatic graduation — pure predicate (Node-safe).
 *
 * The device entry point (lib/graduation.ts) and the Node drill both import
 * these functions, so the finish definition has exactly one implementation.
 * It evaluates the REAL band engine (lib/bands.js) over the profile's OWN
 * lesson evidence, normalised the way lib/path-queue.ts normalizeLessonEvidence
 * does, and derives the finish set from the FROM pack's files at runtime (never
 * hardcoded). It deliberately does NOT use the path-graph nodes: the node graph
 * has drifted from skills.json and nine Pack 2 lesson skills have no node at all.
 */

import { evaluateBands } from './bands.js';
import { evidenceWeightFor } from './evidence-policy.js';
import { PATH_NODE_BY_ID } from './path-graph.js';

export const GRADUATION_EDGES = Object.freeze([
  Object.freeze({ from: 'sunny-home-garden-2', to: 'sunny-home-garden-3' }),
]);

/** The only help-only lesson skill in Pack 2 (Wave 2 L6, the do-together lesson). */
export const HELP_ONLY_SKILL_IDS = Object.freeze(['name-with-grown-up']);

const PRACTISING_OR_ABOVE = Object.freeze(['practising', 'confident']);

export function graduationEdgeFor(packId) {
  return GRADUATION_EDGES.find((edge) => edge.from === packId) ?? null;
}

/**
 * Every skill in the pack that has a lesson evidence path: it is the primary
 * skill of at least one lesson, OR it appears in at least one lesson step's
 * evidence_skill_ids. Filtered to skills that exist in skills.json.
 */
export function deriveFinishSkillIds(lessons, skills) {
  const referenced = new Set();
  for (const lesson of lessons ?? []) {
    if (typeof lesson.primary_skill_id === 'string' && lesson.primary_skill_id.length > 0) {
      referenced.add(lesson.primary_skill_id);
    }
    for (const step of lesson.steps ?? []) {
      for (const skillId of step.evidence_skill_ids ?? []) {
        if (typeof skillId === 'string' && skillId.length > 0) {
          referenced.add(skillId);
        }
      }
    }
  }
  const known = new Set((skills ?? []).map((skill) => skill.id));
  return [...referenced].filter((id) => known.has(id)).sort();
}

/**
 * Skill meta for the bands engine, built from the pack's skills.json:
 * domain from the record, bandable true, provisional from the path node where
 * one exists, else false.
 */
export function buildFinishSkillMeta(skills) {
  const meta = {};
  for (const skill of skills ?? []) {
    const node = PATH_NODE_BY_ID.get(skill.id);
    meta[skill.id] = {
      domain: skill.domain,
      bandable: true,
      provisional: node ? node.provisional === true : false,
    };
  }
  return meta;
}

/**
 * Lesson evidence normalised for the bands engine exactly as
 * normalizeLessonEvidence does (session_id = `lesson:<timestamp>`,
 * format_key = `lesson:<skill_id>`, weight via evidenceWeightFor, bandable true,
 * scaffold_level from the record). No node filter and no path mapping: the
 * finish set is defined over the pack's own skill ids.
 */
export function normalizeGraduationEvidence(evidence) {
  return (evidence ?? [])
    .filter((record) => record && typeof record.skill_id === 'string' && record.skill_id.length > 0)
    .map((record) => ({
      id: record.id,
      skill_id: record.skill_id,
      source: 'lesson',
      source_skill_id: record.skill_id,
      scaffold_level: record.scaffold_level_at_completion,
      weight: evidenceWeightFor(record),
      bandable: true,
      date: record.date,
      session_id: `lesson:${record.date}`,
      format_key: `lesson:${record.skill_id}`,
      provisional: false,
      observable_behaviour: null,
    }));
}

/**
 * The finish predicate: adventure complete AND every finish-set skill at its bar.
 * Standard skills need display_band >= Practising; the help-only skill needs
 * presence (at least one evidence record of any kind).
 */
export function evaluateGraduation({ evidence, lessons, skills, adventureCompleted }) {
  const finishSkillIds = deriveFinishSkillIds(lessons, skills);
  const meta = buildFinishSkillMeta(skills);
  const normalized = normalizeGraduationEvidence(evidence);
  const bands = evaluateBands(normalized, meta);
  const bandById = new Map(bands.skills.map((band) => [band.skill_id, band]));
  const presentSkillIds = new Set(normalized.map((record) => record.skill_id));
  const helpOnly = new Set(HELP_ONLY_SKILL_IDS);

  const perSkill = finishSkillIds.map((skillId) => {
    const displayBand = bandById.get(skillId)?.display_band ?? 'not-yet-explored';
    if (helpOnly.has(skillId)) {
      return {
        skill_id: skillId,
        help_only: true,
        display_band: displayBand,
        met: presentSkillIds.has(skillId),
      };
    }
    return {
      skill_id: skillId,
      help_only: false,
      display_band: displayBand,
      met: PRACTISING_OR_ABOVE.includes(displayBand),
    };
  });

  const finishedCount = perSkill.filter((entry) => entry.met).length;
  const allSkillsMet = finishSkillIds.length > 0 && finishedCount === finishSkillIds.length;
  return {
    finished: adventureCompleted === true && allSkillsMet,
    finishedCount,
    total: finishSkillIds.length,
    perSkill,
  };
}
