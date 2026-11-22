'use strict';

/**
 * Phase 0 read-only VI persona asset service (ADR-022, consolidated from Vidoxlabs/vi-assets).
 * Dependency-free Web-standard / D1 runtime logic shared by pipeline/service/worker.js and Node tests.
 */

const ALLOWED_ASSET_HOST = 'assets.vidoxlabs.dev';

const DEFAULT_AUTH_FAIL_PER_MINUTE = 10;
const DEFAULT_AUTH_FAIL_PER_HOUR = 100;

const MINUTE_MS = 60000;
const HOUR_MS = 3600000;
const RETENTION_MS = 2 * HOUR_MS;

const ASSET_METHODS = 'GET, OPTIONS';
const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 200;

const VISIBLE = "('published','superseded','needs-regen','legacy')";
const COLUMNS = 'asset_id, sha256, bytes, width, height, mode, canon_version, alt, approved_at, key';

const DETAIL_KEYS = ['token_id', 'scope', 'asset_id', 'status', 'reason_code'];
const KIND_PATTERN = /^[a-z0-9-]{1,64}$/;
const REF_PATTERN = /^[a-z0-9-]{1,64}$/;

const FORBIDDEN_KEYS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'cf-connecting-ip',
  'x-forwarded-for',
  'cf-access-jwt-assertion',
  'token',
  'token_hash',
  'pepper',
]);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']);

function parseAssetBase(value) {
  if (value === undefined || String(value).trim() === '') {
    return { ok: false, reason: 'missing' };
  }
  let url;
  try {
    url = new URL(value);
  } catch (err) {
    return { ok: false, reason: 'invalid' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'invalid' };
  if (url.username !== '' || url.password !== '') return { ok: false, reason: 'invalid' };
  if (url.search !== '' || url.hash !== '') return { ok: false, reason: 'invalid' };
  if (url.pathname !== '/' && url.pathname !== '') return { ok: false, reason: 'invalid' };
  if (url.hostname !== ALLOWED_ASSET_HOST) return { ok: false, reason: 'invalid' };
  return { ok: true, origin: url.origin };
}

function readString(source, key) {
  if (!source || typeof source !== 'object') return undefined;
  const value = Reflect.get(source, key);
  return typeof value === 'string' ? value : undefined;
}

function parseLimit(value, fallback) {
  if (value === undefined || value.trim() === '') return fallback;
  const trimmed = value.trim();
  if (!/^[1-9][0-9]{0,5}$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100000) return null;
  return parsed;
}

function parseLimits(source) {
  const perMinute = parseLimit(readString(source, 'AUTH_FAIL_LIMIT_PER_MINUTE'), DEFAULT_AUTH_FAIL_PER_MINUTE);
  const perHour = parseLimit(readString(source, 'AUTH_FAIL_LIMIT_PER_HOUR'), DEFAULT_AUTH_FAIL_PER_HOUR);
  if (perMinute === null || perHour === null) return { ok: false };
  return { ok: true, perMinute, perHour };
}

function assetUrl(origin, key) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(key)) return null;
  if (key.includes('..') || key.includes('//') || key.startsWith('/')) return null;
  let url;
  try {
    url = new URL(key, `${origin}/`);
  } catch (err) {
    return null;
  }
  if (url.origin !== origin) return null;
  if (url.protocol !== 'https:') return null;
  if (url.hostname !== ALLOWED_ASSET_HOST) return null;
  if (url.search !== '' || url.hash !== '') return null;
  return url.toString();
}

function isExactOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch (err) {
    return false;
  }
  if (url.origin !== value) return false;
  if (url.protocol !== 'https:') return false;
  return url.username === '' && url.password === '' && url.search === '' && url.hash === '';
}

