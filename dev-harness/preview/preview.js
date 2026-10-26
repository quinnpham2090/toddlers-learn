/**
 * Phase 0 Dev-Only Preview Harness Controller
 * Loads pack data from /packs/core/*.json and /packs/active.json,
 * runs pure validate(pack) from /tools/validator.js, plays a lesson across L0-L3,
 * demonstrates degradation rules, atomic activation + rollback, and renders the 7 negative tests.
 */

import { validate, sha256Hex } from '../../tools/validator.js';
import { runNegativeTests, runCompilerEquivalenceTest } from '../../tools/test_suite.js';

const state = {
  pack: null,
  activePointer: null,
  pointerHistoryLog: [],
  selectedLessonId: null,
  stepIndex: 0,
  scaffoldLevel: 0,
  completedSteps: 0,
  sessionWon: false,
  degradation: {
    missingAudio: false,
    missingModel: false,
    bothFail: false,
    brokenMission: false
  },
  lessonLogs: []
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.text();
}

async function loadCorePackFromFiles() {
  const [
    manifest,
    strings,
    skills,
    lessons,
    song_templates,
    saved_songs,
    characters,
    picture_sets,
    missions,
    routines,
    time_concepts,
    activePointer
  ] = await Promise.all([
    fetchJson('/packs/core/manifest.json'),
    fetchJson('/packs/core/strings.json'),
    fetchJson('/packs/core/skills.json'),
    fetchJson('/packs/core/lessons.json'),
    fetchJson('/packs/core/song_templates.json'),
    fetchJson('/packs/core/saved_songs.json'),
    fetchJson('/packs/core/characters.json'),
    fetchJson('/packs/core/picture_sets.json'),
    fetchJson('/packs/core/missions.json'),
    fetchJson('/packs/core/routines.json'),
    fetchJson('/packs/core/time_concepts.json'),
    fetchJson('/packs/active.json')
  ]);

  const assets = {};
  for (const relPath of Object.keys(manifest.file_hashes || {})) {
    if (relPath.startsWith('assets/')) {
      assets[relPath] = await fetchText(`/packs/core/${relPath}`);
    }
  }

  return {
    pack: {
      manifest,
      strings,
      skills,
      lessons,
      song_templates,
      saved_songs,
      characters,
      picture_sets,
      missions,
      routines,
      time_concepts,
      assets
    },
    activePointer
  };
}

function t(stringRef) {
  if (!state.pack || !state.pack.strings) return stringRef;
  const loc = state.pack.manifest.default_locale || 'en-US';
  const table = state.pack.strings.locales[loc] || {};
  return table[stringRef] || stringRef;
}

