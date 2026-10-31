import {
  adventureLocalDateKey,
  loadAdventureEvidence,
  loadAdventureState,
} from './adventure-store';
import { adventureAge, loadAdventureQuestionnaire } from './adventure-parent';
import { journeyLessonsAllEvidenced } from './mission-unlock';
import { evidenceWeightFor } from './evidence-policy.js';
import { getAdventureSkillById, getLessonById, getLessons } from './pack-loader';
import { loadSkillEvidence } from './progress-store';
import { ADVENTURE_SKILL_TO_PATH, PACK_SKILL_TO_PATH, PATH_GRAPH, PATH_NODE_BY_ID } from './path-graph.js';
import { buildPathQueue } from './path-queue-engine.js';
import type { BandEvidence, BandSkillMeta } from './bands';
import type { PathQueueResult } from './path-queue-engine';

export interface PostAdventurePathSelection {
  active: boolean;
  queue: PathQueueResult | null;
  lessonId: string | null;
}

function buildSkillMeta(): Record<string, BandSkillMeta> {
  const meta: Record<string, BandSkillMeta> = {};
  for (const node of PATH_GRAPH) {
    meta[node.id] = {
      domain: node.domain,
      bandable: true,
      provisional: node.provisional,
    };
  }
  return meta;
}

function normalizeAdventureEvidence(): BandEvidence[] {
  const normalized: BandEvidence[] = [];
  for (const record of loadAdventureEvidence()) {
    const pathSkillId = ADVENTURE_SKILL_TO_PATH[record.skill_id];
    if (!pathSkillId) {
      continue;
    }
    const adventureSkill = getAdventureSkillById(record.skill_id);
    normalized.push({
      id: record.id,
      skill_id: pathSkillId,
      source: 'adventure',
      source_skill_id: record.skill_id,
      source_errand_id: record.errand_id,
      scaffold_level: record.scaffold_level,
      weight: record.weight,
      bandable: record.bandable && (adventureSkill?.bandable ?? true),
      date: record.date,
      session_id: `${adventureLocalDateKey(new Date(record.date))}:${record.stop_id}`,
      format_key: record.variant_id,
      variant_id: record.variant_id,
      domain: adventureSkill?.domain,
      provisional: adventureSkill?.provisional ?? false,
      observable_behaviour: record.observable_behaviour,
    });
  }
  return normalized;
}

function normalizeLessonEvidence(): BandEvidence[] {
  const normalized: BandEvidence[] = [];
  for (const record of loadSkillEvidence()) {
    const pathSkillId = PACK_SKILL_TO_PATH[record.skill_id] ?? record.skill_id;
    const node = PATH_NODE_BY_ID.get(pathSkillId);
    if (!node) {
      continue;
    }
    normalized.push({
      id: record.id,
      skill_id: pathSkillId,
      source: 'lesson',
      source_skill_id: record.skill_id,
      scaffold_level: record.scaffold_level_at_completion,
      weight: evidenceWeightFor(record),
      bandable: true,
      date: record.date,
      session_id: `lesson:${record.date}`,
      format_key: `lesson:${record.skill_id}`,
      domain: node.domain,
      provisional: node.provisional,
      observable_behaviour: null,
    });
  }
  return normalized;
}

export function loadPathEvidence(): BandEvidence[] {
  return [...normalizeAdventureEvidence(), ...normalizeLessonEvidence()];
}

export function loadPathQueue(): PathQueueResult {
  const questionnaire = loadAdventureQuestionnaire();
  const state = loadAdventureState();
  const evidence = loadPathEvidence();
  const totalSessions = new Set(
    evidence.map((entry) => entry.session_id ?? `${entry.source ?? 'evidence'}:${entry.date}`)
  ).size;
  const sparseLaunch = state.visit_days.length > 0 && state.visit_days.length <= 2;
  const lessons = getLessons().map((lesson) => ({
    id: lesson.id,
    primary_skill_id: lesson.primary_skill_id,
    age_band: lesson.age_band,
  }));
  return buildPathQueue({
    evidence,
    skillMetaById: buildSkillMeta(),
    age: adventureAge(questionnaire),
    lessons,
    totalSessions,
    todayKey: adventureLocalDateKey(new Date()),
    sparseLaunch,
  });
}

export function getPostAdventurePathSelection(): PostAdventurePathSelection {
  const state = loadAdventureState();
  if (!state.completed) {
    return { active: false, queue: null, lessonId: null };
  }
  const queue = loadPathQueue();
  if (journeyLessonsAllEvidenced()) {
    return { active: true, queue, lessonId: null };
  }
  const first = queue.session_options[0];
  return {
    active: true,
    queue,
    lessonId: first ? first.lesson_id : null,
  };
}