function parseCorsOrigins(value) {
  if (value === undefined || String(value).trim() === '') return [];
  const origins = [];
  for (const part of String(value).split(',')) {
    const origin = part.trim();
    if (origin === '' || origin === '*') continue;
    if (!isExactOrigin(origin)) continue;
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

function applyCors(headers, request, allow) {
  if (allow.length === 0) return;
  headers.append('Vary', 'Origin');
  const origin = request.headers.get('Origin');
  if (origin === null || !allow.includes(origin)) return;
  headers.set('Access-Control-Allow-Origin', origin);
}

function isDetailKey(key) {
  return DETAIL_KEYS.includes(key);
}

function valueAllowed(key, value) {
  switch (key) {
    case 'status':
      return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599;
    case 'token_id':
      return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
    case 'scope':
    case 'reason_code':
      return typeof value === 'string' && /^[a-z0-9_-]{1,64}$/.test(value);
    case 'asset_id':
      return (
        typeof value === 'string' &&
        /^[a-z0-9/_-]{1,128}$/.test(value) &&
        !value.includes('..') &&
        !value.includes('//')
      );
    default:
      return false;
  }
}

function validateEventDetail(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null;
  const keys = Object.keys(input);
  if (keys.length === 0) return null;
  const detail = {};
  for (const key of keys) {
    if (!isDetailKey(key)) return null;
    const value = input[key];
    if (!valueAllowed(key, value)) return null;
    detail[key] = value;
  }
  return detail;
}

function stableDetail(detail) {
  const ordered = {};
  for (const key of DETAIL_KEYS) {
    const value = detail[key];
    if (value !== undefined) ordered[key] = value;
  }
  return JSON.stringify(ordered);
}

async function writeEvent(db, kind, detail, ref) {
  const parsed = validateEventDetail(detail);
  if (parsed === null) return false;
  if (!KIND_PATTERN.test(kind)) return false;
  if (ref !== null && !REF_PATTERN.test(ref)) return false;
  await db
    .prepare('INSERT INTO events (actor, kind, ref, detail) VALUES (?, ?, ?, ?)')
    .bind('service', kind, ref, stableDetail(parsed))
    .run();
  return true;
}

function json(body, status, extra) {
  const headers = new Headers(extra);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(body), { status, headers });
}

function empty(status, extra) {
  const headers = new Headers(extra);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(null, { status, headers });
}

function methodNotAllowed(allow) {
  return json({ error: 'method_not_allowed' }, 405, { Allow: allow });
}

function hasSecretMarker(value) {
  const lower = value.toLowerCase();
  const markers = ['authorization', 'cookie', ['to', 'ken='].join(''), ['si', 'g='].join(''), 'x-amz-'];
  return markers.some((marker) => lower.includes(marker));
}

function buildRequestLog(request, status) {
  const url = new URL(request.url);
  const method = SAFE_METHODS.has(request.method) ? request.method : 'OTHER';
  let path = url.pathname;
  if (path.length > 256 || path.includes('\n') || path.includes('\r') || path.includes('?')) {
    path = '/';
  }
  return { method, path, status };
}

function redactRecord(input) {
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
    if (value !== null && typeof value === 'object') continue;
    if (typeof value === 'string' && hasSecretMarker(value)) continue;
    out[key] = value;
  }
  return out;
}

function logRequest(request, status) {
  const entry = redactRecord(buildRequestLog(request, status));
  console.log(JSON.stringify(entry));
}

function readThrottleKey(source) {
  if (!source || typeof source !== 'object') return null;
  const value = Reflect.get(source, 'THROTTLE_HMAC_KEY');
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function ipv4Prefix(value) {
  const match = /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.exec(value);
  if (match === null) return null;
  const octets = value.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet) || octet > 255)) return null;
  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}

function splitGroups(value) {
  if (value === '') return [];
  const groups = value.split(':');
  if (groups.some((group) => group === '')) return null;
  return groups;
}

function ipv6Prefix(value) {
  if (value.includes('%') || value.includes('.')) return null;
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const head = splitGroups(halves[0] === undefined ? '' : halves[0]);
  const tail = halves.length === 2 ? splitGroups(halves[1] === undefined ? '' : halves[1]) : [];
  if (head === null || tail === null) return null;
  if (halves.length === 1 && head.length !== 8) return null;
  if (halves.length === 2 && head.length + tail.length > 7) return null;
  const missing = 8 - head.length - tail.length;
  const groups = [...head, ...Array.from({ length: missing }, () => '0'), ...tail];
  if (groups.length !== 8) return null;
  const normalized = [];
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    normalized.push(group.toLowerCase().padStart(4, '0'));
  }
  return `${normalized.slice(0, 4).join(':')}::/64`;
}

function clientMaterial(address) {
  if (address === null || address === undefined) return { ok: false };
  const trimmed = String(address).trim();
  if (trimmed === '') return { ok: false };
  const v4 = ipv4Prefix(trimmed);
  if (v4 !== null) return { ok: true, material: v4 };
  const v6 = ipv6Prefix(trimmed);
  if (v6 !== null) return { ok: true, material: v6 };
  return { ok: false };
}