function renderPackInspector() {
  const { pack } = state;
  const result = validate(pack);

  const metaEl = document.getElementById('pack-meta');
  metaEl.innerHTML = `
    Pack ID: <code>${pack.manifest.id}</code> ·
    Version: <code>${pack.manifest.version}</code> ·
    Schema Version: <code>${pack.manifest.schema_version}</code> ·
    Locale: <code>${pack.manifest.default_locale}</code> ·
    SHA-256: <code>${pack.manifest.pack_sha256.slice(0, 16)}…</code>
    <span class="badge badge-demo" style="margin-left:8px;">DEMO: ${pack.manifest.demo}</span>
  `;

  const badgeEl = document.getElementById('validation-badge');
  if (result.valid) {
    badgeEl.innerHTML = `<span class="badge badge-pass">VALIDATOR: PASS (0 Errors)</span>`;
  } else {
    badgeEl.innerHTML = `<span class="badge badge-fail">VALIDATOR: FAIL (${result.error_count} Errors)</span>`;
  }

  // Populate records table
  const tbody = document.querySelector('#records-table tbody');
  const rows = [];
  const collect = (arr, titleKey = 'title_ref') => {
    for (const r of arr) {
      const ref = r[titleKey] || r.name_ref || r.lesson_word_ref || '';
      rows.push(`
        <tr>
          <td><code>${r.record_type}</code></td>
          <td><code>${r.id}</code></td>
          <td><span class="badge badge-demo">${r.status}</span></td>
          <td>${r.age_band}</td>
          <td>${ref ? t(ref) : '<em>(Note data only)</em>'}</td>
        </tr>
      `);
    }
  };

  collect([pack.manifest]);
  collect(pack.skills);
  collect(pack.lessons);
  collect(pack.song_templates);
  collect(pack.saved_songs);
  collect(pack.characters, 'name_ref');
  collect(pack.picture_sets);
  collect(pack.missions);
  collect(pack.routines);
  collect(pack.time_concepts);

  tbody.innerHTML = rows.join('');

  // Populate rule families table
  const famBody = document.querySelector('#family-table tbody');
  famBody.innerHTML = Object.entries(result.summary_by_family)
    .map(([fam, count]) => `
      <tr>
        <td><code>${fam}</code></td>
        <td>${count}</td>
        <td><span class="badge ${count === 0 ? 'badge-pass' : 'badge-fail'}">${count === 0 ? 'PASS' : 'BLOCK'}</span></td>
      </tr>
    `)
    .join('');

  const errBox = document.getElementById('validator-errors-box');
  if (result.errors.length === 0) {
    errBox.innerHTML = `<div style="font-size:13px;color:var(--pass);font-weight:600;">All 12 validator rule families and structural checks passed on <code>/packs/core</code>.</div>`;
  } else {
    errBox.innerHTML = result.errors
      .map((e) => `<div style="color:var(--err);font-size:12px;">[${e.rule}] ${e.record_id}: ${e.message}</div>`)
      .join('');
  }
}

function initLessonRunner() {
  const select = document.getElementById('lesson-select');
  select.innerHTML = state.pack.lessons
    .map((ls) => `<option value="${ls.id}">${ls.id} — ${t(ls.title_ref)} (${ls.age_band})</option>`)
    .join('');

  state.selectedLessonId = state.pack.lessons[0].id;
  select.addEventListener('change', () => {
    state.selectedLessonId = select.value;
    resetLessonSession();
  });

  document.querySelectorAll('#scaffold-buttons button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.scaffoldLevel = Number.parseInt(btn.dataset.level, 10);
      logLessonEvent(`Switched scaffold ladder to L${state.scaffoldLevel} (${getCurrentLesson().scaffolds[String(state.scaffoldLevel)].mode}).`);
      renderLessonStage();
    });
  });

  const bindDeg = (id, key, desc) => {
    const el = document.getElementById(id);
    el.addEventListener('change', () => {
      state.degradation[key] = el.checked;
      logLessonEvent(`Degradation toggle [${desc}]: ${el.checked ? 'ACTIVE' : 'OFF'}`);
      renderLessonStage();
    });
  };
  bindDeg('deg-missing-audio', 'missingAudio', 'Missing Character Audio -> Synth Speech');
  bindDeg('deg-missing-model', 'missingModel', 'Missing Character Model -> Guide Character');
  bindDeg('deg-both-fail', 'bothFail', 'Both Assets Fail -> Narration + Generic Picture');
  bindDeg('deg-broken-mission', 'brokenMission', 'Broken Mission -> Not Offered');

  document.getElementById('btn-reset-lesson').addEventListener('click', () => {
    resetLessonSession();
  });

  document.getElementById('btn-auto-play').addEventListener('click', () => {
    runAutomatedLessonWalkthrough();
  });

  resetLessonSession();
}

function getCurrentLesson() {
  return state.pack.lessons.find((l) => l.id === state.selectedLessonId) || state.pack.lessons[0];
}

function findPictureItem(itemId) {
  for (const ps of state.pack.picture_sets) {
    for (const item of ps.items) {
      if (item.item_id === itemId) return item;
    }
  }
  return null;
}

