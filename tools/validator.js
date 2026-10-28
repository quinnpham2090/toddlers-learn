/**
 * Phase 0 Pure Content-Pack Validator
 * Purity contract: NO DOM access, NO fetch, NO framework imports, NO Node/OS imports.
 * Runs identically in CLI, Node, Bun, and browser environments.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const LOCALE_RE = /^[a-z]{2,3}(?:-[A-Z]{2}|-[a-zA-Z0-9]{2,8})*$/;
const STRING_REF_RE = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const ASSET_EXT_RE = /^assets\/[a-z0-9/_-]+\.(svg|png|webp|jpg|jpeg)$/;
const VOICE_ASSET_EXT_RE = /^assets\/voice\/[a-z0-9/_-]+\.mp3$/;

const AGE_BANDS = ['2-3', '3-4', '4-5', '2-5'];
const AGE_BAND_MIN_ORDER = { '2-3': 1, '3-4': 2, '4-5': 3, '2-5': 1 };
const STATUS_VALUES = ['draft', 'review', 'live'];

// Fixed Time-Concept Age Ladder. Clock-minute, month-order, and abstract-duration have NO enum value.
const TIME_CONCEPT_LADDER = {
  now_next: '2-3',
  day_night: '2-3',
  first_then: '2-3',
  morning_afternoon_evening: '3-4',
  before_after: '3-4',
  yesterday_today_tomorrow: '4-5',
  seasons_cycle: '4-5'
};

const FORBIDDEN_TIME_CONCEPTS = [
  'clock_minute',
  'clock-minute',
  'month_order',
  'month-order',
  'abstract_duration',
  'abstract-duration',
  'minutes_on_clock',
  'months_of_year'
];

// P-COOP banned fields
const COOP_BANNED_FIELDS = new Set([
  'opponent',
  'score',
  'points',
  'stars_earned',
  'timer_seconds',
  'countdown',
  'time_limit',
  'time_bonus',
  'leaderboard',
  'rank',
  'winner',
  'loser',
  'streak',
  'best_time',
  'attempts_allowed',
  'fail_message',
  'wrong_audio_ref'
]);

// P-COOP banned copy substrings (case-insensitive)
const COOP_BANNED_SUBSTRINGS = [
  'race',
  'faster than',
  'beat',
  'win',
  'winner',
  'loser',
  'too slow',
  'hurry up',
  'before time runs out',
  'against',
  'versus',
  'compete',
  'first one to',
  'who can',
  'better than sibling'
];

// Hard-banned purchase / commerce fields
const PURCHASE_BANNED_FIELDS = new Set([
  'price',
  'price_usd',
  'price_cents',
  'currency',
  'sku',
  'iap',
  'in_app_purchase',
  'subscription',
  'paywall',
  'purchase',
  'purchase_url',
  'checkout_url',
  'store_product_id',
  'trial_days',
  'upsell'
]);

// Hard-banned script / remote execution / webview fields
const EXECUTION_BANNED_FIELDS = new Set([
  'script',
  'scripts',
  'eval_code',
  'inline_js',
  'remote_url',
  'webview',
  'webview_url',
  'iframe_url',
  'external_url',
  'remote_script_url'
]);

// P-NOPII banned fields
const PII_BANNED_FIELDS = new Set([
  'child_name',
  'first_name',
  'last_name',
  'full_name',
  'nickname',
  'child_photo',
  'photo_uri',
  'photo_blob',
  'avatar_photo',
  'voice_recording',
  'voice_blob',
  'audio_recording',
  'free_text',
  'child_free_text',
  'location',
  'gps',
  'latitude',
  'longitude',
  'school',
  'school_name',
  'device_id',
  'idfa',
  'idfv',
  'gaid',
  'mac_address',
  'email',
  'phone_number',
  'birth_date',
  'dob'
]);

// P-NOFAIL banned fields and copy
const NOFAIL_BANNED_FIELDS = new Set([
  'score',
  'points',
  'fail_message',
  'wrong_audio_ref',
  'wrong_event',
  'error_buzzer',
  'penalty',
  'lives_remaining',
  'game_over',
  ' strike_count'
]);

const NOFAIL_BANNED_SUBSTRINGS = [
  'you failed',
  'wrong answer',
  'that is wrong',
  'incorrect',
  'try harder',
  'game over',
  'you lost',
  'bad job',
  'too bad'
];

// Return ritual proof/judgement banned substrings
const RETURN_RITUAL_BANNED_SUBSTRINGS = [
  'prove',
  'proof',
  'upload photo',
  'take a photo',
  'did you really',
  'rate your child',
  'grade',
  'score your',
  'verify completion'
];

// P-ORIG & P-COPY trademark / design blocklist
const TRADEMARK_BLOCKLIST = [
  'disney',
  'pixar',
  'peppa',
  'peppa pig',
  'paw patrol',
  'bluey',
  'bingo heeler',
  'cocomelon',
  'jj melon',
  'sesame street',
  'elmo',
  'big bird',
  'cookie monster',
  'dora the explorer',
  'spongebob',
  'pokemon',
  'pikachu',
  'mario',
  'nintendo',
  'roblox',
  'minecraft',
  'youtube kids',
  'tiktok',
  'barbie',
  'thomas the tank',
  'mickey mouse',
  'minnie mouse'
];

// Safety-blocked depiction tags that can NEVER be used in a mission or routine object
const SAFETY_BLOCKED_DEPICTION_TAGS = new Set([
  'small_object',
  'sharp',
  'hot',
  'requires_stairs'
]);

const ALLOWED_INTERACTION_TYPES = new Set([
  'tap_choice',
  'match_pair',
  'sort_group',
  'rhythm_tap',
  'story_echo',
  'do_together'
]);

const ALLOWED_ROUTINE_ANCHORS = new Set([
  'morning_wake',
  'mealtime_prep',
  'tidy_together',
  'bath_splash',
  'bedtime_winddown'
]);

const ALLOWED_TIMES_OF_DAY = new Set(['morning', 'midday', 'afternoon', 'evening']);

/**
 * Pure JavaScript SHA-256 implementation (FIPS 180-4) for UTF-8 strings.
 */
export function sha256Hex(asciiOrUtf8String) {
  const bytes = utf8ToBytes(String(asciiOrUtf8String));
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;

  const bitLen = bytes.length * 8;
  const padded = bytes.slice();
  padded.push(0x80);
  while ((padded.length % 64) !== 56) {
    padded.push(0);
  }
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  padded.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
  padded.push((lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);

  const W = new Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      W[i] = ((padded[j] << 24) | (padded[j + 1] << 16) | (padded[j + 2] << 8) | padded[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10)) >>> 0;
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;
    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  return [H0, H1, H2, H3, H4, H5, H6, H7]
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

function rotr(n, bits) {
  return ((n >>> bits) | (n << (32 - bits))) >>> 0;
}

function utf8ToBytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(++i);
      const cp = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    } else {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return out;
}

/**
 * Word boundary or substring match helper for copy scans.
 */
function containsBannedPhrase(text, phrase) {
  const lower = String(text).toLowerCase();
  const target = phrase.toLowerCase();
  if (target.includes(' ')) {
    return lower.includes(target);
  }
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  return re.test(lower);
}

/**
 * Recursively scan any record object for banned field names, remote URLs, scripts, purchases, PII, etc.
 */
function scanObjectForHardBans(obj, recordId, recordType, addError, path = '') {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => scanObjectForHardBans(item, recordId, recordType, addError, `${path}[${idx}]`));
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    const fieldPath = path ? `${path}.${key}` : key;
    const lowerKey = key.toLowerCase();

    // Purchase fields ban
    if (PURCHASE_BANNED_FIELDS.has(lowerKey) || lowerKey.includes('price') || lowerKey.includes('purchase')) {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-BAN-PURCHASE',
        recordId,
        recordType,
        `Record "${recordId}" contains hard-banned commerce/purchase field "${fieldPath}". Remove all purchase/price fields.`
      );
    }

    // Script / remote execution / webview ban
    if (EXECUTION_BANNED_FIELDS.has(lowerKey)) {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-BAN-EXECUTION',
        recordId,
        recordType,
        `Record "${recordId}" contains hard-banned execution/webview field "${fieldPath}".`
      );
    }

    // PII field ban
    if (PII_BANNED_FIELDS.has(lowerKey)) {
      addError(
        'P-NOPII',
        'P-NOPII-FIELD',
        recordId,
        recordType,
        `Record "${recordId}" contains prohibited child PII or device identifier field "${fieldPath}".`
      );
    }

    // P-COOP field ban
    if (COOP_BANNED_FIELDS.has(lowerKey)) {
      addError(
        'P-COOP',
        'P-COOP-BANNED-FIELD',
        recordId,
        recordType,
        `Record "${recordId}" contains banned competitive/timed field "${fieldPath}".`
      );
    }

    // P-NOFAIL field ban
    if (NOFAIL_BANNED_FIELDS.has(lowerKey)) {
      addError(
        'P-NOFAIL',
        'P-NOFAIL-BANNED-FIELD',
        recordId,
        recordType,
        `Record "${recordId}" contains banned fail/score field "${fieldPath}".`
      );
    }

    if (typeof val === 'string') {
      // Check for remote URLs or script tags anywhere in pack data
      if (/^https?:\/\//i.test(val.trim()) || /<script\b/i.test(val) || /javascript:/i.test(val)) {
        addError(
          'P-SCHEMA',
          'P-SCHEMA-REMOTE-OR-SCRIPT',
          recordId,
          recordType,
          `Record "${recordId}" field "${fieldPath}" contains a remote URL or executable script ("${val}").`
        );
      }
    } else if (typeof val === 'object' && val !== null) {
      scanObjectForHardBans(val, recordId, recordType, addError, fieldPath);
    }
  }
}