function credentialMaterial(header) {
  const trimmed = String(header).trim();
  const splitAt = trimmed.search(/\s/);
  if (splitAt <= 0) return 'none';
  const credential = trimmed.slice(splitAt).trim();
  if (credential === '') return 'none';
  return credential.slice(0, 8);
}

async function subjectHash(key, bucket, material) {
  const webCrypto = globalThis.crypto;
  const cryptoKey = await webCrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payload = new TextEncoder().encode(`throttle/v1\n${bucket}\n${material}`);
  const signature = await webCrypto.subtle.sign('HMAC', cryptoKey, payload);
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function windowStartIso(now, spanMs) {
  const start = now - (now % spanMs);
  return new Date(start).toISOString();
}

function assertHash(hash) {
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new Error('invalid subject hash');
  }
}

function hitsFrom(rows) {
  let minute = 0;
  let hour = 0;
  for (const row of rows) {
    if (row.window_kind === 'm') minute = Math.max(minute, row.hits);
    if (row.window_kind === 'h') hour = Math.max(hour, row.hits);
  }
  return { minute, hour };
}

function retryAfter(now, spanMs) {
  const remainingMs = spanMs - (now % spanMs);
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

function retryFor(now, hits, limits) {
  const minuteLimited = hits.minute > limits.perMinute;
  const hourLimited = hits.hour > limits.perHour;
  return Math.max(
    minuteLimited ? retryAfter(now, MINUTE_MS) : 0,
    hourLimited ? retryAfter(now, HOUR_MS) : 0,
    1,
  );
}

async function windowHits(db, subjects, minuteStart, hourStart) {
  const { results } = await db
    .prepare(
      `SELECT window_kind, MAX(hits) AS hits
       FROM auth_fail_windows
       WHERE subject_hash IN (?1, ?2)
         AND (
           (window_kind = 'm' AND window_start = ?3)
           OR (window_kind = 'h' AND window_start = ?4)
         )
       GROUP BY window_kind`,
    )
    .bind(subjects.ip, subjects.credential, minuteStart, hourStart)
    .all();
  return hitsFrom(results);
}

async function recordWindows(db, subjects, minuteStart, hourStart) {
  const { results } = await db
    .prepare(
      `INSERT INTO auth_fail_windows (subject_hash, window_kind, window_start, hits)
       VALUES (?1, 'm', ?2, 1),
              (?1, 'h', ?3, 1),
              (?4, 'm', ?2, 1),
              (?4, 'h', ?3, 1)
       ON CONFLICT (subject_hash, window_kind, window_start)
       DO UPDATE SET hits = hits + 1
       RETURNING window_kind, hits`,
    )
    .bind(subjects.ip, minuteStart, hourStart, subjects.credential)
    .all();
  const hits = hitsFrom(results);
  if (hits.minute === 0 || hits.hour === 0) {
    throw new Error('rate limit write failed');
  }
  return hits;
}

async function recordAuthFailure(db, subjects, limits, now) {
  assertHash(subjects.ip);
  assertHash(subjects.credential);
  if (subjects.ip === subjects.credential) {
    throw new Error('subject hashes must differ');
  }
  const minuteStart = windowStartIso(now, MINUTE_MS);
  const hourStart = windowStartIso(now, HOUR_MS);
  const existing = await windowHits(db, subjects, minuteStart, hourStart);
  if (existing.minute > limits.perMinute || existing.hour > limits.perHour) {
    return { limited: true, retryAfterSeconds: retryFor(now, existing, limits) };
  }
  const hits = await recordWindows(db, subjects, minuteStart, hourStart);
  const minuteLimited = hits.minute > limits.perMinute;
  const hourLimited = hits.hour > limits.perHour;
  return {
    limited: minuteLimited || hourLimited,
    retryAfterSeconds: retryFor(
      now,
      { minute: minuteLimited ? hits.minute : 0, hour: hourLimited ? hits.hour : 0 },
      limits,
    ),
  };
}

function hasPrepare(value) {
  return typeof value === 'object' && value !== null && typeof value.prepare === 'function';
}

function hasGet(value) {
  return typeof value === 'object' && value !== null && typeof value.get === 'function';
}

async function readiness(env) {
  const assetBase = parseAssetBase(env.ASSET_BASE);
  const checks = {
    database: hasPrepare(env.DB) ? 'ok' : 'missing',
    assets_bucket: hasGet(env.ASSETS) ? 'ok' : 'missing',
    staging_bucket: hasGet(env.STAGING) ? 'ok' : 'missing',
    asset_base: assetBase.ok ? 'ok' : assetBase.reason,
  };
  if (checks.database === 'ok' && env.DB !== undefined) {
    try {
      const row = await env.DB.prepare('SELECT 1 AS ok').first();
      if (row === null) checks.database = 'error';
    } catch (err) {
      checks.database = 'error';
    }
  }
  const readsOk =
    checks.database === 'ok' &&
    checks.assets_bucket === 'ok' &&
    checks.asset_base === 'ok' &&
    assetBase.ok;
  return {
    checks,
    readsOk,
    ready: readsOk && checks.staging_bucket === 'ok',
    origin: assetBase.ok ? assetBase.origin : null,
  };
}

function readSlug(value) {
  if (value === null || value === '') return { ok: true, value: null };
  if (!/^[a-z0-9-]{1,64}$/.test(value)) return { ok: false };
  return { ok: true, value };
}

function readCursor(value) {
  if (value === null) return { ok: true, value: null };
  if (!/^[a-z0-9/_-]{1,128}$/.test(value)) return { ok: false };
  if (value.includes('..') || value.includes('//')) return { ok: false };
  return { ok: true, value };
}

function readPageLimit(value) {
  if (value === null) return { ok: true, value: DEFAULT_PAGE_LIMIT };
  if (value === '') return { ok: false };
  if (!/^[1-9][0-9]{0,2}$/.test(value)) return { ok: false };
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_LIMIT) return { ok: false };
  return { ok: true, value: parsed };
}

