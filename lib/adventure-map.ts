import {
  getAdventure,
  getAdventureItemById,
  getAdventureSkillById,
  getLessons,
  getPictureSets,
  getString,
} from './pack-loader';
import { adventureLocalDateKey, loadAdventureEvidence } from './adventure-store';
import { adventureAge, loadAdventureQuestionnaire } from './adventure-parent';
import { loadPathEvidence, loadPathQueue } from './path-queue';
import { PATH_GRAPH, PATH_NODE_BY_ID, isAgeEligible } from './path-graph.js';
import type { BandSkillResult } from './bands';
import type { PathQueueItem } from './path-queue-engine';

export type AdventureBand = 'not-yet-explored' | 'exploring' | 'practising' | 'confident';
export type PlacementDomain = 'language' | 'maths' | 'science';

export const BAND_LABELS: Record<AdventureBand, string> = {
  'not-yet-explored': 'Not yet explored',
  exploring: 'Exploring',
  practising: 'Practising',
  confident: 'Confident',
};

const BAND_RANK: Record<AdventureBand, number> = {
  'not-yet-explored': 0,
  exploring: 1,
  practising: 2,
  confident: 3,
};

const DISPLAY_DOMAINS: PlacementDomain[] = ['language', 'maths', 'science'];

const DOMAIN_LABELS: Record<PlacementDomain, string> = {
  language: 'Language',
  maths: 'Maths',
  science: 'Science',
};

const PARENT_SKILL_LABELS: Record<string, string> = {
  'point-to-choice': 'Pointing with choices',
  'name-with-grown-up-choice': 'Naming with choices',
  'rhyme-listening': 'Rhyme listening',
  'rhyme-production': 'Making rhymes',
  'onset-rime-prep': 'First-sound preparation',
  'initial-sound-matching': 'First-sound matching',
  'sort-by-colour': 'Sorting by colour',
  'give-1': 'Give one',
  'give-2': 'Give two',
  'give-3': 'Give three',
  'number-symbols': 'Number symbols',
  'pattern-copy': 'Copying a pattern',
  'pattern-extension': 'Extending a pattern',
  'syllable-clapping': 'Clapping syllables',
  'beat-patterns': 'Beat patterns',
  'notice-with-choices': 'Noticing with choices',
};

const PAST_VERBS: Record<string, string> = {
  points: 'pointed',
  names: 'named',
  matches: 'matched',
  claps: 'clapped',
  taps: 'tapped',
  gives: 'gave',
  answers: 'answered',
  places: 'placed',
  're-sorts': 're-sorted',
  notices: 'noticed',
  describes: 'described',
  continues: 'continued',
  predicts: 'predicted',
  checks: 'checked',
};

const DISCLAIMER =
  'This is play, not a test. It is not a diagnosis, a verdict, or a comparison. It keeps changing.';

const GROWING_NOTES_LABEL = 'Growing notes';
const STILL_GETTING_TO_KNOW_LABEL = 'Still getting to know';
const SCIENCE_PROVISIONAL_NOTE =
  'Early signal — softer confidence while the science research pass is still coming.';

interface DisplayEvent {
  pathSkillId: string;
  source: 'adventure' | 'lesson';
  date: string;
  scaffold: number;
  weight: 'strong' | 'participation';
  bandable: boolean;
  observable: string | null;
  variantId: string | null;
  errandId: string | null;
  packSkillId: string | null;
}

export interface PlacementDomainRow {
  domain: PlacementDomain;
  domainLabel: string;
  band: AdventureBand;
  provisional: boolean;
  strength: string | null;
  workingOn: string | null;
  nextUp: string;
}

export interface StillGettingToKnowItem {
  skillId: string;
  title: string;
  domain: PlacementDomain;
  domainLabel: string;
}

export interface GrowingNote {
  skillId: string;
  title: string;
  note: string;
  date: string;
}