function logLessonEvent(msg) {
  state.lessonLogs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
  const el = document.getElementById('lesson-log');
  if (el) {
    el.innerHTML = state.lessonLogs.map((l) => `<div>${l}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }
}

function resetLessonSession() {
  state.stepIndex = 0;
  state.scaffoldLevel = 0;
  state.completedSteps = 0;
  state.sessionWon = false;
  state.lessonLogs = [];
  const ls = getCurrentLesson();
  logLessonEvent(`Loaded lesson "${ls.id}" ("${t(ls.title_ref)}"), steps=${ls.steps.length}, skill=${ls.primary_skill_id}.`);
  renderLessonStage();
}

function renderLessonStage() {
  const ls = getCurrentLesson();
  const stage = document.getElementById('lesson-stage');

  // Update scaffold button active states
  document.querySelectorAll('#scaffold-buttons button').forEach((btn) => {
    const lvl = Number.parseInt(btn.dataset.level, 10);
    btn.className = lvl === state.scaffoldLevel ? '' : 'secondary';
  });

  // Resolve character with degradation rules
  let activeChar = state.pack.characters.find((c) => c.id === ls.character_id) || state.pack.characters[0];
  let charStatusNote = `Character: <code>${activeChar.id}</code> (${t(activeChar.name_ref)})`;
  let charAssetUrl = `/packs/core/${activeChar.model_asset_path}`;

  if (state.degradation.bothFail) {
    charStatusNote = `DEGRADED (Both Character Audio & Model Failed) → Narrated prompt from <code>strings.json</code> + generic fallback picture (<code>fallback-generic-set</code>). Activity continues without crash or blank.`;
    charAssetUrl = `/packs/core/assets/generic-picture.svg`;
  } else {
    if (state.degradation.missingModel) {
      const guideChar = state.pack.characters.find((c) => c.id === 'guide') || activeChar;
      activeChar = guideChar;
      charAssetUrl = `/packs/core/${guideChar.model_asset_path}`;
      charStatusNote = `DEGRADED (Missing Model) → Substituted fallback character <code>${guideChar.id}</code> (${t(guideChar.name_ref)}).`;
    }
    if (state.degradation.missingAudio) {
      charStatusNote += ` · DEGRADED (Missing Audio) → Synthesised speech from <code>strings.json</code> (${activeChar.voice_profile.register}, ${activeChar.voice_profile.pacing_wpm} WPM).`;
    }
  }

  // Mission link status with degradation rule (broken mission = not offered at all)
  let missionStatusHtml = '';
  if (ls.mission_id) {
    if (state.degradation.brokenMission) {
      missionStatusHtml = `<div style="margin-top:8px;padding:6px 10px;background:var(--warn-bg);color:var(--warn);border-radius:6px;font-size:12px;">
        <strong>Degradation Rule Active:</strong> Linked mission <code>${ls.mission_id}</code> is marked broken → suppressed completely (not offered at all; never crashes or blocks session).
      </div>`;
    } else {
      const ms = state.pack.missions.find((m) => m.id === ls.mission_id);
      if (ms) {
        missionStatusHtml = `<div style="margin-top:8px;padding:6px 10px;background:#eef5f2;border-radius:6px;font-size:12px;">
          <strong>Cooperative Device-Down Mission Ready:</strong> <code>${ms.id}</code> ("${t(ms.title_ref)}") · 3-Level Alt Chain:
          <code>${ms.objects[0].object_id}</code> → <code>${ms.objects[0].alternative_object_id}</code> → <code>${ms.objects[0].fallback_body_action_id}</code>
        </div>`;
      }
    }
  }

  if (state.sessionWon) {
    const song = state.pack.song_templates.find((s) => s.id === ls.song_template_id) || state.pack.song_templates[0];
    stage.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${charAssetUrl}" alt="Guide" style="width:48px;height:48px;" />
        <div>
          <span class="badge badge-pass">SESSION ENDED ON A WIN</span>
          <h3 style="margin:4px 0;">${t(ls.closing_win_ref)}</h3>
          <div style="font-size:12px;color:var(--muted);">${charStatusNote}</div>
        </div>
      </div>
      <div style="margin-top:12px;padding:10px;background:#fff;border-radius:8px;border:1px solid var(--border);font-size:13px;">
        <strong>Closing Song Ritual (<code>${song.id}</code>):</strong> "${t(song.title_ref)}" · Lesson word: <em>"${t(song.lesson_word_ref)}"</em> ·
        Scale: <code>${song.pentatonic_set_id}</code> · Notes: <code>${song.base_notes.join(' - ')}</code> (${song.child_slots} child slots).
      </div>
      ${missionStatusHtml}
    `;
    return;
  }

  const step = ls.steps[state.stepIndex];
  const scaffold = ls.scaffolds[String(state.scaffoldLevel)];

  // Filter choices according to scaffold level max_choices while always keeping target_item_id
  const allChoices = step.choice_item_ids;
  const targetId = step.target_item_id;
  const nonTarget = allChoices.filter((id) => id !== targetId);
  const allowedCount = Math.min(allChoices.length, scaffold.max_choices);
  const visibleChoiceIds = [targetId, ...nonTarget.slice(0, Math.max(0, allowedCount - 1))];

  const choicesHtml = visibleChoiceIds
    .map((cid) => {
      const item = state.degradation.bothFail
        ? findPictureItem('generic-picture') || findPictureItem(cid)
        : findPictureItem(cid);
      const isTarget = cid === targetId;
      const highlightClass = isTarget && scaffold.highlight_target ? 'highlight' : '';
      const imgSrc = item ? `/packs/core/${item.asset_path}` : '/packs/core/assets/generic-picture.svg';
      const label = item ? t(item.label_ref) : cid;
      return `
        <button type="button" class="choice-btn ${highlightClass}" data-choice-id="${cid}">
          <img src="${imgSrc}" alt="${label}" />
          <div><strong>${label}</strong></div>
          <div style="font-size:11px;color:var(--muted);"><code>${cid}</code></div>
          ${isTarget && scaffold.model_demonstration ? `<div style="font-size:11px;color:var(--accent);margin-top:4px;">★ Guide models here</div>` : ''}
        </button>
      `;
    })
    .join('');

  stage.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="${charAssetUrl}" alt="Character" style="width:48px;height:48px;" />
      <div>
        <div style="font-size:12px;color:var(--muted);">
          Step ${state.stepIndex + 1} of ${ls.steps.length} · Scaffold <strong>L${scaffold.level} (${scaffold.mode})</strong> · Child Final Tap Required: <code>${scaffold.child_final_tap_required}</code>
        </div>
        <h3 style="margin:4px 0;">${t(step.prompt_ref)}</h3>
        <div style="font-size:12px;color:var(--accent);">${t(scaffold.prompt_ref)}</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:8px;">${charStatusNote}</div>
    <div class="choices-grid">${choicesHtml}</div>
    ${missionStatusHtml}
  `;

  stage.querySelectorAll('.choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleChoiceTap(btn.dataset.choiceId);
    });
  });
}

function handleChoiceTap(chosenId) {
  const ls = getCurrentLesson();
  const step = ls.steps[state.stepIndex];

  if (chosenId === step.target_item_id) {
    logLessonEvent(`Step ${step.step_index}: Child tapped target "${chosenId}" at Scaffold L${state.scaffoldLevel} -> "${t(step.celebration_ref)}"`);
    state.completedSteps += 1;
    if (state.stepIndex + 1 < ls.steps.length) {
      state.stepIndex += 1;
      state.scaffoldLevel = 0;
    } else {
      state.sessionWon = true;
      logLessonEvent(`Lesson "${ls.id}" complete! Session ended on a WIN: "${t(ls.closing_win_ref)}"`);
    }
    renderLessonStage();
  } else {
    // Nothing is ever labelled wrong: gently step up the scaffold ladder L0 -> L1 -> L2 -> L3
    const nextLevel = Math.min(3, state.scaffoldLevel + 1);
    logLessonEvent(
      `Step ${step.step_index}: Child explored "${chosenId}" (no wrong/fail event emitted) -> advancing scaffold support L${state.scaffoldLevel} → L${nextLevel}.`
    );
    state.scaffoldLevel = nextLevel;
    renderLessonStage();
  }
}

function runAutomatedLessonWalkthrough() {
  resetLessonSession();
  const ls = getCurrentLesson();
  const step1 = ls.steps[0];
  const distractor1 = step1.choice_item_ids.find((id) => id !== step1.target_item_id) || step1.target_item_id;

  // Demonstrate L0 -> L1 -> L2 -> L3 progression on Step 1, then child final tap, then remaining steps to Win
  handleChoiceTap(distractor1); // L0 -> L1
  handleChoiceTap(distractor1); // L1 -> L2
  handleChoiceTap(distractor1); // L2 -> L3 (do_together_final_tap)
  handleChoiceTap(step1.target_item_id); // Child makes the final tap on Step 1!

  // Complete remaining steps
  while (!state.sessionWon) {
    const currStep = ls.steps[state.stepIndex];
    handleChoiceTap(currStep.target_item_id);
  }
}

function initActivationAndRollbackDrill() {
  renderPointerState();
  logPointerEvent(`Initial active pointer loaded: active_pack_id="${state.activePointer.active_pack_id}" (${state.activePointer.active_pack_version}), sha256=${state.activePointer.active_pack_sha256.slice(0, 12)}…`);

  document.getElementById('btn-activate-candidate').addEventListener('click', () => {
    // Clone core pack as a valid 0.2.0 candidate pack and validate before swapping pointer
    const candidatePack = JSON.parse(JSON.stringify(state.pack));
    candidatePack.manifest.id = 'core-v0-2-candidate';
    candidatePack.manifest.version = '0.2.0';
    const candidateSha = sha256Hex(JSON.stringify(candidatePack.manifest));
    candidatePack.manifest.pack_sha256 = candidateSha;

    const val = validate(candidatePack);
    if (!val.valid) {
      logPointerEvent(`[BLOCKED] Candidate pack failed validation (${val.error_count} errors). Active pointer unchanged.`);
      return;
    }

    const beforeId = state.activePointer.active_pack_id;
    const beforeVer = state.activePointer.active_pack_version;
    state.activePointer = {
      active_pack_id: candidatePack.manifest.id,
      active_pack_path: '/packs/core-v0-2-candidate',
      active_pack_version: candidatePack.manifest.version,
      active_pack_sha256: candidateSha,
      previous_pack_id: state.activePointer.active_pack_id,
      previous_pack_path: state.activePointer.active_pack_path,
      previous_pack_version: state.activePointer.active_pack_version,
      previous_pack_sha256: state.activePointer.active_pack_sha256,
      updated_at: new Date().toISOString()
    };
    logPointerEvent(
      `[ATOMIC SWAP] Activated "${state.activePointer.active_pack_id}" (${state.activePointer.active_pack_version}). Previous pointer preserved: "${beforeId}" (${beforeVer}).`
    );
    renderPointerState();
  });

  document.getElementById('btn-activate-broken').addEventListener('click', () => {
    const brokenCandidate = JSON.parse(JSON.stringify(state.pack));
    brokenCandidate.lessons[0].primary_skill_id = 'dangling-nonexistent-skill';
    const val = validate(brokenCandidate);
    if (!val.valid) {
      logPointerEvent(
        `[ABORTED ATOMICALLY] Candidate pack failed validation with ${val.error_count} error (${val.errors[0].rule}). Active pointer remains "${state.activePointer.active_pack_id}" (${state.activePointer.active_pack_version}) — never a partial load.`
      );
    }
    renderPointerState();
  });

  document.getElementById('btn-rollback').addEventListener('click', () => {
    if (!state.activePointer.previous_pack_id) {
      logPointerEvent(`[NO-OP] No previous_pack_id stored to roll back to.`);
      return;
    }
    const rolledFrom = `${state.activePointer.active_pack_id}@${state.activePointer.active_pack_version}`;
    state.activePointer = {
      active_pack_id: state.activePointer.previous_pack_id,
      active_pack_path: state.activePointer.previous_pack_path,
      active_pack_version: state.activePointer.previous_pack_version,
      active_pack_sha256: state.activePointer.previous_pack_sha256,
      previous_pack_id: null,
      previous_pack_path: null,
      previous_pack_version: null,
      previous_pack_sha256: null,
      updated_at: new Date().toISOString()
    };
    logPointerEvent(
      `[ROLLBACK COMPLETE] Rolled back from "${rolledFrom}" to "${state.activePointer.active_pack_id}@${state.activePointer.active_pack_version}" in one atomic action.`
    );
    renderPointerState();
  });
}

function logPointerEvent(msg) {
  state.pointerHistoryLog.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
  const el = document.getElementById('pointer-log');
  if (el) {
    el.innerHTML = state.pointerHistoryLog.map((l) => `<div>${l}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }
}