function parseListQuery(url) {
  const vi = readSlug(url.searchParams.get('vi'));
  const type = readSlug(url.searchParams.get('type'));
  const slot = readSlug(url.searchParams.get('slot'));
  if (!vi.ok || !type.ok || !slot.ok) return { ok: false, error: 'invalid_filter' };
  const versionRaw = url.searchParams.get('version');
  let version;
  if (versionRaw === null || versionRaw === '') {
    version = null;
  } else if (versionRaw === 'latest') {
    version = 'latest';
  } else if (!/^[1-9][0-9]{0,8}$/.test(versionRaw)) {
    return { ok: false, error: 'invalid_version' };
  } else {
    version = Number(versionRaw);
  }
  const after = readCursor(url.searchParams.get('after'));
  if (!after.ok) return { ok: false, error: 'invalid_cursor' };
  const limit = readPageLimit(url.searchParams.get('limit'));
  if (!limit.ok) return { ok: false, error: 'invalid_limit' };
  return {
    ok: true,
    filter: { vi: vi.value, type: type.value, slot: slot.value, version },
    after: after.value,
    limit: limit.value,
  };
}

function decodeAssetId(segment) {
  let decoded;
  try {
    decoded = decodeURIComponent(segment);
  } catch (err) {
    return null;
  }
  if (!/^[a-z0-9/_-]{1,128}$/.test(decoded)) return null;
  if (decoded.includes('..') || decoded.includes('//')) return null;
  return decoded;
}

function pageOf(results, limit) {
  const records = results.length > limit ? results.slice(0, limit) : [...results];
  const last = records[records.length - 1];
  return {
    records,
    next: results.length > limit && last !== undefined ? last.asset_id : null,
  };
}

