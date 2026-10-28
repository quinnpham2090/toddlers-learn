export type PathDomain = 'language' | 'maths' | 'music' | 'science';

export interface PathNode {
  id: string;
  domain: PathDomain;
  min_age: number;
  entry: boolean;
  provisional: boolean;
  title_ref: string | null;
  next: string[];
  catch_up: string | null;
  consolidation_contexts: string[];
  adventure_skill_ids: string[];
  lesson_skill_ids: string[];
  playable_lesson_skill_id: string | null;
}

export const PATH_GRAPH: readonly PathNode[];
export const PATH_NODE_BY_ID: Map<string, PathNode>;
export const PATH_ENTRY_SKILL_IDS: readonly string[];
export const ADVENTURE_SKILL_TO_PATH: Readonly<Record<string, string>>;
export const PACK_SKILL_TO_PATH: Readonly<Record<string, string>>;
export function pathNodeForSkill(skillId: string): PathNode | null;
export function isAgeEligible(node: PathNode | null | undefined, age: number): boolean;
export function isPathSkillId(skillId: string): boolean;
