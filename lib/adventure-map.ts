import {
  AdventureDomain,
  AdventureSkillRecord,
  getAdventure,
  getAdventureItemById,
  getString,
  getPictureSets,
} from './pack-loader';
import {
  AdventureEvidenceRecord,
  adventureLocalDateKey,
  loadAdventureEvidence,
} from './adventure-store';

export type AdventureBand = 'not-yet-explored' | 'exploring' | 'practising' | 'confident';

export const BAND_LABELS: Record<AdventureBand, string> = {
  'not-yet-explored': 'Not yet explored',
  exploring: 'Exploring',
  practising: 'Practising',
  confident: 'Confident',
};

export interface AdventureDomainMap {
  domain: AdventureDomain;
  domainLabel: string;
  band: AdventureBand;
  provisional: boolean;
  strength: string | null;
  workingOn: string | null;
  nextUp: string | null;
  behaviourNote: string | null;
}

const DOMAIN_LABELS: Partial<Record<AdventureDomain, string>> = {
  language: 'Language',
  maths: 'Maths',
  science: 'Science',
  music: 'Music',
  sel: 'Social and emotional',
  motor: 'Motor',
};

const DISPLAY_DOMAINS: AdventureDomain[] = ['language', 'maths', 'science', 'music'];

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

function variantTargetLabel(event: AdventureEvidenceRecord): string | null {
  const adventure = getAdventure();
  const errand = adventure.errands.find((candidate) => candidate.id === event.errand_id);
  const variant = errand ? errand.variants.find((candidate) => candidate.id === event.variant_id) : undefined;
  if (!variant) {
    return null;
  }
  return itemLabel(variant.target_item_id);
}

function uniqueDates(events: AdventureEvidenceRecord[]): string[] {
  const dates = new Set<string>();
  for (const event of events) {
    dates.add(adventureLocalDateKey(new Date(event.date)));
  }
  return Array.from(dates);
}

function computeBand(events: AdventureEvidenceRecord[]): AdventureBand {
  const bandable = events.filter((event) => event.bandable);
  if (bandable.length === 0) {
    return events.length === 0 ? 'not-yet-explored' : 'exploring';
  }
  const qualifying = bandable.filter(
    (event) => event.scaffold_level <= 1 && event.weight === 'strong'
  );
  const dates = uniqueDates(qualifying);
  const allQualifyingAtLowScaffold = bandable.every((event) => event.scaffold_level <= 1);
  const formats = new Set(qualifying.map((event) => event.variant_id));
  const ordered = [...bandable].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const lastTwo = ordered.slice(-2);
  const lastTwoQualifying = lastTwo.length >= 2 && lastTwo.every((event) => event.scaffold_level <= 1);

  if (qualifying.length === 0 || dates.length < 2) {
    return 'exploring';
  }
  if (
    qualifying.length >= 3 &&
    allQualifyingAtLowScaffold &&
    dates.length >= 2 &&
    formats.size >= 2 &&
    lastTwoQualifying
  ) {
    return 'confident';
  }
  return 'practising';
}

function strengthSentence(events: AdventureEvidenceRecord[]): string | null {
  const strong = events
    .filter((event) => event.bandable && event.scaffold_level <= 1)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const latest = strong[0];
  if (!latest) {
    return null;
  }
  const date = adventureLocalDateKey(new Date(latest.date));
  const target = variantTargetLabel(latest);
  const behaviour = latest.observable_behaviour;
  if (target) {
    return `On ${date} they ${behaviour} (${target}).`;
  }
  return `On ${date} they ${behaviour}.`;
}

function workingOnLine(domainSkills: AdventureSkillRecord[], events: AdventureEvidenceRecord[]): string | null {
  const bySkill = new Map<string, AdventureEvidenceRecord[]>();
  for (const event of events) {
    const list = bySkill.get(event.skill_id) ?? [];
    list.push(event);
    bySkill.set(event.skill_id, list);
  }
  let candidate: AdventureEvidenceRecord | undefined;
  let bestScore = Infinity;
  for (const skill of domainSkills) {
    const skillEvents = bySkill.get(skill.id) ?? [];
    const strongCount = skillEvents.filter((event) => event.scaffold_level <= 1).length;
    if (skillEvents.length > 0 && strongCount < bestScore) {
      bestScore = strongCount;
      candidate = [...skillEvents].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    }
  }
  if (!candidate) {
    return null;
  }
  return `Working on ${candidate.observable_behaviour}.`;
}

function nextUpLine(domainSkills: AdventureSkillRecord[], events: AdventureEvidenceRecord[]): string | null {
  const strongSkills = new Set(
    events.filter((event) => event.scaffold_level <= 1 && event.bandable).map((event) => event.skill_id)
  );
  const next = domainSkills.find((skill) => !strongSkills.has(skill.id));
  if (!next) {
    return domainSkills.length > 0 ? `Next up: more ${DOMAIN_LABELS[domainSkills[0].domain] ?? 'play'} places to come.` : null;
  }
  return `Next up: ${getString(next.title_ref)}.`;
}

function behaviourNote(events: AdventureEvidenceRecord[]): string | null {
  const notes = events
    .filter((event) => !event.bandable)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = notes[0];
  if (!latest) {
    return null;
  }
  return `Behaviour note: ${latest.observable_behaviour}.`;
}

export function buildAdventureMap(): AdventureDomainMap[] {
  const adventure = getAdventure();
  const evidence = loadAdventureEvidence();
  const skillById = new Map(adventure.skills.map((skill) => [skill.id, skill]));

  return DISPLAY_DOMAINS.map((domain) => {
    const domainSkills = adventure.skills.filter((skill) => skill.domain === domain);
    const domainEvents = evidence.filter((event) => {
      const skill = skillById.get(event.skill_id);
      return skill !== undefined && skill.domain === domain;
    });
    const provisional = domainSkills.some((skill) => skill.provisional);
    return {
      domain,
      domainLabel: DOMAIN_LABELS[domain] ?? domain,
      band: computeBand(domainEvents),
      provisional,
      strength: strengthSentence(domainEvents),
      workingOn: workingOnLine(domainSkills, domainEvents),
      nextUp: nextUpLine(domainSkills, domainEvents),
      behaviourNote: behaviourNote(domainEvents),
    };
  });
}