/**
 * Validate common record fields required on every versioned record.
 */
function validateCommonRecordFields(rec, expectedType, retiredSet, seenIdsByType, addError) {
  const id = rec && typeof rec.id === 'string' && rec.id.trim() ? rec.id : `<missing-id:${expectedType}>`;
  if (!rec || typeof rec !== 'object') {
    addError('P-SCHEMA', 'P-SCHEMA-INVALID-RECORD', id, expectedType, `Record of type "${expectedType}" is not an object.`);
    return id;
  }

  const requiredCommon = [
    'id',
    'record_type',
    'version',
    'locale',
    'age_band',
    'status',
    'tags',
    'created_by',
    'reviewed_by',
    'notes_author'
  ];

  for (const field of requiredCommon) {
    if (rec[field] === undefined || rec[field] === null || rec[field] === '') {
      if (field === 'notes_author' && rec[field] === '') continue;
      addError(
        'P-SCHEMA',
        'P-SCHEMA-MISSING-COMMON',
        id,
        expectedType,
        `Record "${id}" (${expectedType}) is missing required common field "${field}".`
      );
    }
  }

  if (typeof rec.id !== 'string' || !SLUG_RE.test(rec.id)) {
    addError(
      'P-SCHEMA',
      'P-SCHEMA-INVALID-SLUG',
      id,
      expectedType,
      `Record "${id}" has invalid slug id. Must match lowercase kebab-case "${SLUG_RE}".`
    );
  } else {
    if (retiredSet.has(rec.id)) {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-RETIRED-ID-REUSE',
        rec.id,
        expectedType,
        `Record "${rec.id}" (${expectedType}) reuses a retired/deleted slug id from manifest.retired_ids. Retired IDs may never be reused.`
      );
    }
    if (!seenIdsByType.has(expectedType)) {
      seenIdsByType.set(expectedType, new Set());
    }
    const typeSet = seenIdsByType.get(expectedType);
    if (typeSet.has(rec.id)) {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-DUPLICATE-ID',
        rec.id,
        expectedType,
        `Duplicate id "${rec.id}" within record type "${expectedType}".`
      );
    }
    typeSet.add(rec.id);
  }

  if (rec.record_type !== expectedType) {
    addError(
      'P-SCHEMA',
      'P-SCHEMA-RECORD-TYPE',
      id,
      expectedType,
      `Record "${id}" has record_type "${rec.record_type}", expected "${expectedType}".`
    );
  }

  if (typeof rec.version !== 'string' || !SEMVER_RE.test(rec.version)) {
    addError(
      'P-SCHEMA',
      'P-SCHEMA-INVALID-SEMVER',
      id,
      expectedType,
      `Record "${id}" has invalid semver "${rec.version}".`
    );
  }

  if (typeof rec.locale !== 'string' || !LOCALE_RE.test(rec.locale)) {
    addError(
      'P-SCHEMA',
      'P-SCHEMA-INVALID-LOCALE',
      id,
      expectedType,
      `Record "${id}" has invalid BCP 47 locale "${rec.locale}".`
    );
  }

  if (!AGE_BANDS.includes(rec.age_band)) {
    addError(
      'P-AGE',
      'P-AGE-INVALID-BAND',
      id,
      expectedType,
      `Record "${id}" has invalid age_band "${rec.age_band}". Allowed: ${AGE_BANDS.join(', ')}.`
    );
  }

  if (!STATUS_VALUES.includes(rec.status)) {
    addError(
      'P-SCHEMA',
      'P-SCHEMA-INVALID-STATUS',
      id,
      expectedType,
      `Record "${id}" has invalid status "${rec.status}". Allowed: draft, review, live.`
    );
  }

  if (!Array.isArray(rec.tags)) {
    addError('P-SCHEMA', 'P-SCHEMA-INVALID-TAGS', id, expectedType, `Record "${id}" tags must be an array.`);
  }

  scanObjectForHardBans(rec, id, expectedType, addError);
  return id;
}

/**
 * Pure validate(pack) function.
 * @param {object} pack - Normalized pack object containing manifest, strings, skills, lessons, song_templates, saved_songs, characters, picture_sets, missions, routines, time_concepts, and optional assets map.
 * @returns {{ valid: boolean, pass: boolean, status: 'PASS' | 'FAIL', error_count: number, errors: Array<object>, summary_by_family: object }}
 */