export interface PlacementMap {
  rows: PlacementDomainRow[];
  stillGettingToKnow: StillGettingToKnowItem[];
  growingNotes: GrowingNote[];
  disclaimer: string;
  growingNotesLabel: string;
  stillGettingToKnowLabel: string;
  scienceProvisionalNote: string;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function toPast(observable: string | null): string | null {
  if (!observable) {
    return null;
  }
  const words = observable.split(' ');
  return words
    .map((word, index) => {
      const previous = index > 0 ? words[index - 1] : '';
      if (index === 0 || previous === 'or' || previous === 'and') {
        return PAST_VERBS[word] ?? word;
      }
      return word;
    })
    .join(' ');
}

function itemLabel(itemId: string): string | null {
  const adventureItem = getAdventureItemById(itemId);
  if (adventureItem) {
    return getString(adventureItem.label_ref);
  }
  for (const set of getPictureSets()) {
    const item = set.items.find((candidate) => candidate.item_id === itemId);
    if (item) {
      return getString(item.label_ref);
    }
  }
  return null;
}

function variantTargetLabel(event: DisplayEvent): string | null {
  if (event.source !== 'adventure' || !event.errandId || !event.variantId) {
    return null;
  }
  const adventure = getAdventure();
  const errand = adventure.errands.find((candidate) => candidate.id === event.errandId);
  const variant = errand
    ? errand.variants.find((candidate) => candidate.id === event.variantId)
    : undefined;
  if (!variant) {
    return null;
  }
  return itemLabel(variant.target_item_id);
}

function lessonTitleFor(packSkillId: string | null): string | null {
  if (!packSkillId) {
    return null;
  }
  const lesson = getLessons().find((candidate) => candidate.primary_skill_id === packSkillId);
  return lesson ? getString(lesson.title_ref) : null;
}

function behaviourText(event: DisplayEvent): string {
  if (event.source === 'lesson') {
    const title = lessonTitleFor(event.packSkillId);
    return title ? `completed “${title}”` : 'completed a lesson';
  }
  const behaviour = toPast(event.observable) ?? 'played';
  const target = variantTargetLabel(event);
  return target ? `${behaviour} (${target})` : behaviour;
}

function eventSentence(event: DisplayEvent, supported = false): string {
  if (supported && event.source === 'lesson') {
    const title = lessonTitleFor(event.packSkillId);
    return `On ${formatDate(event.date)}, with a model, they completed ${title ? `“${title}”` : 'a lesson'}.`;
  }
  if (supported) {
    return `On ${formatDate(event.date)}, with support, they ${behaviourText(event)}.`;
  }
  return `On ${formatDate(event.date)}, they ${behaviourText(event)}.`;
}

function causeSentence(
  event: DisplayEvent | undefined,
  fallback: string,
  supported = false
): string {
  if (!event) {
    return fallback;
  }
  if (supported && event.source === 'lesson') {
    const title = lessonTitleFor(event.packSkillId);
    return `because on ${formatDate(event.date)}, with a model, they completed ${title ? `“${title}”` : 'a lesson'}.`;
  }
  if (supported) {
    return `because on ${formatDate(event.date)}, with support, they ${behaviourText(event)}.`;
  }
  return `because on ${formatDate(event.date)} they ${behaviourText(event)}.`;
}

function buildEvents(): Map<string, DisplayEvent[]> {
  const grouped = new Map<string, DisplayEvent[]>();
  for (const evidence of loadPathEvidence()) {
    const event: DisplayEvent = {
      pathSkillId: evidence.skill_id,
      source: evidence.source === 'lesson' ? 'lesson' : 'adventure',
      date: evidence.date,
      scaffold: evidence.scaffold_level,
      weight: evidence.weight === 'participation' ? 'participation' : 'strong',
      bandable: evidence.bandable !== false,
      observable: evidence.observable_behaviour ?? null,
      variantId: evidence.variant_id ?? null,
      errandId: evidence.source_errand_id ?? null,
      packSkillId: evidence.source_skill_id ?? null,
    };
    const current = grouped.get(event.pathSkillId) ?? [];
    current.push(event);
    grouped.set(event.pathSkillId, current);
  }
  for (const events of grouped.values()) {
    events.sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0));
  }
  return grouped;
}

function latestStrong(events: DisplayEvent[] | undefined): DisplayEvent | undefined {
  return events
    ?.filter((event) => event.bandable && event.scaffold <= 1 && event.weight !== 'participation')
    .slice(-1)[0];
}

function latestHigh(events: DisplayEvent[] | undefined): DisplayEvent | undefined {
  return events
    ?.filter(
      (event) => !event.bandable || event.scaffold >= 2 || event.weight === 'participation'
    )
    .slice(-1)[0];
}

function strengthSentence(skillId: string, eventsBySkill: Map<string, DisplayEvent[]>): string | null {
  const events = eventsBySkill.get(skillId);
  const strong = latestStrong(events);
  if (strong) {
    return eventSentence(strong);
  }
  const high = latestHigh(events);
  return high ? eventSentence(high, true) : null;
}

