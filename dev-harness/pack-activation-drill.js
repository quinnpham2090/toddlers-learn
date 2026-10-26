/**
 * Pack Activation Drill (DEV ONLY — runs in Node, never in the app).
 *
 * Proves the pack-activation mechanism end to end without a server or the app:
 *   1. Dev-time gate: validates the core and test-switch packs with the existing
 *      Phase 0 validator (tools/validator.js). The validator has no CLI for
 *      arbitrary pack dirs, so this drill loads the pack files exactly the way
 *      tools/verify.js loads /packs/core and calls validate() directly.
 *   2. Writes an on-device-style override (sandboxed document directory) pointing
 *      at the fixture pack, atomically (temp file then rename).
 *   3. Verifies the stored override resolves to the fixture (read-back check)
 *      using the REAL shared resolution function (lib/pack-activation-resolution.js).
 *   4. Rolls back in one write and verifies resolution returns to the previous pack.
 *   5. Writes a corrupt override and verifies resolution falls through safely
 *      (never crashes, never blank — falls back to the bundle pointer).
 *
 * Honest limits: this drill proves the pointer / validation / rollback mechanics
 * with the real shared resolution code and a Node mirror of the override storage
 * (the app's expo-file-system store cannot execute in Node). It does NOT execute
 * the React Native pack loader; that is covered by tsc and the phone check.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validate } from '../tools/validator.js';
import {
  OVERRIDE_FILE_NAME,
  isActivePackOverrideRecord,
  resolveActivePackId,
} from '../lib/pack-activation-resolution.js';

const rootDir = process.cwd();
const packsDir = path.join(rootDir, 'packs');
let failures = 0;

function report(title, passed, detail = '') {
  const badge = passed ? 'PASS' : 'FAIL';
  console.log(`[${badge}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) {
    failures += 1;
  }
}

function loadPackDir(dir) {
  const readJson = (file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const manifest = readJson('manifest.json');
  const assets = {};
  for (const relPath of Object.keys(manifest.file_hashes)) {
    if (relPath.startsWith('assets/')) {
      assets[relPath] = fs.readFileSync(path.join(dir, relPath), 'utf8');
    }
  }
  return {
    manifest,
    strings: readJson('strings.json'),
    skills: readJson('skills.json'),
    lessons: readJson('lessons.json'),
    song_templates: readJson('song_templates.json'),
    saved_songs: readJson('saved_songs.json'),
    characters: readJson('characters.json'),
    picture_sets: readJson('picture_sets.json'),
    missions: readJson('missions.json'),
    routines: readJson('routines.json'),
    time_concepts: readJson('time_concepts.json'),
    assets,
  };
}

function writeOverrideAtomically(docDir, override) {
  const target = path.join(docDir, OVERRIDE_FILE_NAME);
  const temp = path.join(docDir, `${OVERRIDE_FILE_NAME}.tmp`);
  fs.writeFileSync(temp, JSON.stringify(override));
  fs.renameSync(temp, target);
}

function loadOverride(docDir) {
  try {
    const target = path.join(docDir, OVERRIDE_FILE_NAME);
    if (!fs.existsSync(target)) {
      return null;
    }
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    return isActivePackOverrideRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function resolveInDocDir(docDir, pointerId, knownPackIds) {
  const override = loadOverride(docDir);
  return resolveActivePackId(
    override ? override.active_pack_id : null,
    pointerId,
    knownPackIds
  );
}

console.log('=== PACK ACTIVATION DRILL ===\n');

// --- 1. Dev-time gate: validate every pack under /packs with the existing validator ---
const packDirs = fs
  .readdirSync(packsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'schema')
  .map((entry) => entry.name);

const knownPackIds = [];
for (const dirName of packDirs) {
  const pack = loadPackDir(path.join(packsDir, dirName));
  const result = validate(pack);
  report(
    `Dev-time validation: /packs/${dirName}`,
    result.valid,
    result.valid ? `${result.status} (${result.error_count} errors)` : 'validator rejected the pack'
  );
  if (!result.valid) {
    for (const error of result.errors) {
      console.log(`       -> ${error.rule} (${error.family}) | ${error.record_id}: ${error.message}`);
    }
  } else {
    knownPackIds.push(pack.manifest.id);
  }
}

report(
  'Fixture pack is an activation target',
  knownPackIds.includes('test-switch') && knownPackIds.includes('core'),
  `known pack ids: ${knownPackIds.join(', ')}`
);

// --- 2. Sandbox document directory + bundle pointer ---
const docDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toddlers-learn-activation-'));
const pointer = JSON.parse(fs.readFileSync(path.join(packsDir, 'active.json'), 'utf8'));
const pointerId = typeof pointer.active_pack_id === 'string' ? pointer.active_pack_id : null;
report('Bundle pointer loaded from /packs/active.json', pointerId !== null, `active_pack_id: ${pointerId}`);

// --- 3. Baseline: no override -> pointer ---
report(
  'Baseline: no override resolves to the bundle pointer pack',
  resolveInDocDir(docDir, pointerId, knownPackIds) === pointerId,
  `resolved: ${resolveInDocDir(docDir, pointerId, knownPackIds)}`
);

// --- 4. Activate the fixture: atomic override write + read-back check ---
writeOverrideAtomically(docDir, {
  active_pack_id: 'test-switch',
  previous_pack_id: pointerId,
  updated_at: new Date().toISOString(),
});
const afterSwitch = resolveInDocDir(docDir, pointerId, knownPackIds);
report(
  'Switch: override written atomically and resolves to the fixture',
  afterSwitch === 'test-switch',
  `resolved: ${afterSwitch}`
);
const storedAfterSwitch = loadOverride(docDir);
report(
  'Switch: stored override records the previous pack for rollback',
  storedAfterSwitch !== null && storedAfterSwitch.previous_pack_id === pointerId,
  `previous_pack_id: ${storedAfterSwitch ? storedAfterSwitch.previous_pack_id : 'none'}`
);

// --- 5. Rollback: one write restoring the previous pack ---
const rollbackTarget = storedAfterSwitch ? storedAfterSwitch.previous_pack_id : null;
writeOverrideAtomically(docDir, {
  active_pack_id: rollbackTarget,
  previous_pack_id: null,
  updated_at: new Date().toISOString(),
});
const afterRollback = resolveInDocDir(docDir, pointerId, knownPackIds);
report(
  'Rollback: one write restores the previous pack',
  afterRollback === pointerId,
  `resolved: ${afterRollback}`
);

// --- 6. Corrupt override: fall through safely to the pointer ---
fs.writeFileSync(path.join(docDir, OVERRIDE_FILE_NAME), '{this is not valid json');
const corruptLoad = loadOverride(docDir);
const afterCorrupt = resolveInDocDir(docDir, pointerId, knownPackIds);
report(
  'Corrupt override: load returns null (never crashes) and resolution falls through to the pointer',
  corruptLoad === null && afterCorrupt === pointerId,
  `override: null, resolved: ${afterCorrupt}`
);

// --- 7. Override naming an unknown pack: fall through safely to the pointer ---
writeOverrideAtomically(docDir, {
  active_pack_id: 'ghost-pack',
  previous_pack_id: null,
  updated_at: new Date().toISOString(),
});
const afterGhost = resolveInDocDir(docDir, pointerId, knownPackIds);
report(
  'Unknown pack override: bad value falls through to the pointer pack',
  afterGhost === pointerId,
  `resolved: ${afterGhost}`
);

// --- 8. Cleanup ---
fs.rmSync(docDir, { recursive: true, force: true });
report('Sandbox document directory cleaned up', !fs.existsSync(docDir));

console.log('\n=== PACK ACTIVATION DRILL ' + (failures === 0 ? 'PASSED' : 'FAILED') + ' ===');
process.exit(failures === 0 ? 0 : 1);