export function validate(pack) {
  const errors = [];
  const familyCounts = {
    'P-SCHEMA': 0,
    'P-REF': 0,
    'P-ORIG': 0,
    'P-UNIV': 0,
    'P-SAFE': 0,
    'P-AGE': 0,
    'P-NOFAIL': 0,
    'P-COOP': 0,
    'P-NOPII': 0,
    'P-MEDIA': 0,
    'P-GATE': 0,
    'P-COPY': 0
  };

  function addError(family, rule, record_id, record_type, message, extra = {}) {
    if (familyCounts[family] !== undefined) {
      familyCounts[family] += 1;
    }
    errors.push({
      family,
      rule,
      record_id: record_id || 'pack',
      record_type: record_type || 'pack',
      message,
      what_to_fix: extra.what_to_fix || message,
      ...(extra.referrers ? { referrers: extra.referrers } : {})
    });
  }

  if (!pack || typeof pack !== 'object') {
    addError('P-SCHEMA', 'P-SCHEMA-PACK-NULL', 'pack', 'pack', 'Pack input must be a non-null object.');
    return buildResult(errors, familyCounts);
  }

  const manifest = pack.manifest;
  const stringsObj = pack.strings;
  const skills = Array.isArray(pack.skills) ? pack.skills : [];
  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  const songTemplates = Array.isArray(pack.song_templates) ? pack.song_templates : [];
  const savedSongs = Array.isArray(pack.saved_songs) ? pack.saved_songs : [];
  const characters = Array.isArray(pack.characters) ? pack.characters : [];
  const pictureSets = Array.isArray(pack.picture_sets) ? pack.picture_sets : [];
  const missions = Array.isArray(pack.missions) ? pack.missions : [];
  const routines = Array.isArray(pack.routines) ? pack.routines : [];
  const timeConcepts = Array.isArray(pack.time_concepts) ? pack.time_concepts : [];
  const assetsMap = pack.assets && typeof pack.assets === 'object' ? pack.assets : null;

  const retiredSet = new Set(
    manifest && Array.isArray(manifest.retired_ids) ? manifest.retired_ids : []
  );
  const seenIdsByType = new Map();

  // 1. Validate Manifest
  if (!manifest || typeof manifest !== 'object') {
    addError('P-SCHEMA', 'P-SCHEMA-MISSING-MANIFEST', 'manifest', 'manifest', 'Pack is missing manifest.json.');
  } else {
    validateCommonRecordFields(manifest, 'manifest', retiredSet, seenIdsByType, addError);

    if (typeof manifest.schema_version !== 'string' || !SEMVER_RE.test(manifest.schema_version)) {
      addError('P-SCHEMA', 'P-SCHEMA-MANIFEST-SCHEMA-VER', manifest.id || 'manifest', 'manifest', 'manifest.schema_version must be valid semver.');
    }
    if (!Array.isArray(manifest.supported_schema_versions) || manifest.supported_schema_versions.length === 0) {
      addError('P-SCHEMA', 'P-SCHEMA-SUPPORTED-SCHEMAS', manifest.id || 'manifest', 'manifest', 'manifest.supported_schema_versions must be a non-empty array of semver strings.');
    } else if (!manifest.supported_schema_versions.includes(manifest.schema_version)) {
      addError('P-SCHEMA', 'P-SCHEMA-UNSUPPORTED-SCHEMA-VER', manifest.id || 'manifest', 'manifest', 'manifest.supported_schema_versions must include manifest.schema_version.');
    }

    // P-GATE check on manifest
    if (manifest.parent_gate_required !== true) {
      addError(
        'P-GATE',
        'P-GATE-MANIFEST-FLAG',
        manifest.id || 'manifest',
        'manifest',
        'manifest.parent_gate_required must be explicitly set to true.'
      );
    }

    // P-GATING: free/paid pack gate (absent defaults to "free")
    if (manifest.gating !== undefined && manifest.gating !== 'free' && manifest.gating !== 'paid') {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-MANIFEST-GATING',
        manifest.id || 'manifest',
        'manifest',
        `manifest.gating must be "free" or "paid" (got "${manifest.gating}"). Absent defaults to "free".`
      );
    }

    if (!manifest.file_hashes || typeof manifest.file_hashes !== 'object' || Object.keys(manifest.file_hashes).length === 0) {
      addError('P-MEDIA', 'P-MEDIA-MANIFEST-HASHES', manifest.id || 'manifest', 'manifest', 'manifest.file_hashes must record SHA-256 digests for pack files.');
    } else {
      for (const [fPath, digest] of Object.entries(manifest.file_hashes)) {
        if (typeof digest !== 'string' || !SHA256_RE.test(digest)) {
          addError('P-MEDIA', 'P-MEDIA-INVALID-SHA256', manifest.id || 'manifest', 'manifest', `Invalid SHA-256 digest for "${fPath}" in manifest.file_hashes.`);
        }
        if (fPath.startsWith('assets/voice/')) {
          if (!VOICE_ASSET_EXT_RE.test(fPath)) {
            addError('P-MEDIA', 'P-MEDIA-VOICE-ASSET-PATH', manifest.id || 'manifest', 'manifest', `Voice asset "${fPath}" must live under assets/voice/<speaker>/ with an .mp3 extension.`);
          }
        } else if (fPath.endsWith('.mp3')) {
          addError('P-MEDIA', 'P-MEDIA-MP3-OUTSIDE-VOICE', manifest.id || 'manifest', 'manifest', `MP3 assets are only allowed under assets/voice/ (got "${fPath}").`);
        }
      }
    }

    if (typeof manifest.pack_sha256 !== 'string' || !SHA256_RE.test(manifest.pack_sha256)) {
      addError('P-MEDIA', 'P-MEDIA-PACK-SHA256', manifest.id || 'manifest', 'manifest', 'manifest.pack_sha256 must be a valid 64-char hex SHA-256 digest.');
    }
  }

  // 2. Validate Strings & Locales
  const defaultLocale = (manifest && manifest.default_locale) || 'en-US';
  const localesAvailable = (manifest && Array.isArray(manifest.locales_available) && manifest.locales_available.length > 0)
    ? manifest.locales_available
    : [defaultLocale];

  const localesTable = (stringsObj && stringsObj.locales && typeof stringsObj.locales === 'object')
    ? stringsObj.locales
    : {};

  if (!stringsObj || stringsObj.record_type !== 'strings' || !stringsObj.locales) {
    addError('P-SCHEMA', 'P-SCHEMA-MISSING-STRINGS', 'strings', 'strings', 'Pack is missing a valid strings.json table.');
  } else {
    scanObjectForHardBans(stringsObj, 'strings', 'strings', addError);
  }

  const defaultLocaleStrings = localesTable[defaultLocale] || {};
  const allStringKeysSet = new Set(Object.keys(defaultLocaleStrings));
  for (const loc of Object.keys(localesTable)) {
    for (const k of Object.keys(localesTable[loc] || {})) {
      allStringKeysSet.add(k);
    }
  }

  // Partial locale check: every locale in locales_available must exist and have all string keys
  for (const loc of localesAvailable) {
    const table = localesTable[loc];
    if (!table || typeof table !== 'object') {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-PARTIAL-LOCALE-MISSING',
        `strings:${loc}`,
        'strings',
        `Locale "${loc}" is listed in manifest.locales_available but is missing from strings.json (no partial locale ships).`
      );
      continue;
    }
    const missingKeys = [];
    for (const key of allStringKeysSet) {
      if (typeof table[key] !== 'string' || table[key].trim() === '') {
        missingKeys.push(key);
      }
    }
    if (missingKeys.length > 0) {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-PARTIAL-LOCALE',
        `strings:${loc}`,
        'strings',
        `Locale "${loc}" in strings.json is incomplete and missing ${missingKeys.length} string key(s): ${missingKeys.join(', ')}. No partial locale may ship.`
      );
    }
  }

  // Scan all strings across all locales for P-COPY, P-COOP, P-NOFAIL, P-NOPII
  for (const [loc, table] of Object.entries(localesTable)) {
    if (!table || typeof table !== 'object') continue;
    for (const [sKey, sVal] of Object.entries(table)) {
      if (!STRING_REF_RE.test(sKey)) {
        addError('P-SCHEMA', 'P-SCHEMA-STRING-KEY-FORMAT', `strings:${loc}:${sKey}`, 'strings', `String key "${sKey}" must be dot-namespaced lowercase identifier.`);
      }
      if (typeof sVal !== 'string') continue;

      for (const tm of TRADEMARK_BLOCKLIST) {
        if (containsBannedPhrase(sVal, tm)) {
          addError(
            'P-COPY',
            'P-COPY-TRADEMARK',
            `strings:${loc}:${sKey}`,
            'strings',
            `String "${sKey}" (${loc}) contains blocklisted trademark/brand term "${tm}".`
          );
        }
      }

      for (const phrase of COOP_BANNED_SUBSTRINGS) {
        if (containsBannedPhrase(sVal, phrase)) {
          addError(
            'P-COOP',
            'P-COOP-BANNED-COPY',
            `strings:${loc}:${sKey}`,
            'strings',
            `String "${sKey}" (${loc}) contains banned competitive/timed phrase "${phrase}" in "${sVal}".`
          );
        }
      }

      for (const phrase of NOFAIL_BANNED_SUBSTRINGS) {
        if (containsBannedPhrase(sVal, phrase)) {
          addError(
            'P-NOFAIL',
            'P-NOFAIL-BANNED-COPY',
            `strings:${loc}:${sKey}`,
            'strings',
            `String "${sKey}" (${loc}) contains banned failure/judgement phrase "${phrase}".`
          );
        }
      }
    }
  }

  // Track references for P-REF (with referrer list on failure)
  const stringRefReferrers = new Map(); // string_ref -> Array<string>
  function requireStringRef(refValue, referrerLabel, recordId, recordType, fieldName) {
    if (typeof refValue !== 'string' || !STRING_REF_RE.test(refValue)) {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-INVALID-STRING-REF',
        recordId,
        recordType,
        `Field "${fieldName}" on "${recordId}" must be a dot-namespaced string_ref (got "${refValue}"). No free-text dialogue or labels allowed.`
      );
      return;
    }
    if (!stringRefReferrers.has(refValue)) {
      stringRefReferrers.set(refValue, []);
    }
    stringRefReferrers.get(refValue).push(`${recordType}:${recordId}.${fieldName}`);
  }

  if (manifest && typeof manifest === 'object') {
    requireStringRef(manifest.title_ref, 'manifest', manifest.id || 'manifest', 'manifest', 'title_ref');
    requireStringRef(manifest.summary_ref, 'manifest', manifest.id || 'manifest', 'manifest', 'summary_ref');
  }

  // Index maps for in-pack records
  const skillMap = new Map();
  const lessonMap = new Map();
  const songTemplateMap = new Map();
  const characterMap = new Map();
  const pictureSetMap = new Map();
  const pictureItemMap = new Map(); // item_id -> { item, pictureSetId }
  const missionMap = new Map();
  const routineMap = new Map();
  const timeConceptMap = new Map();
  const declaredDeps = new Set(manifest && Array.isArray(manifest.dependencies) ? manifest.dependencies : []);

  // 3. Validate Characters (P-ORIG, P-SCHEMA, P-MEDIA)
  for (const ch of characters) {
    const id = validateCommonRecordFields(ch, 'character', retiredSet, seenIdsByType, addError);
    characterMap.set(id, ch);

    if ('dialogue' in ch || 'free_text' in ch || 'bio' in ch) {
      addError('P-SCHEMA', 'P-SCHEMA-NO-FREE-TEXT', id, 'character', `Character "${id}" contains prohibited free-text field. Use personality_lines string_refs only.`);
    }
    if ('name' in ch && typeof ch.name === 'string') {
      addError('P-SCHEMA', 'P-SCHEMA-INLINE-NAME', id, 'character', `Character "${id}" uses inline "name" instead of "name_ref" in strings.json.`);
    }

    requireStringRef(ch.name_ref, 'character', id, 'character', 'name_ref');

    if (!Array.isArray(ch.personality_lines) || ch.personality_lines.length === 0) {
      addError('P-SCHEMA', 'P-SCHEMA-CHARACTER-LINES', id, 'character', `Character "${id}" must have at least 1 string_ref in personality_lines.`);
    } else {
      ch.personality_lines.forEach((lineRef, idx) => {
        requireStringRef(lineRef, 'character', id, 'character', `personality_lines[${idx}]`);
      });
    }

    // P-ORIG: originality attestation
    const att = ch.originality_attestation;
    if (!att || typeof att !== 'object') {
      addError('P-ORIG', 'P-ORIG-MISSING-ATTESTATION', id, 'character', `Character "${id}" is missing originality_attestation.`);
    } else {
      if (typeof att.attester !== 'string' || att.attester.trim().length === 0) {
        addError('P-ORIG', 'P-ORIG-ATTESTER', id, 'character', `Character "${id}" originality_attestation.attester is required.`);
      }
      if (typeof att.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(att.date)) {
        addError('P-ORIG', 'P-ORIG-DATE', id, 'character', `Character "${id}" originality_attestation.date must be YYYY-MM-DD.`);
      }
      if (typeof att.derivation_statement !== 'string' || att.derivation_statement.trim().length < 20) {
        addError(
          'P-ORIG',
          'P-ORIG-DERIVATION-LENGTH',
          id,
          'character',
          `Character "${id}" originality_attestation.derivation_statement must be at least 20 characters.`
        );
      } else {
        for (const tm of TRADEMARK_BLOCKLIST) {
          if (containsBannedPhrase(att.derivation_statement, tm)) {
            addError('P-ORIG', 'P-ORIG-TRADEMARK', id, 'character', `Character "${id}" derivation_statement mentions blocklisted trademark "${tm}".`);
          }
        }
      }
    }

    if (typeof ch.model_asset_path !== 'string' || !ASSET_EXT_RE.test(ch.model_asset_path)) {
      addError('P-MEDIA', 'P-MEDIA-ASSET-EXT', id, 'character', `Character "${id}" model_asset_path "${ch.model_asset_path}" must use an allowed extension (.svg, .png, .webp).`);
    } else {
      checkAssetIntegrity(ch.model_asset_path, null, id, 'character', manifest, assetsMap, addError);
    }
  }

  // 4. Validate Picture Sets (P-SAFE, P-MEDIA, P-SCHEMA)
  for (const ps of pictureSets) {
    const id = validateCommonRecordFields(ps, 'picture_set', retiredSet, seenIdsByType, addError);
    pictureSetMap.set(id, ps);

    requireStringRef(ps.title_ref, 'picture_set', id, 'picture_set', 'title_ref');
    requireStringRef(ps.alt_text_parent_ref, 'picture_set', id, 'picture_set', 'alt_text_parent_ref');

    if (!Array.isArray(ps.depiction_tags)) {
      addError('P-SAFE', 'P-SAFE-DEPICTION-TAGS', id, 'picture_set', `Picture set "${id}" must declare depiction_tags array.`);
    }

    if (!Array.isArray(ps.items) || ps.items.length === 0) {
      addError('P-SCHEMA', 'P-SCHEMA-PICTURE-ITEMS', id, 'picture_set', `Picture set "${id}" must contain at least 1 item.`);
    } else {
      for (const item of ps.items) {
        if (!item || typeof item.item_id !== 'string' || !SLUG_RE.test(item.item_id)) {
          addError('P-SCHEMA', 'P-SCHEMA-ITEM-ID', id, 'picture_set', `Picture set "${id}" has an item with an invalid item_id.`);
          continue;
        }
        pictureItemMap.set(item.item_id, { item, pictureSetId: id, pictureSet: ps });
        requireStringRef(item.label_ref, 'picture_set', id, 'picture_set', `items[${item.item_id}].label_ref`);
        requireStringRef(item.alt_text_parent_ref, 'picture_set', id, 'picture_set', `items[${item.item_id}].alt_text_parent_ref`);

        if (typeof item.asset_path !== 'string' || !ASSET_EXT_RE.test(item.asset_path)) {
          addError('P-MEDIA', 'P-MEDIA-ITEM-EXT', id, 'picture_set', `Picture item "${item.item_id}" in "${id}" has disallowed asset extension "${item.asset_path}".`);
        } else {
          checkAssetIntegrity(item.asset_path, item.asset_sha256, id, 'picture_set', manifest, assetsMap, addError);
        }

        if (typeof item.passes_choke_tube_proxy !== 'boolean') {
          addError('P-SAFE', 'P-SAFE-CHOKE-PROXY-MISSING', id, 'picture_set', `Picture item "${item.item_id}" must specify boolean passes_choke_tube_proxy.`);
        }
        if (!['handheld_safe', 'large_household', 'small_blocked'].includes(item.size_class)) {
          addError('P-SAFE', 'P-SAFE-SIZE-CLASS', id, 'picture_set', `Picture item "${item.item_id}" has invalid size_class "${item.size_class}".`);
        }
      }
    }
  }

  // 5. Validate Skills & Graph (P-SCHEMA, P-REF, P-AGE)
  for (const sk of skills) {
    const id = validateCommonRecordFields(sk, 'skill', retiredSet, seenIdsByType, addError);
    skillMap.set(id, sk);

    requireStringRef(sk.title_ref, 'skill', id, 'skill', 'title_ref');
    requireStringRef(sk.description_ref, 'skill', id, 'skill', 'description_ref');

    if (typeof sk.evidence_needed_to_advance !== 'number' || sk.evidence_needed_to_advance < 3) {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-SKILL-EVIDENCE-FLOOR',
        id,
        'skill',
        `Skill "${id}" has evidence_needed_to_advance=${sk.evidence_needed_to_advance}; minimum floor is 3 qualifying events.`
      );
    }

    if (!['2-3', '3-4', '4-5'].includes(sk.age_band_min)) {
      addError('P-AGE', 'P-AGE-SKILL-MIN', id, 'skill', `Skill "${id}" has invalid age_band_min "${sk.age_band_min}".`);
    } else if (AGE_BAND_MIN_ORDER[sk.age_band] && sk.age_band !== '2-5' && AGE_BAND_MIN_ORDER[sk.age_band] < AGE_BAND_MIN_ORDER[sk.age_band_min]) {
      addError('P-AGE', 'P-AGE-SKILL-LADDER', id, 'skill', `Skill "${id}" age_band "${sk.age_band}" is younger than its age_band_min "${sk.age_band_min}".`);
    }
  }

  // Skill reference resolution, cycle detection, reachability, and catch_up_variant_of chains
  const skillReferrers = new Map();
  function recordRef(map, targetId, referrer) {
    if (!map.has(targetId)) map.set(targetId, []);
    map.get(targetId).push(referrer);
  }

  for (const sk of skills) {
    const id = sk.id;
    const prereqs = Array.isArray(sk.prerequisites) ? sk.prerequisites : [];
    const nexts = Array.isArray(sk.next_skills) ? sk.next_skills : [];

    for (const pId of prereqs) {
      recordRef(skillReferrers, pId, `skill:${id}.prerequisites`);
    }
    for (const nId of nexts) {
      recordRef(skillReferrers, nId, `skill:${id}.next_skills`);
    }
    if (sk.catch_up_variant_of) {
      recordRef(skillReferrers, sk.catch_up_variant_of, `skill:${id}.catch_up_variant_of`);
      const targetSkill = skillMap.get(sk.catch_up_variant_of);
      if (targetSkill && targetSkill.catch_up_variant_of) {
        addError(
          'P-SCHEMA',
          'P-SCHEMA-CATCHUP-CHAIN',
          id,
          'skill',
          `Skill "${id}" is a catch_up_variant_of "${sk.catch_up_variant_of}", which itself is a catch_up_variant_of "${targetSkill.catch_up_variant_of}". Catch-up variant chains are prohibited.`
        );
      }
    }
  }

  // Detect cycles in skill prerequisites graph
  const visitState = new Map(); // 0 = unvisited, 1 = visiting, 2 = visited
  const cycleReported = new Set();

  function dfsSkillCycle(skillId, stack) {
    visitState.set(skillId, 1);
    const sk = skillMap.get(skillId);
    const prereqs = sk && Array.isArray(sk.prerequisites) ? sk.prerequisites : [];
    for (const pId of prereqs) {
      if (!skillMap.has(pId)) continue;
      const state = visitState.get(pId) || 0;
      if (state === 1) {
        const cyclePath = [...stack, pId].join(' -> ');
        if (!cycleReported.has(skillId)) {
          cycleReported.add(skillId);
          addError(
            'P-SCHEMA',
            'P-SCHEMA-SKILL-CYCLE',
            skillId,
            'skill',
            `Skill prerequisite graph contains a cycle: ${cyclePath}. Skill graph must be acyclic (DAG).`
          );
        }
      } else if (state === 0) {
        dfsSkillCycle(pId, [...stack, pId]);
      }
    }
    visitState.set(skillId, 2);
  }

  for (const sk of skills) {
    if ((visitState.get(sk.id) || 0) === 0) {
      dfsSkillCycle(sk.id, [sk.id]);
    }
  }

  // Reachability from entry skills
  const entrySkills = skills.filter((s) => s.is_entry_skill === true);
  if (skills.length > 0 && entrySkills.length === 0) {
    addError('P-SCHEMA', 'P-SCHEMA-NO-ENTRY-SKILL', 'skills', 'skill', 'Pack must define at least one entry skill (is_entry_skill: true).');
  } else if (skills.length > 0) {
    const reachable = new Set();
    const queue = entrySkills.map((s) => s.id);
    while (queue.length > 0) {
      const curr = queue.shift();
      if (reachable.has(curr)) continue;
      reachable.add(curr);
      const currSkill = skillMap.get(curr);
      if (currSkill && Array.isArray(currSkill.next_skills)) {
        for (const nxt of currSkill.next_skills) {
          if (skillMap.has(nxt) && !reachable.has(nxt)) queue.push(nxt);
        }
      }
      // Also traverse reverse prerequisites (any skill that lists `curr` as a prerequisite is reachable from `curr`)
      for (const candidate of skills) {
        if (Array.isArray(candidate.prerequisites) && candidate.prerequisites.includes(curr) && !reachable.has(candidate.id)) {
          queue.push(candidate.id);
        }
      }
    }

    for (const sk of skills) {
      if (!sk.is_entry_skill && !reachable.has(sk.id)) {
        addError(
          'P-SCHEMA',
          'P-SCHEMA-SKILL-UNREACHABLE',
          sk.id,
          'skill',
          `Skill "${sk.id}" is not an entry skill and is not reachable from any entry skill.`
        );
      }
    }
  }

  // 6. Validate Song Templates & Saved Songs
  for (const st of songTemplates) {
    const id = validateCommonRecordFields(st, 'song_template', retiredSet, seenIdsByType, addError);
    songTemplateMap.set(id, st);

    requireStringRef(st.title_ref, 'song_template', id, 'song_template', 'title_ref');
    requireStringRef(st.lesson_word_ref, 'song_template', id, 'song_template', 'lesson_word_ref');

    if (typeof st.note_slots_total !== 'number' || st.note_slots_total < 6 || st.note_slots_total > 12) {
      addError('P-SCHEMA', 'P-SCHEMA-SONG-SLOTS-TOTAL', id, 'song_template', `Song template "${id}" note_slots_total must be between 6 and 12 (got ${st.note_slots_total}).`);
    }
    if (typeof st.child_slots !== 'number' || st.child_slots < 3 || st.child_slots > 4) {
      addError('P-SCHEMA', 'P-SCHEMA-SONG-CHILD-SLOTS', id, 'song_template', `Song template "${id}" child_slots must be 3 or 4 (got ${st.child_slots}).`);
    }
    if (typeof st.tempo !== 'number' || st.tempo < 60 || st.tempo > 120) {
      addError('P-SCHEMA', 'P-SCHEMA-SONG-TEMPO', id, 'song_template', `Song template "${id}" tempo must be between 60 and 120 BPM (got ${st.tempo}).`);
    }
    if (st.wordlists && typeof st.wordlists === 'object') {
      const adj = Array.isArray(st.wordlists.adjective_refs) ? st.wordlists.adjective_refs : [];
      const nouns = Array.isArray(st.wordlists.noun_refs) ? st.wordlists.noun_refs : [];
      adj.forEach((r, idx) => requireStringRef(r, 'song_template', id, 'song_template', `wordlists.adjective_refs[${idx}]`));
      nouns.forEach((r, idx) => requireStringRef(r, 'song_template', id, 'song_template', `wordlists.noun_refs[${idx}]`));
    } else {
      addError('P-SCHEMA', 'P-SCHEMA-SONG-WORDLISTS', id, 'song_template', `Song template "${id}" is missing wordlists.{adjective_refs, noun_refs}.`);
    }
  }

  for (const ss of savedSongs) {
    const id = validateCommonRecordFields(ss, 'saved_song', retiredSet, seenIdsByType, addError);
    if ('title' in ss || 'custom_name' in ss || 'child_name' in ss || 'voice_uri' in ss || 'photo_uri' in ss) {
      addError('P-NOPII', 'P-NOPII-SAVED-SONG', id, 'saved_song', `Saved song "${id}" contains prohibited free-text name, voice, or photo data.`);
    }
    if (!songTemplateMap.has(ss.song_template_id) && !declaredDeps.has(ss.song_template_id)) {
      addError(
        'P-REF',
        'P-REF-SAVED-SONG-TEMPLATE',
        id,
        'saved_song',
        `Saved song "${id}" references non-existent song_template_id "${ss.song_template_id}".`,
        { referrers: [`saved_song:${id}.song_template_id`] }
      );
    }
  }

  // 7. Validate Missions (P-UNIV, P-SAFE, P-COOP, P-GATE, P-REF)
  const missionReferrers = new Map();
  for (const ms of missions) {
    const id = validateCommonRecordFields(ms, 'mission', retiredSet, seenIdsByType, addError);
    missionMap.set(id, ms);

    requireStringRef(ms.title_ref, 'mission', id, 'mission', 'title_ref');
    requireStringRef(ms.parent_script_ref, 'mission', id, 'mission', 'parent_script_ref');
    requireStringRef(ms.child_prompt_ref, 'mission', id, 'mission', 'child_prompt_ref');
    requireStringRef(ms.team_goal_ref, 'mission', id, 'mission', 'team_goal_ref');
    requireStringRef(ms.return_ritual_ref, 'mission', id, 'mission', 'return_ritual_ref');

    recordRef(skillReferrers, ms.skill_id, `mission:${id}.skill_id`);

    // Check child_prompt_ref word count <= 20 words
    const childPromptText = defaultLocaleStrings[ms.child_prompt_ref];
    if (typeof childPromptText === 'string') {
      const wordCount = childPromptText.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > 20) {
        addError(
          'P-SCHEMA',
          'P-SCHEMA-MISSION-PROMPT-WORDS',
          id,
          'mission',
          `Mission "${id}" child_prompt_ref ("${ms.child_prompt_ref}") resolves to ${wordCount} words; maximum allowed is 20 words.`
        );
      }
    }

    // Check return_ritual_ref for no proof/judgement language
    const returnRitualText = defaultLocaleStrings[ms.return_ritual_ref];
    if (typeof returnRitualText === 'string') {
      for (const banned of RETURN_RITUAL_BANNED_SUBSTRINGS) {
        if (containsBannedPhrase(returnRitualText, banned)) {
          addError(
            'P-NOFAIL',
            'P-NOFAIL-RETURN-RITUAL-JUDGEMENT',
            id,
            'mission',
            `Mission "${id}" return_ritual_ref contains prohibited proof/judgement phrase "${banned}".`
          );
        }
      }
    }

    // P-COOP requirements on mission
    if (ms.cooperative_only !== true) {
      addError('P-COOP', 'P-COOP-FLAG-REQUIRED', id, 'mission', `Mission "${id}" must set cooperative_only: true.`);
    }
    if (!ms.team_goal_ref || typeof ms.team_goal_ref !== 'string') {
      addError('P-COOP', 'P-COOP-TEAM-GOAL-REQUIRED', id, 'mission', `Mission "${id}" must include a team_goal_ref string reference.`);
    }
    if (!ms.song_id && !ms.song_fallback_rule) {
      addError('P-COOP', 'P-COOP-SONG-REQUIRED', id, 'mission', `Mission "${id}" must specify song_id or song_fallback_rule.`);
    }
    if (ms.song_id && !songTemplateMap.has(ms.song_id) && !declaredDeps.has(ms.song_id)) {
      addError(
        'P-REF',
        'P-REF-MISSION-SONG',
        id,
        'mission',
        `Mission "${id}" references non-existent song_id "${ms.song_id}".`,
        { referrers: [`mission:${id}.song_id`] }
      );
    }

    // P-GATE & parent_precheck
    if (ms.parent_gate_required !== true) {
      addError('P-GATE', 'P-GATE-MISSION-FLAG', id, 'mission', `Mission "${id}" must have parent_gate_required: true.`);
    }
    if (!ms.parent_precheck || ms.parent_precheck.required !== true) {
      addError('P-SAFE', 'P-SAFE-MISSION-PRECHECK', id, 'mission', `Mission "${id}" requires parent_precheck with required: true.`);
    } else {
      requireStringRef(ms.parent_precheck.prompt_ref, 'mission', id, 'mission', 'parent_precheck.prompt_ref');
    }

    if (typeof ms.estimated_minutes !== 'number' || ms.estimated_minutes < 1 || ms.estimated_minutes > 5) {
      addError('P-SCHEMA', 'P-SCHEMA-MISSION-MINUTES', id, 'mission', `Mission "${id}" estimated_minutes must be 1–5 (got ${ms.estimated_minutes}).`);
    }

    if (!Array.isArray(ms.safety_notes_refs) || ms.safety_notes_refs.length < 1) {
      addError('P-SAFE', 'P-SAFE-MISSION-SAFETY-NOTES', id, 'mission', `Mission "${id}" must include at least 1 safety note in safety_notes_refs.`);
    } else {
      ms.safety_notes_refs.forEach((sRef, idx) => requireStringRef(sRef, 'mission', id, 'mission', `safety_notes_refs[${idx}]`));
    }

    validateMissionOrRoutineObjects(ms.objects, id, 'mission', pictureItemMap, requireStringRef, addError);
  }

  // 8. Validate Routines (closed anchor enum, at most 1 per time_of_day per pack, P-UNIV, P-SAFE, P-COOP)
  const seenTimeOfDay = new Map();
  for (const rt of routines) {
    const id = validateCommonRecordFields(rt, 'routine', retiredSet, seenIdsByType, addError);
    routineMap.set(id, rt);

    requireStringRef(rt.title_ref, 'routine', id, 'routine', 'title_ref');
    requireStringRef(rt.parent_script_ref, 'routine', id, 'routine', 'parent_script_ref');
    requireStringRef(rt.child_prompt_ref, 'routine', id, 'routine', 'child_prompt_ref');
    requireStringRef(rt.team_goal_ref, 'routine', id, 'routine', 'team_goal_ref');
    requireStringRef(rt.return_ritual_ref, 'routine', id, 'routine', 'return_ritual_ref');

    recordRef(skillReferrers, rt.skill_id, `routine:${id}.skill_id`);

    if (!ALLOWED_ROUTINE_ANCHORS.has(rt.anchor)) {
      addError('P-SCHEMA', 'P-SCHEMA-ROUTINE-ANCHOR', id, 'routine', `Routine "${id}" has invalid anchor "${rt.anchor}".`);
    }
    if (!ALLOWED_TIMES_OF_DAY.has(rt.time_of_day)) {
      addError('P-SCHEMA', 'P-SCHEMA-ROUTINE-TIME', id, 'routine', `Routine "${id}" has invalid time_of_day "${rt.time_of_day}".`);
    } else {
      if (seenTimeOfDay.has(rt.time_of_day)) {
        const prevId = seenTimeOfDay.get(rt.time_of_day);
        addError(
          'P-SCHEMA',
          'P-SCHEMA-ROUTINE-TIME-LIMIT',
          id,
          'routine',
          `Routine "${id}" duplicates time_of_day "${rt.time_of_day}" (already used by "${prevId}"). At most one daily anchor per time_of_day per pack is allowed.`
        );
      } else {
        seenTimeOfDay.set(rt.time_of_day, id);
      }
    }

    if (rt.cooperative_only !== true) {
      addError('P-COOP', 'P-COOP-ROUTINE-FLAG', id, 'routine', `Routine "${id}" must set cooperative_only: true.`);
    }
    if (!rt.song_id && !rt.song_fallback_rule) {
      addError('P-COOP', 'P-COOP-ROUTINE-SONG', id, 'routine', `Routine "${id}" must specify song_id or song_fallback_rule.`);
    }
    if (!Array.isArray(rt.safety_notes_refs) || rt.safety_notes_refs.length < 1) {
      addError('P-SAFE', 'P-SAFE-ROUTINE-NOTES', id, 'routine', `Routine "${id}" must include at least 1 safety note.`);
    } else {
      rt.safety_notes_refs.forEach((sRef, idx) => requireStringRef(sRef, 'routine', id, 'routine', `safety_notes_refs[${idx}]`));
    }

    validateMissionOrRoutineObjects(rt.objects, id, 'routine', pictureItemMap, requireStringRef, addError);
  }

  // 9. Validate Time Concepts (P-AGE fixed age ladder, forbidden concepts)
  for (const tc of timeConcepts) {
    const id = validateCommonRecordFields(tc, 'time_concept', retiredSet, seenIdsByType, addError);
    timeConceptMap.set(id, tc);

    requireStringRef(tc.title_ref, 'time_concept', id, 'time_concept', 'title_ref');
    requireStringRef(tc.prompt_ref, 'time_concept', id, 'time_concept', 'prompt_ref');

    if (FORBIDDEN_TIME_CONCEPTS.includes(tc.concept_key) || !(tc.concept_key in TIME_CONCEPT_LADDER)) {
      addError(
        'P-AGE',
        'P-AGE-FORBIDDEN-TIME-CONCEPT',
        id,
        'time_concept',
        `Time concept "${id}" uses unsupported or prohibited concept_key "${tc.concept_key}". Clock-minute, month-order, and abstract-duration concepts cannot be authored.`
      );
    } else {
      const requiredBand = TIME_CONCEPT_LADDER[tc.concept_key];
      if (tc.age_band !== requiredBand) {
        addError(
          'P-AGE',
          'P-AGE-TIME-CONCEPT-LADDER',
          id,
          'time_concept',
          `Time concept "${id}" ("${tc.concept_key}") has age_band "${tc.age_band}", but the fixed age ladder requires "${requiredBand}".`
        );
      }
    }

    if (!pictureSetMap.has(tc.picture_set_id) && !declaredDeps.has(tc.picture_set_id)) {
      addError(
        'P-REF',
        'P-REF-TIME-CONCEPT-PICTURE',
        id,
        'time_concept',
        `Time concept "${id}" references non-existent picture_set_id "${tc.picture_set_id}".`,
        { referrers: [`time_concept:${id}.picture_set_id`] }
      );
    }
  }

  // 10. Validate Lessons (P-SCHEMA, P-REF, P-NOFAIL)
  const characterReferrers = new Map();
  const pictureSetReferrers = new Map();
  const lessonFallbackReferrers = new Map();

  for (const ls of lessons) {
    const id = validateCommonRecordFields(ls, 'lesson', retiredSet, seenIdsByType, addError);
    lessonMap.set(id, ls);

    requireStringRef(ls.title_ref, 'lesson', id, 'lesson', 'title_ref');
    requireStringRef(ls.closing_win_ref, 'lesson', id, 'lesson', 'closing_win_ref');

    if (typeof ls.primary_skill_id !== 'string' || !SLUG_RE.test(ls.primary_skill_id)) {
      addError('P-SCHEMA', 'P-SCHEMA-LESSON-PRIMARY-SKILL', id, 'lesson', `Lesson "${id}" must have exactly 1 primary_skill_id.`);
    } else {
      recordRef(skillReferrers, ls.primary_skill_id, `lesson:${id}.primary_skill_id`);
    }

    if (!Array.isArray(ls.secondary_skill_ids) || ls.secondary_skill_ids.length > 2) {
      addError('P-SCHEMA', 'P-SCHEMA-LESSON-SECONDARY-SKILLS', id, 'lesson', `Lesson "${id}" may have at most 2 secondary_skill_ids.`);
    } else {
      ls.secondary_skill_ids.forEach((secId, idx) => {
        recordRef(skillReferrers, secId, `lesson:${id}.secondary_skill_ids[${idx}]`);
      });
    }

    if (!ALLOWED_INTERACTION_TYPES.has(ls.interaction_type)) {
      addError('P-SCHEMA', 'P-SCHEMA-LESSON-INTERACTION', id, 'lesson', `Lesson "${id}" has invalid interaction_type "${ls.interaction_type}".`);
    }

    recordRef(characterReferrers, ls.character_id, `lesson:${id}.character_id`);
    recordRef(pictureSetReferrers, ls.picture_set_id, `lesson:${id}.picture_set_id`);

    if (ls.mission_id && ls.routine_id) {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-LESSON-MISSION-OR-ROUTINE',
        id,
        'lesson',
        `Lesson "${id}" specifies both mission_id ("${ls.mission_id}") and routine_id ("${ls.routine_id}"). At most one is allowed.`
      );
    }
    if (ls.mission_id) {
      recordRef(missionReferrers, ls.mission_id, `lesson:${id}.mission_id`);
    }
    if (ls.routine_id && !routineMap.has(ls.routine_id) && !declaredDeps.has(ls.routine_id)) {
      addError(
        'P-REF',
        'P-REF-LESSON-ROUTINE',
        id,
        'lesson',
        `Lesson "${id}" references non-existent routine_id "${ls.routine_id}".`,
        { referrers: [`lesson:${id}.routine_id`] }
      );
    }
    if (ls.song_template_id && !songTemplateMap.has(ls.song_template_id) && !declaredDeps.has(ls.song_template_id)) {
      addError(
        'P-REF',
        'P-REF-LESSON-SONG-TEMPLATE',
        id,
        'lesson',
        `Lesson "${id}" references non-existent song_template_id "${ls.song_template_id}".`,
        { referrers: [`lesson:${id}.song_template_id`] }
      );
    }

    if (typeof ls.estimated_minutes !== 'number' || typeof ls.chunk_budget_minutes !== 'number' || ls.estimated_minutes > ls.chunk_budget_minutes) {
      addError(
        'P-SCHEMA',
        'P-SCHEMA-LESSON-CHUNK-BUDGET',
        id,
        'lesson',
        `Lesson "${id}" estimated_minutes (${ls.estimated_minutes}) exceeds chunk_budget_minutes (${ls.chunk_budget_minutes}).`
      );
    }

    if (!ls.fallback_lesson_id || typeof ls.fallback_lesson_id !== 'string') {
      addError('P-SCHEMA', 'P-SCHEMA-LESSON-FALLBACK-ID', id, 'lesson', `Lesson "${id}" is missing required fallback_lesson_id.`);
    } else {
      recordRef(lessonFallbackReferrers, ls.fallback_lesson_id, `lesson:${id}.fallback_lesson_id`);
    }

    if (!ls.fallback_picture_id || typeof ls.fallback_picture_id !== 'string') {
      addError('P-SCHEMA', 'P-SCHEMA-LESSON-FALLBACK-PIC', id, 'lesson', `Lesson "${id}" is missing required fallback_picture_id.`);
    } else {
      recordRef(pictureSetReferrers, ls.fallback_picture_id, `lesson:${id}.fallback_picture_id`);
    }

    // Steps 1-8
    if (!Array.isArray(ls.steps) || ls.steps.length < 1 || ls.steps.length > 8) {
      addError('P-SCHEMA', 'P-SCHEMA-LESSON-STEPS-COUNT', id, 'lesson', `Lesson "${id}" must have between 1 and 8 steps.`);
    } else {
      ls.steps.forEach((st, idx) => {
        requireStringRef(st.prompt_ref, 'lesson', id, 'lesson', `steps[${idx}].prompt_ref`);
        requireStringRef(st.celebration_ref, 'lesson', id, 'lesson', `steps[${idx}].celebration_ref`);
        if (!pictureItemMap.has(st.target_item_id)) {
          addError(
            'P-REF',
            'P-REF-STEP-TARGET-ITEM',
            id,
            'lesson',
            `Lesson "${id}" step ${idx + 1} target_item_id "${st.target_item_id}" does not resolve to any item in picture_sets.`,
            { referrers: [`lesson:${id}.steps[${idx}].target_item_id`] }
          );
        }
        if (!Array.isArray(st.choice_item_ids) || !st.choice_item_ids.includes(st.target_item_id)) {
          addError('P-SCHEMA', 'P-SCHEMA-STEP-CHOICES', id, 'lesson', `Lesson "${id}" step ${idx + 1} choice_item_ids must include target_item_id "${st.target_item_id}".`);
        } else {
          st.choice_item_ids.forEach((cid, cIdx) => {
            if (!pictureItemMap.has(cid)) {
              addError(
                'P-REF',
                'P-REF-STEP-CHOICE-ITEM',
                id,
                'lesson',
                `Lesson "${id}" step ${idx + 1} choice_item_ids[${cIdx}] "${cid}" does not resolve to any item in picture_sets.`,
                { referrers: [`lesson:${id}.steps[${idx}].choice_item_ids[${cIdx}]`] }
              );
            }
          });
        }
      });
    }

    // Scaffolds 0-3 all required
    const expectedModes = {
      '0': 'full_task',
      '1': 'fewer_choices',
      '2': 'highlight_and_model',
      '3': 'do_together_final_tap'
    };
    if (!ls.scaffolds || typeof ls.scaffolds !== 'object') {
      addError('P-SCHEMA', 'P-SCHEMA-LESSON-SCAFFOLDS', id, 'lesson', `Lesson "${id}" is missing required scaffolds object.`);
    } else {
      for (const lvl of ['0', '1', '2', '3']) {
        const sc = ls.scaffolds[lvl];
        if (!sc || typeof sc !== 'object') {
          addError('P-SCHEMA', 'P-SCHEMA-SCAFFOLD-LEVEL-MISSING', id, 'lesson', `Lesson "${id}" is missing required scaffold level ${lvl}.`);
          continue;
        }
        requireStringRef(sc.prompt_ref, 'lesson', id, 'lesson', `scaffolds.${lvl}.prompt_ref`);
        if (sc.mode !== expectedModes[lvl]) {
          addError('P-SCHEMA', 'P-SCHEMA-SCAFFOLD-MODE', id, 'lesson', `Lesson "${id}" scaffold level ${lvl} must have mode "${expectedModes[lvl]}" (got "${sc.mode}").`);
        }
        if (sc.child_final_tap_required !== true) {
          addError('P-NOFAIL', 'P-NOFAIL-FINAL-TAP', id, 'lesson', `Lesson "${id}" scaffold level ${lvl} must set child_final_tap_required: true so the child always makes the final tap.`);
        }
      }
    }
  }

  // 11. Evaluate all collected references (P-REF) — any dangling reference fails the whole pack with the referrer list
  for (const [targetSkillId, referrers] of skillReferrers.entries()) {
    const sk = skillMap.get(targetSkillId);
    if (!sk && !declaredDeps.has(targetSkillId)) {
      addError(
        'P-REF',
        'P-REF-DANGLING-SKILL',
        targetSkillId,
        'skill',
        `Dangling skill reference "${targetSkillId}" does not resolve to any record in-pack or declared dependency. Referrers: ${referrers.join(', ')}.`,
        { referrers }
      );
    }
  }

  for (const [targetCharId, referrers] of characterReferrers.entries()) {
    if (!characterMap.has(targetCharId) && !declaredDeps.has(targetCharId)) {
      addError(
        'P-REF',
        'P-REF-DANGLING-CHARACTER',
        targetCharId,
        'character',
        `Dangling character reference "${targetCharId}" does not resolve. Referrers: ${referrers.join(', ')}.`,
        { referrers }
      );
    }
  }

  for (const [targetPicSetId, referrers] of pictureSetReferrers.entries()) {
    if (!pictureSetMap.has(targetPicSetId) && !declaredDeps.has(targetPicSetId)) {
      addError(
        'P-REF',
        'P-REF-DANGLING-PICTURE-SET',
        targetPicSetId,
        'picture_set',
        `Dangling picture_set reference "${targetPicSetId}" does not resolve. Referrers: ${referrers.join(', ')}.`,
        { referrers }
      );
    }
  }

  for (const [targetLessonId, referrers] of lessonFallbackReferrers.entries()) {
    if (!lessonMap.has(targetLessonId) && !declaredDeps.has(targetLessonId)) {
      addError(
        'P-REF',
        'P-REF-DANGLING-FALLBACK-LESSON',
        targetLessonId,
        'lesson',
        `Dangling fallback_lesson_id "${targetLessonId}" does not resolve. Referrers: ${referrers.join(', ')}.`,
        { referrers }
      );
    }
  }

  for (const [targetMissionId, referrers] of missionReferrers.entries()) {
    if (!missionMap.has(targetMissionId) && !declaredDeps.has(targetMissionId)) {
      addError(
        'P-REF',
        'P-REF-DANGLING-MISSION',
        targetMissionId,
        'mission',
        `Dangling mission_id "${targetMissionId}" does not resolve. Referrers: ${referrers.join(', ')}.`,
        { referrers }
      );
    }
  }

  for (const [sRef, referrers] of stringRefReferrers.entries()) {
    if (typeof defaultLocaleStrings[sRef] !== 'string' || defaultLocaleStrings[sRef].trim() === '') {
      addError(
        'P-REF',
        'P-REF-DANGLING-STRING',
        sRef,
        'strings',
        `Dangling string_ref "${sRef}" does not resolve in default locale "${defaultLocale}". Referrers: ${referrers.join(', ')}.`,
        { referrers }
      );
    }
  }

  return buildResult(errors, familyCounts);
}