function workingOnSentence(
  result: BandSkillResult,
  eventsBySkill: Map<string, DisplayEvent[]>
): string {
  const high = latestHigh(eventsBySkill.get(result.skill_id));
  if (high) {
    if (high.source === 'lesson') {
      const title = lessonTitleFor(high.packSkillId);
      return `Working on ${title ? `“${title}”` : 'a lesson'} with a model.`;
    }
    const target = variantTargetLabel(high);
    return `Working on: ${high.observable ?? 'the next step'}${target ? ` (${target})` : ''} with a model.`;
  }
  return `Working on ${skillTitle(result.skill_id)} in new places.`;
}

function skillTitle(skillId: string): string {
  const node = PATH_NODE_BY_ID.get(skillId);
  if (node?.title_ref) {
    return getString(node.title_ref);
  }
  return PARENT_SKILL_LABELS[skillId] ?? node?.id ?? skillId;
}

function targetTitle(item: PathQueueItem): string {
  if (!item.skill_id) {
    return 'a first place';
  }
  const node = PATH_NODE_BY_ID.get(item.skill_id);
  if (node?.title_ref) {
    return getString(node.title_ref);
  }
  const label = PARENT_SKILL_LABELS[item.skill_id];
  if (label) {
    return label;
  }
  const source = item.source_skill_id ?? item.skill_id;
  const sourceTitle = skillTitle(source);
  if (item.branch === 'catch-up') {
    return `${sourceTitle} with a model`;
  }
  if (item.branch === 'consolidation') {
    return `${sourceTitle} in a new place`;
  }
  if (item.branch === 'bridge') {
    return `${sourceTitle} in a noticing game`;
  }
  return sourceTitle;
}

function nextUpCause(
  item: PathQueueItem | undefined,
  result: BandSkillResult | undefined,
  eventsBySkill: Map<string, DisplayEvent[]>,
  fallback: string
): string {
  if (!item) {
    return fallback;
  }
  if (item.reason === 'recheck') {
    if (result?.recheck_reason === 'days') {
      return `because it has been ${result.recheck_days_since} days since they last played it.`;
    }
    return 'because 8 sessions have passed since they last played it.';
  }
  if (!item.source_skill_id) {
    return 'because there is no evidence yet — a first place to wander in.';
  }
  const sourceEvents = eventsBySkill.get(item.source_skill_id);
  if (item.branch === 'advancement') {
    const strong = latestStrong(sourceEvents);
    if (strong) {
      return causeSentence(strong, fallback);
    }
    if (result) {
      return `because they have ${result.qualifying_count} strong moments across ${result.day_count} day${result.day_count === 1 ? '' : 's'}.`;
    }
    return `because ${skillTitle(item.source_skill_id)} is already confident.`;
  }
  if (item.branch === 'catch-up') {
    const high = latestHigh(sourceEvents);
    if (high) {
      return causeSentence(high, 'because they needed a smaller step.', true);
    }
    if (result) {
      return `because they have ${result.qualifying_count} strong moment${result.qualifying_count === 1 ? '' : 's'} across ${result.session_count} session${result.session_count === 1 ? '' : 's'}.`;
    }
    return `because there is no evidence yet for ${skillTitle(item.source_skill_id)}.`;
  }
  if (item.branch === 'consolidation') {
    if (result) {
      return `because they have practised ${skillTitle(item.source_skill_id)} on ${result.day_count} day${result.day_count === 1 ? '' : 's'}.`;
    }
    return 'because there is no evidence yet — a first place to wander in.';
  }
  if (item.branch === 'bridge') {
    const sortEvent = latestStrong(eventsBySkill.get('sort-by-one-rule'));
    const scienceEvent = [...eventsBySkill.entries()]
      .filter(([skillId]) => PATH_NODE_BY_ID.get(skillId)?.domain === 'science')
      .map(([, events]) => events[events.length - 1])
      .filter((event): event is DisplayEvent => event !== undefined)
      .sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0))
      .slice(-1)[0];
    if (sortEvent && scienceEvent) {
      return `because on ${formatDate(sortEvent.date)} they ${behaviourText(sortEvent)} and on ${formatDate(scienceEvent.date)} they ${behaviourText(scienceEvent)}.`;
    }
    return 'because they sorted by one rule and noticed things in the garden.';
  }
  return fallback;
}

function compareBandStrength(left: BandSkillResult, right: BandSkillResult): number {
  const rank = BAND_RANK[right.display_band] - BAND_RANK[left.display_band];
  if (rank !== 0) {
    return rank;
  }
  if (left.evidence_count !== right.evidence_count) {
    return right.evidence_count - left.evidence_count;
  }
  return right.skill_id.localeCompare(left.skill_id);
}