function renderPointerState() {
  const pre = document.getElementById('active-pointer-json');
  pre.textContent = JSON.stringify(state.activePointer, null, 2);
}

function renderNegativeTests() {
  const results = runNegativeTests(state.pack);
  const tbody = document.querySelector('#negative-tests-table tbody');
  tbody.innerHTML = results
    .map((r) => {
      const err = r.matched_error;
      return `
        <tr>
          <td><code>${r.id}</code></td>
          <td>${r.title}</td>
          <td><code>${r.expected_family}</code> / <code>${r.expected_rule}</code></td>
          <td>
            <span class="badge ${r.test_passed ? 'badge-pass' : 'badge-fail'}">
              ${r.test_passed ? 'VALIDATOR FAILED AS EXPECTED' : 'UNEXPECTED PASS'}
            </span>
          </td>
          <td>
            ${err ? `<strong>Record:</strong> <code>${err.record_id}</code> · <strong>Rule:</strong> <code>${err.rule}</code><br/>${err.message}` : 'None'}
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderCompilerEquivalence() {
  const res = runCompilerEquivalenceTest();
  const summaryEl = document.getElementById('compiler-diff-summary');
  summaryEl.innerHTML = `
    <span class="badge ${res.byte_identical ? 'badge-pass' : 'badge-fail'}">
      ${res.byte_identical ? 'BYTE-IDENTICAL (0 Bytes Diff)' : 'DIFF DETECTED'}
    </span>
    <span style="font-size:13px;margin-left:10px;">
      Path A (Form) bytes: <code>${res.form_byte_length}</code> ·
      Path B (CSV) bytes: <code>${res.csv_byte_length}</code> ·
      Output SHA-256: <code>${sha256Hex(res.compiled_json)}</code>
    </span>
  `;
  document.getElementById('compiler-csv-preview').textContent = res.csv_text;
  document.getElementById('compiler-json-preview').textContent = res.compiled_json;
}

async function boot() {
  try {
    const loaded = await loadCorePackFromFiles();
    state.pack = loaded.pack;
    state.activePointer = loaded.activePointer;

    renderPackInspector();
    initLessonRunner();
    runAutomatedLessonWalkthrough();
    initActivationAndRollbackDrill();
    renderNegativeTests();
    renderCompilerEquivalence();
  } catch (err) {
    document.getElementById('pack-meta').innerHTML = `<span style="color:var(--err);">Error loading pack: ${err.message}</span>`;
  }
}

boot();