function validateMissionOrRoutineObjects(objects, recordId, recordType, pictureItemMap, requireStringRef, addError) {
  if (!Array.isArray(objects) || objects.length < 1 || objects.length > 3) {
    addError(
      'P-UNIV',
      'P-UNIV-OBJECT-COUNT',
      recordId,
      recordType,
      `${recordType} "${recordId}" must specify 1 to 3 objects (got ${Array.isArray(objects) ? objects.length : 0}).`
    );
    return;
  }

  objects.forEach((obj, idx) => {
    if (!obj || typeof obj !== 'object') {
      addError('P-UNIV', 'P-UNIV-INVALID-OBJECT', recordId, recordType, `${recordType} "${recordId}" object[${idx}] is invalid.`);
      return;
    }

    requireStringRef(obj.label_ref, recordType, recordId, recordType, `objects[${idx}].label_ref`);

    // Must ALWAYS have alternative_object_id + alternative_picture_ref + fallback_body_action_id + fallback_body_picture_ref
    if (
      typeof obj.alternative_object_id !== 'string' ||
      !SLUG_RE.test(obj.alternative_object_id) ||
      typeof obj.alternative_picture_ref !== 'string' ||
      !SLUG_RE.test(obj.alternative_picture_ref)
    ) {
      addError(
        'P-UNIV',
        'P-UNIV-MISSING-ALTERNATIVE',
        recordId,
        recordType,
        `${recordType} "${recordId}" object[${idx}] ("${obj.object_id || 'unknown'}") is missing required alternative_object_id or alternative_picture_ref. Every mission/routine object must have a complete alternative chain.`
      );
    }

    if (
      typeof obj.fallback_body_action_id !== 'string' ||
      !SLUG_RE.test(obj.fallback_body_action_id) ||
      typeof obj.fallback_body_picture_ref !== 'string' ||
      !SLUG_RE.test(obj.fallback_body_picture_ref)
    ) {
      addError(
        'P-UNIV',
        'P-UNIV-MISSING-BODY-FALLBACK',
        recordId,
        recordType,
        `${recordType} "${recordId}" object[${idx}] ("${obj.object_id || 'unknown'}") is missing Level-3 zero-object fallback_body_action_id or fallback_body_picture_ref.`
      );
    }

    // Check that object_id, alternative_object_id, and fallback_body_action_id resolve to safe picture items
    const refsToCheck = [
      { role: 'primary_object', itemId: obj.object_id, picId: obj.picture_ref },
      { role: 'alternative_object', itemId: obj.alternative_object_id, picId: obj.alternative_picture_ref },
      { role: 'fallback_body_action', itemId: obj.fallback_body_action_id, picId: obj.fallback_body_picture_ref }
    ];

    for (const ref of refsToCheck) {
      if (!ref.itemId || !SLUG_RE.test(ref.itemId)) continue;
      const found = pictureItemMap.get(ref.itemId);
      if (!found) {
        addError(
          'P-REF',
          'P-REF-MISSION-OBJECT-ITEM',
          recordId,
          recordType,
          `${recordType} "${recordId}" object[${idx}] (${ref.role} "${ref.itemId}") does not resolve to any item in picture_sets.`,
          { referrers: [`${recordType}:${recordId}.objects[${idx}].${ref.role}`] }
        );
        continue;
      }

      const item = found.item;
      const ps = found.pictureSet;
      const combinedTags = [
        ...(Array.isArray(item.depiction_tags) ? item.depiction_tags : []),
        ...(ps && Array.isArray(ps.depiction_tags) ? ps.depiction_tags : [])
      ];

      for (const tag of combinedTags) {
        if (SAFETY_BLOCKED_DEPICTION_TAGS.has(tag)) {
          addError(
            'P-SAFE',
            'P-SAFE-BLOCKED-DEPICTION-TAG',
            recordId,
            recordType,
            `${recordType} "${recordId}" uses item "${ref.itemId}" which has safety-blocked depiction tag "${tag}". Items tagged small_object, sharp, hot, or requires_stairs may never be used in a mission or routine.`
          );
        }
      }

      if (item.passes_choke_tube_proxy !== true || item.size_class === 'small_blocked') {
        addError(
          'P-SAFE',
          'P-SAFE-CHOKE-TUBE-BLOCKED',
          recordId,
          recordType,
          `${recordType} "${recordId}" uses item "${ref.itemId}" which fails choke-tube proxy or size_class safety check.`
        );
      }
    }
  });
}