function compareBandGrowth(left: BandSkillResult, right: BandSkillResult): number {
  const rank = BAND_RANK[left.display_band] - BAND_RANK[right.display_band];
  if (rank !== 0) {
    return rank;
  }
  return left.evidence_count - right.evidence_count;
}

function buildStillGettingToKnow(
  knownSkillIds: Set<string>,
  age: number
): StillGettingToKnowItem[] {
  return PATH_GRAPH.filter(
    (node) =>
      DISPLAY_DOMAINS.includes(node.domain as PlacementDomain) &&
      isAgeEligible(node, age) &&
      !knownSkillIds.has(node.id) &&
      (node.adventure_skill_ids.length > 0 || node.lesson_skill_ids.length > 0 || node.entry)
  ).map((node) => ({
    skillId: node.id,
    title: skillTitle(node.id),
    domain: node.domain as PlacementDomain,
    domainLabel: DOMAIN_LABELS[node.domain as PlacementDomain],
  }));
}

function buildGrowingNotes(): GrowingNote[] {
  const latestBySkill = new Map<string, GrowingNote>();
  for (const record of loadAdventureEvidence()) {
    if (record.bandable) {
      continue;
    }
    const skill = getAdventureSkillById(record.skill_id);
    const title = skill ? getString(skill.title_ref) : record.skill_id;
    const behaviour = toPast(record.observable_behaviour);
    if (!behaviour) {
      continue;
    }
    const note = `On ${formatDate(record.date)}, they ${behaviour}.`;
    const existing = latestBySkill.get(record.skill_id);
    if (!existing || existing.date < record.date) {
      latestBySkill.set(record.skill_id, {
        skillId: record.skill_id,
        title,
        note,
        date: record.date,
      });
    }
  }
  return [...latestBySkill.values()].sort((left, right) =>
    left.date < right.date ? 1 : left.date > right.date ? -1 : 0
  );
}

export function buildPlacementMap(): PlacementMap {
  const queue = loadPathQueue();
  const eventsBySkill = buildEvents();
  const age = adventureAge(loadAdventureQuestionnaire());
  const resultsByDomain = new Map<PlacementDomain, BandSkillResult[]>();
  for (const domain of DISPLAY_DOMAINS) {
    resultsByDomain.set(domain, []);
  }
  for (const result of queue.band_results) {
    const node = PATH_NODE_BY_ID.get(result.skill_id);
    if (!node || !DISPLAY_DOMAINS.includes(node.domain as PlacementDomain)) {
      continue;
    }
    resultsByDomain.get(node.domain as PlacementDomain)?.push(result);
  }

  const stillGettingToKnow = buildStillGettingToKnow(
    new Set([
      ...queue.band_results.map((result) => result.skill_id),
      ...queue.behaviour_notes.map((note) => note.skill_id),
    ]),
    age
  );

  const rows: PlacementDomainRow[] = DISPLAY_DOMAINS.map((domain) => {
    const results = resultsByDomain.get(domain) ?? [];
    const representative = [...results].sort(compareBandStrength)[0];
    const growth = [...results].sort(compareBandGrowth)[0];
    const item = queue.items.find(
      (candidate) => candidate.kind === 'path' && candidate.domain === domain
    );
    const result = item?.source_skill_id
      ? queue.band_results.find((candidate) => candidate.skill_id === item.source_skill_id)
      : undefined;
    const firstUnknown = stillGettingToKnow.find((entry) => entry.domain === domain);
    return {
      domain,
      domainLabel: DOMAIN_LABELS[domain],
      band: representative?.display_band ?? 'not-yet-explored',
      provisional: domain === 'science',
      strength: representative ? strengthSentence(representative.skill_id, eventsBySkill) : null,
      workingOn: growth ? workingOnSentence(growth, eventsBySkill) : null,
      nextUp: item
        ? `Next up: ${targetTitle(item)} — ${nextUpCause(item, result, eventsBySkill, 'because there is no evidence yet.')}`
        : firstUnknown
          ? `Next up: ${firstUnknown.title} — because there is no evidence yet.`
          : results.length > 0
            ? `Next up: more ${DOMAIN_LABELS[domain]} play — because every skill here has some evidence already.`
            : `Next up: more ${DOMAIN_LABELS[domain]} play — because there is no evidence here yet.`,
    };
  });

  return {
    rows,
    stillGettingToKnow,
    growingNotes: buildGrowingNotes(),
    disclaimer: DISCLAIMER,
    growingNotesLabel: GROWING_NOTES_LABEL,
    stillGettingToKnowLabel: STILL_GETTING_TO_KNOW_LABEL,
    scienceProvisionalNote: SCIENCE_PROVISIONAL_NOTE,
  };
}
