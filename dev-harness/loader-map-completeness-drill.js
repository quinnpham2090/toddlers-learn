/**
 * Loader-map completeness drill — DEV ONLY (Node), never runs in the app.
 *
 * Guards one gap class: a picture-set item record references an asset_path that
 * has no entry in that pack's PACK_ASSET_REGISTRY map, so the session resolves
 * the tile through getPackAsset(packId, assetPath) and gets undefined (a blank
 * tile) even though the file and the record both exist.
 *
 * The app's pack-loader.ts cannot execute in Node, so the drill reads the real
 * source and extracts each pack's asset-map keys from PACK_ASSET_REGISTRY with
 * brace matching (the map is a plain object literal of string keys).
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packsDir = path.join(root, 'packs');
let failures = 0;
function report(title, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}${detail ? ` -> ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const loaderSrc = fs.readFileSync(path.join(root, 'lib/pack-loader.ts'), 'utf8');

/** Extract { packId: Set<assetKey> } from PACK_ASSET_REGISTRY in the source. */
function extractAssetRegistry(src) {
  const start = src.indexOf('const PACK_ASSET_REGISTRY');
  if (start < 0) return null;
  const end = src.indexOf('let cachedOverride', start);
  const block = src.slice(start, end < 0 ? src.length : end);
  const registry = {};
  const packKeyRe = /(?:^|\n)\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_-]+))\s*:\s*\{/g;
  let match;
  while ((match = packKeyRe.exec(block)) !== null) {
    const packId = match[1] ?? match[2] ?? match[3];
    // Brace-match this pack's object literal.
    let depth = 0;
    let i = block.indexOf('{', match.index);
    const openAt = i;
    for (; i < block.length; i += 1) {
      if (block[i] === '{') depth += 1;
      else if (block[i] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const body = block.slice(openAt + 1, i);
    const keys = new Set();
    const keyRe = /(?:'([^']+)'|"([^"]+)")\s*:/g;
    let keyMatch;
    while ((keyMatch = keyRe.exec(body)) !== null) {
      keys.add(keyMatch[1] ?? keyMatch[2]);
    }
    registry[packId] = keys;
  }
  return registry;
}

const registry = extractAssetRegistry(loaderSrc);
report('PACK_ASSET_REGISTRY extracted from lib/pack-loader.ts', registry !== null && Object.keys(registry).length > 0, registry ? Object.keys(registry).join(', ') : 'not found');

const packDirs = fs
  .readdirSync(packsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'schema')
  .map((entry) => entry.name);

const missing = [];
for (const dirName of packDirs) {
  const dir = path.join(packsDir, dirName);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const packId = manifest.id;
  const map = registry?.[packId];
  if (!map) {
    report(`pack "${packId}" has an asset-registry map`, false, `no PACK_ASSET_REGISTRY entry for ${packId}`);
    continue;
  }
  const setsPath = path.join(dir, 'picture_sets.json');
  const sets = fs.existsSync(setsPath) ? JSON.parse(fs.readFileSync(setsPath, 'utf8')) : [];
  const referenced = new Map();
  for (const set of sets) {
    for (const item of set.items ?? []) {
      if (typeof item.asset_path !== 'string' || item.asset_path.length === 0) continue;
      if (!referenced.has(item.asset_path)) referenced.set(item.asset_path, []);
      referenced.get(item.asset_path).push(set.id);
    }
  }
  const unresolved = [...referenced.entries()].filter(([assetPath]) => !map.has(assetPath));
  for (const [assetPath, setIds] of unresolved) {
    const fileExists = fs.existsSync(path.join(dir, assetPath));
    missing.push({ packId, assetPath, setIds: setIds.join(', '), fileExists });
  }
  report(
    `pack "${packId}": every picture-set asset_path resolves in its loader map`,
    unresolved.length === 0,
    unresolved.length === 0
      ? `${referenced.size} asset paths checked`
      : unresolved.map(([a]) => a).join(', ')
  );
}

if (missing.length > 0) {
  console.log('\nMISSING LOADER-MAP ENTRIES:');
  for (const entry of missing) {
    console.log(
      `  - pack=${entry.packId} asset=${entry.assetPath} sets=[${entry.setIds}] fileExists=${entry.fileExists}`
    );
  }
}

report(
  'no missing loader-map entries remain (outdoor-plant fixed)',
  missing.length === 0,
  missing.map((entry) => `${entry.packId}:${entry.assetPath}`).join(', ')
);

console.log(`\n${failures === 0 ? 'ALL LOADER-MAP COMPLETENESS CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