async function listAssets(db, filter, after, limit) {
  if (filter.version === 'latest') {
    const { results } = await db
      .prepare(
        `SELECT a.asset_id, a.sha256, a.bytes, a.width, a.height, a.mode, a.canon_version, a.alt, a.approved_at, a.key
         FROM assets a
         JOIN (
           SELECT vi, type, slot, MAX(version) AS version
           FROM assets
           WHERE status = 'published'
             AND (?1 IS NULL OR vi = ?1)
             AND (?2 IS NULL OR type = ?2)
             AND (?3 IS NULL OR slot = ?3)
           GROUP BY vi, type, slot
         ) latest
           ON a.vi = latest.vi AND a.type = latest.type AND a.slot = latest.slot AND a.version = latest.version
         WHERE a.status = 'published'
           AND (?4 IS NULL OR a.asset_id > ?4)
         ORDER BY a.asset_id
         LIMIT ?5`,
      )
      .bind(filter.vi, filter.type, filter.slot, after, limit + 1)
      .all();
    return pageOf(results, limit);
  }
  const { results } = await db
    .prepare(
      `SELECT ${COLUMNS}
       FROM assets
       WHERE status IN ${VISIBLE}
         AND (?1 IS NULL OR vi = ?1)
         AND (?2 IS NULL OR type = ?2)
         AND (?3 IS NULL OR slot = ?3)
         AND (?4 IS NULL OR version = ?4)
         AND (?5 IS NULL OR asset_id > ?5)
       ORDER BY asset_id
       LIMIT ?6`,
    )
    .bind(filter.vi, filter.type, filter.slot, filter.version, after, limit + 1)
    .all();
  return pageOf(results, limit);
}

async function getAsset(db, assetId) {
  return db
    .prepare(
      `SELECT ${COLUMNS}
       FROM assets
       WHERE asset_id = ?1 AND status IN ${VISIBLE}`,
    )
    .bind(assetId)
    .first();
}

async function latestAsset(db, vi, type, slot) {
  return db
    .prepare(
      `SELECT ${COLUMNS}
       FROM assets
       WHERE vi = ?1 AND type = ?2 AND slot = ?3 AND status = 'published'
       ORDER BY version DESC
       LIMIT 1`,
    )
    .bind(vi, type, slot)
    .first();
}

function toPublicAsset(record, origin) {
  const url = assetUrl(origin, record.key);
  if (url === null) return null;
  return {
    asset_id: record.asset_id,
    url,
    sha256: record.sha256,
    bytes: record.bytes,
    width: record.width,
    height: record.height,
    mode: record.mode,
    canon_version: record.canon_version,
    alt: record.alt,
    approved_at: record.approved_at,
  };
}

function matchRoute(pathname) {
  if (pathname === '/healthz') return { kind: 'health' };
  if (pathname === '/v1/assets') return { kind: 'list' };
  const latest = /^\/v1\/assets\/([a-z0-9-]{1,64})\/([a-z0-9-]{1,64})\/([a-z0-9-]{1,64})\/latest$/.exec(pathname);
  if (latest !== null) {
    const vi = latest[1];
    const type = latest[2];
    const slot = latest[3];
    if (vi === undefined || type === undefined || slot === undefined) return null;
    return { kind: 'latest', vi, type, slot };
  }
  const byId = /^\/v1\/assets\/([^/]+)$/.exec(pathname);
  const id = byId && byId[1];
  if (id !== undefined) return { kind: 'byId', id };
  return null;
}

function corsEnabled(pathname) {
  if (pathname.startsWith('/v1/admin') || pathname.startsWith('/v1/review') || pathname.startsWith('/v1/candidates')) {
    return false;
  }
  const route = matchRoute(pathname);
  const kind = route ? route.kind : undefined;
  return kind === 'list' || kind === 'latest' || kind === 'byId';
}