function checkAssetIntegrity(assetPath, itemSha256, recordId, recordType, manifest, assetsMap, addError) {
  const manifestHashes = (manifest && manifest.file_hashes && typeof manifest.file_hashes === 'object')
    ? manifest.file_hashes
    : {};

  const expectedHash = itemSha256 || manifestHashes[assetPath];
  if (!expectedHash || !SHA256_RE.test(expectedHash)) {
    addError(
      'P-MEDIA',
      'P-MEDIA-MISSING-HASH',
      recordId,
      recordType,
      `Asset "${assetPath}" referenced by "${recordId}" is missing a valid SHA-256 entry in manifest.file_hashes.`
    );
    return;
  }

  if (manifestHashes[assetPath] && itemSha256 && manifestHashes[assetPath] !== itemSha256) {
    addError(
      'P-MEDIA',
      'P-MEDIA-HASH-MISMATCH-MANIFEST',
      recordId,
      recordType,
      `Asset "${assetPath}" SHA-256 on record "${recordId}" (${itemSha256}) does not match manifest.file_hashes (${manifestHashes[assetPath]}).`
    );
  }

  if (assetsMap) {
    if (!(assetPath in assetsMap)) {
      addError(
        'P-MEDIA',
        'P-MEDIA-ASSET-MISSING',
        recordId,
        recordType,
        `Asset file "${assetPath}" referenced by "${recordId}" does not exist in pack assets.`
      );
    } else {
      const content = assetsMap[assetPath];
      const computed = sha256Hex(content);
      if (computed !== expectedHash) {
        addError(
          'P-MEDIA',
          'P-MEDIA-SHA256-MISMATCH',
          recordId,
          recordType,
          `Asset file "${assetPath}" SHA-256 mismatch: expected ${expectedHash}, computed ${computed}.`
        );
      }
    }
  }
}

function buildResult(errors, familyCounts) {
  return {
    valid: errors.length === 0,
    pass: errors.length === 0,
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    error_count: errors.length,
    summary_by_family: familyCounts,
    errors
  };
}
