/**
 * CLI Verification Runner for Phase 0 Contract:
 * 1. Validates purity of /tools/validator.js and /tools/compiler.js (no DOM, no fetch, no framework imports).
 * 2. Loads /packs/core demo pack and verifies it passes validate(pack) with 0 errors.
 * 3. Runs all 7 negative validator tests and verifies each fails with its expected named rule.
 * 4. Runs Path A (Form) vs Path B (CSV) compiler test and verifies byte-for-byte identity (0 byte diff).
 */

import fs from 'node:fs';
import path from 'node:path';
import { validate, sha256Hex } from './validator.js';
import { runNegativeTests, runCompilerEquivalenceTest } from './test_suite.js';

const rootDir = process.cwd();
const packDir = path.join(rootDir, 'packs', 'core');

function loadCorePack() {
  const readJson = (file) => JSON.parse(fs.readFileSync(path.join(packDir, file), 'utf8'));
  const manifest = readJson('manifest.json');
  const assets = {};
  for (const relPath of Object.keys(manifest.file_hashes)) {
    if (relPath.startsWith('assets/')) {
      assets[relPath] = fs.readFileSync(path.join(packDir, relPath), 'utf8');
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
    assets
  };
}

function checkPurity(filePath) {
  const src = fs.readFileSync(path.join(rootDir, filePath), 'utf8');
  const forbiddenPatterns = [
    /\bwindow\b/,
    /\bdocument\b/,
    /\blocalStorage\b/,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /from\s+['"]react/,
    /from\s+['"]next/,
    /from\s+['"]node:/,
    /require\s*\(\s*['"]fs['"]\s*\)/
  ];
  for (const re of forbiddenPatterns) {
    if (re.test(src)) {
      throw new Error(`Purity violation in ${filePath}: matched forbidden pattern ${re}`);
    }
  }
}

console.log('=== PHASE 0 VERIFICATION SUITE ===\n');

// 1. Purity check
checkPurity('tools/validator.js');
checkPurity('tools/compiler.js');
console.log('[PASS] Purity check: /tools/validator.js and /tools/compiler.js have zero DOM, fetch, Node, or framework imports.');

// 2. Demo pack validation
const corePack = loadCorePack();
const demoValidation = validate(corePack);
if (!demoValidation.valid) {
  console.error('[FAIL] Demo pack (/packs/core) failed validation:', JSON.stringify(demoValidation.errors, null, 2));
  process.exit(1);
}
console.log(`[PASS] Demo pack (/packs/core) validation: ${demoValidation.status} (${demoValidation.error_count} errors).`);

// 3. 7 Negative tests
const negResults = runNegativeTests(corePack);
console.log('\n--- 7 Negative Validator Tests ---');
let allNegPassed = true;
for (const neg of negResults) {
  const badge = neg.test_passed ? 'PASS (Validator rejected as expected)' : 'FAIL (Validator did not reject)';
  console.log(`[${badge}] ${neg.title}`);
  if (neg.matched_error) {
    console.log(`       -> Rule: ${neg.matched_error.rule} (${neg.matched_error.family}) | Record: ${neg.matched_error.record_id}`);
    console.log(`       -> Message: ${neg.matched_error.message}`);
  }
  if (!neg.test_passed) allNegPassed = false;
}
if (!allNegPassed) {
  console.error('One or more negative tests did not fail as expected!');
  process.exit(1);
}

// 4. Compiler equivalence test (Path A Form vs Path B CSV)
console.log('\n--- Compiler Byte-for-Byte Equivalence Test (Path A Form vs Path B CSV) ---');
const compResult = runCompilerEquivalenceTest();
console.log(`Path A (Form) output bytes : ${compResult.form_byte_length}`);
console.log(`Path B (CSV)  output bytes : ${compResult.csv_byte_length}`);
console.log(`SHA-256 of compiled output : ${sha256Hex(compResult.compiled_json)}`);
console.log(`Byte-for-byte diff result  : ${compResult.byte_identical ? '0 bytes difference (BYTE-IDENTICAL)' : `MISMATCH at byte ${compResult.first_diff_index}`}`);

if (!compResult.byte_identical) {
  process.exit(1);
}

console.log('\n=== ALL PHASE 0 CHECKS PASSED ===');