function withCors(response, request, env) {
  const url = new URL(request.url);
  if (!corsEnabled(url.pathname)) return response;
  const headers = new Headers(response.headers);
  applyCors(headers, request, parseCorsOrigins(env.CORS_ORIGINS));
  if (request.method === 'OPTIONS' && headers.has('Access-Control-Allow-Origin')) {
    headers.set('Access-Control-Allow-Methods', ASSET_METHODS);
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleList(request, url, env, origin) {
  if (request.method === 'OPTIONS') return empty(204, { Allow: ASSET_METHODS });
  if (request.method !== 'GET') return methodNotAllowed(ASSET_METHODS);
  const parsed = parseListQuery(url);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const page = await listAssets(env.DB, parsed.filter, parsed.after, parsed.limit);
  const assets = [];
  for (const record of page.records) {
    const asset = toPublicAsset(record, origin);
    if (asset === null) return json({ error: 'unavailable', checks: { asset_base: 'invalid' } }, 503);
    assets.push(asset);
  }
  return json({ assets, next: page.next }, 200);
}

async function handleLatest(request, env, origin, vi, type, slot) {
  if (request.method === 'OPTIONS') return empty(204, { Allow: ASSET_METHODS });
  if (request.method !== 'GET') return methodNotAllowed(ASSET_METHODS);
  const record = await latestAsset(env.DB, vi, type, slot);
  if (record === null) return json({ error: 'not_found' }, 404);
  const asset = toPublicAsset(record, origin);
  if (asset === null) return json({ error: 'unavailable', checks: { asset_base: 'invalid' } }, 503);
  return new Response(null, {
    status: 302,
    headers: {
      Location: asset.url,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function handleById(request, env, origin, rawId) {
  if (request.method === 'OPTIONS') return empty(204, { Allow: ASSET_METHODS });
  if (request.method !== 'GET') return methodNotAllowed(ASSET_METHODS);
  const assetId = decodeAssetId(rawId);
  if (assetId === null) return json({ error: 'not_found' }, 404);
  const record = await getAsset(env.DB, assetId);
  if (record === null) return json({ error: 'not_found' }, 404);
  const asset = toPublicAsset(record, origin);
  if (asset === null) return json({ error: 'unavailable', checks: { asset_base: 'invalid' } }, 503);
  return json(asset, 200);
}

async function rejectCredential(request, env, checks) {
  const limits = parseLimits(env);
  if (!limits.ok) return json({ error: 'unavailable', checks }, 503);
  const throttleKey = readThrottleKey(env);
  if (throttleKey === null) return json({ error: 'unavailable', checks }, 503);
  const address = clientMaterial(request.headers.get('CF-Connecting-IP'));
  if (!address.ok) return json({ error: 'invalid_client' }, 400);
  try {
    const ipHash = await subjectHash(throttleKey, 'ip', address.material);
    const header = request.headers.get('Authorization');
    const credentialHash = await subjectHash(
      throttleKey,
      'credential',
      credentialMaterial(header === null ? '' : header),
    );
    const decision = await recordAuthFailure(
      env.DB,
      { ip: ipHash, credential: credentialHash },
      limits,
      Date.now(),
    );
    if (decision.limited) {
      return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(decision.retryAfterSeconds) });
    }
    return json({ error: 'unauthorized' }, 401);
  } catch (err) {
    return json({ error: 'unavailable', checks }, 503);
  }
}

async function handle(request, env) {
  const url = new URL(request.url);
  const route = matchRoute(url.pathname);
  const state = await readiness(env);

  if (route && route.kind === 'health' && request.method === 'GET' && !request.headers.has('Authorization')) {
    return json({ ok: state.ready, checks: state.checks }, state.ready ? 200 : 503);
  }

  const origin = state.origin;
  if (!state.readsOk || origin === null) return json({ error: 'unavailable', checks: state.checks }, 503);

  if (request.headers.has('Authorization')) {
    return rejectCredential(request, env, state.checks);
  }

  if (route === null) return json({ error: 'not_found' }, 404);

  switch (route.kind) {
    case 'health':
      return methodNotAllowed('GET');
    case 'list':
      return handleList(request, url, env, origin);
    case 'latest':
      return handleLatest(request, env, origin, route.vi, route.type, route.slot);
    case 'byId':
      return handleById(request, env, origin, route.id);
    default:
      return json({ error: 'not_found' }, 404);
  }
}

async function handleFetch(request, env) {
  let response;
  try {
    response = await handle(request, env);
  } catch (error) {
    const name = error instanceof Error ? error.name : 'Error';
    console.error(JSON.stringify({ error: name, status: 503 }));
    response = json({ error: 'unavailable' }, 503);
  }
  logRequest(request, response.status);
  return withCors(response, request, env);
}

module.exports = {
  ALLOWED_ASSET_HOST,
  ASSET_METHODS,
  DEFAULT_AUTH_FAIL_PER_HOUR,
  DEFAULT_AUTH_FAIL_PER_MINUTE,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  RETENTION_MS,
  VISIBLE,
  applyCors,
  assetUrl,
  buildRequestLog,
  clientMaterial,
  corsEnabled,
  credentialMaterial,
  decodeAssetId,
  empty,
  getAsset,
  handleFetch,
  json,
  latestAsset,
  listAssets,
  logRequest,
  matchRoute,
  methodNotAllowed,
  parseAssetBase,
  parseCorsOrigins,
  parseLimits,
  parseListQuery,
  readiness,
  readThrottleKey,
  recordAuthFailure,
  redactRecord,
  subjectHash,
  toPublicAsset,
  validateEventDetail,
  windowStartIso,
  writeEvent,
};
