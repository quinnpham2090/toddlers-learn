import {
  ActivePackOverride,
  clearActivePackOverride,
  loadActivePackOverride,
  saveActivePackOverride,
} from './active-pack-store';
import { PackFiles, getActivePackId, getRegisteredPacks, invalidateActivePackOverrideCache } from './pack-loader';

export interface AvailablePack {
  id: string;
  title: string;
}

export interface ActivationResult {
  ok: boolean;
  activePackId: string;
}

function packTitle(pack: PackFiles): string {
  const table = pack.strings.locales[pack.manifest.default_locale];
  const title = table ? table[pack.manifest.title_ref] : undefined;
  return typeof title === 'string' && title.length > 0 ? title : pack.manifest.title_ref;
}

export function listAvailablePacks(): AvailablePack[] {
  return getRegisteredPacks().map((pack) => ({ id: pack.packId, title: packTitle(pack) }));
}

function isActivatablePackId(id: string): boolean {
  const pack = getRegisteredPacks().find((candidate) => candidate.packId === id);
  return pack !== undefined && pack.manifest.id === id;
}

export function activatePack(id: string): ActivationResult {
  if (!isActivatablePackId(id)) {
    return { ok: false, activePackId: getActivePackId() };
  }
  const current = getActivePackId();
  if (current === id) {
    return { ok: true, activePackId: id };
  }
  const written = saveActivePackOverride({
    active_pack_id: id,
    previous_pack_id: current,
    updated_at: new Date().toISOString(),
  });
  if (!written) {
    return { ok: false, activePackId: getActivePackId() };
  }
  invalidateActivePackOverrideCache();
  return { ok: true, activePackId: getActivePackId() };
}

export function rollbackPack(): ActivationResult {
  const override: ActivePackOverride | null = loadActivePackOverride();
  const previous = override ? override.previous_pack_id : null;
  if (previous === null || !isActivatablePackId(previous)) {
    clearActivePackOverride();
    invalidateActivePackOverrideCache();
    return { ok: true, activePackId: getActivePackId() };
  }
  const written = saveActivePackOverride({
    active_pack_id: previous,
    previous_pack_id: null,
    updated_at: new Date().toISOString(),
  });
  if (!written) {
    return { ok: false, activePackId: getActivePackId() };
  }
  invalidateActivePackOverrideCache();
  return { ok: true, activePackId: getActivePackId() };
}
