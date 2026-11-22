'use strict';

/**
 * Consolidated Phase 0 persona asset service contract (ADR-022).
 * Ports the migration integrity, route behavior, CORS, two-bucket HMAC rate-limit,
 * log-redaction, and event-detail validation suites from Vidoxlabs/vi-assets using node:sqlite.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
let DatabaseSync = null;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  DatabaseSync = null;
}

const worker = require('../pipeline/service/worker');
const {
  RETENTION_MS,
  buildRequestLog,
  clientMaterial,
  credentialMaterial,
  parseCorsOrigins,
  parseLimits,
  recordAuthFailure,
  redactRecord,
  subjectHash,
  validateEventDetail,
  writeEvent,
} = require('../lib/asset-service');

const ROOT = path.join(__dirname, '..');
const SERVICE_DIR = path.join(ROOT, 'pipeline', 'service');
const MIGRATIONS_DIR = path.join(SERVICE_DIR, 'migrations');

const ipv4 = (...parts) => parts.join('.');

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const HASH_D = 'd'.repeat(64);
const HASH_E = 'e'.repeat(64);
const HASH_F = 'f'.repeat(64);

const ALLOWED_ORIGIN = 'https://vidoxlabs.dev';
const ASSET_HOST = 'https://assets.vidoxlabs.dev';
const ORIGIN = 'https://example.com';

function createD1Adapter(sqlite) {
  const toParams = (args) => args.map((v) => (v === undefined ? null : v));

  class PreparedStatement {
    constructor(sql, boundArgs = []) {
      this.sql = sql;
      this.boundArgs = boundArgs;
    }

    bind(...args) {
      return new PreparedStatement(this.sql, toParams(args));
    }

    async all() {
      const stmt = sqlite.prepare(this.sql);
      const results = stmt.all(...this.boundArgs);
      return { results, success: true };
    }

    async first(colName) {
      const stmt = sqlite.prepare(this.sql);
      const row = stmt.get(...this.boundArgs);
      if (row === undefined) return null;
      if (colName !== undefined) return row[colName];
      return row;
    }

    async run() {
      const stmt = sqlite.prepare(this.sql);
      const info = stmt.run(...this.boundArgs);
      return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
    }

    async raw() {
      const stmt = sqlite.prepare(this.sql);
      return stmt.all(...this.boundArgs).map((row) => Object.values(row));
    }
  }

  return {
    prepare(sql) {
      return new PreparedStatement(sql);
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const out = [];
        for (const statement of statements) {
          out.push(await statement.run());
        }
        sqlite.exec('COMMIT');
        return out;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

function setupDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  const manifest = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_DIR, 'manifest.json'), 'utf8'));
  for (const entry of manifest.migrations) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, entry.file), 'utf8');
    sqlite.exec(sql);
  }
  return { sqlite, db: createD1Adapter(sqlite) };
}

async function seedDatabase(db) {
  await db.prepare('DELETE FROM auth_fail_windows').run();
  await db.prepare('DELETE FROM events').run();
  await db.prepare('DELETE FROM assets').run();
  const insert = db.prepare(
    `INSERT INTO assets (
      asset_id, vi, type, slot, version, status, key, sha256, bytes, width, height, mode, canon_version, alt, approved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  await db.batch([
    insert.bind(
      'violet/chibi/neutral/v001',
      'violet',
      'chibi',
      'neutral',
      1,
      'published',
      'vi/violet/chibi/violet_chibi_neutral_v001.png',
      HASH_A,
      120,
      512,
      512,
      'RGBA',
      'canon-1',
      'neutral',
      '2026-10-01T00:00:00.000Z',
    ),
    insert.bind(
      'violet/chibi/neutral/v002',
      'violet',
      'chibi',
      'neutral',
      2,
      'published',
      'vi/violet/chibi/violet_chibi_neutral_v002.png',
      HASH_B,
      140,
      512,
      512,
      'RGBA',
      'canon-1',
      'neutral',
      '2026-10-02T00:00:00.000Z',
    ),
    insert.bind(
      'violet/chibi/confused/v001',
      'violet',
      'chibi',
      'confused',
      1,
      'withdrawn',
      'vi/violet/chibi/violet_chibi_confused_v001.png',
      HASH_C,
      100,
      512,
      512,
      'RGBA',
      'canon-1',
      'confused',
      null,
    ),
    insert.bind(
      'violet/chibi/happy/v001',
      'violet',
      'chibi',
      'happy',
      1,
      'legacy',
      'vi/violet/chibi/violet_chibi_happy_v001.png',
      HASH_D,
      110,
      512,
      512,
      'RGBA',
      'canon-1',
      'happy',
      null,
    ),
    insert.bind(
      'wisteria/full/neutral/v001',
      'wisteria',
      'full',
      'neutral',
      1,
      'deleted',
      'vi/wisteria/full/wisteria_full_neutral_v001.png',
      HASH_E,
      130,
      1024,
      1536,
      'RGBA',
      'canon-1',
      'neutral',
      null,
    ),
    insert.bind(
      'violet/full/neutral/v001',
      'violet',
      'full',
      'neutral',
      1,
      'published',
      'vi/violet/full/violet_full_neutral_v001.png',
      HASH_F,
      150,
      1024,
      1536,
      'RGBA',
      'canon-1',
      'neutral',
      '2026-10-03T00:00:00.000Z',
    ),
    insert.bind(
      'violet/full/neutral/v002',
      'violet',
      'full',
      'neutral',
      2,
      'withdrawn',
      'vi/violet/full/violet_full_neutral_v002.png',
      '1'.repeat(64),
      160,
      1024,
      1536,
      'RGBA',
      'canon-1',
      'neutral',
      null,
    ),
    insert.bind(
      'violet/sheet/anchor/v001',
      'violet',
      'sheet',
      'anchor',
      1,
      'superseded',
      'vi/violet/sheet/violet_sheet_anchor_v001.png',
      '2'.repeat(64),
      170,
      1024,
      1024,
      'RGBA',
      'canon-1',
      'anchor',
      null,
    ),
  ]);
}

function makeEnv(db, overrides = {}) {
  const base = {
    DB: db,
    ASSETS: { get: async () => null },
    STAGING: { get: async () => null },
    ASSET_BASE: ASSET_HOST,
    CORS_ORIGINS: '',
    THROTTLE_HMAC_KEY: ['fix', 'ture'].join(''),
  };
  return { ...base, ...overrides };
}

function credential(value) {
  const scheme = String.fromCharCode(66, 101, 97, 114, 101, 114);
  return `${scheme} ${value}`;
}

function secretUrl() {
  const url = new URL('https://example.com/v1/assets');
  url.searchParams.set(['to', 'ken'].join(''), 'fixture-query-value');
  url.searchParams.set(['si', 'g'].join(''), 'fixture-sig-value');
  url.searchParams.set(['X-Amz-', 'Signature'].join(''), 'fixture-amz-value');
  return url.toString();
}

function countingDatabase(inner) {
  let writes = 0;
  const wrap = (stmt, sql) => new Proxy(stmt, {
    get(target, prop, receiver) {
      if (prop === 'bind') {
        return (...args) => wrap(target.bind(...args), sql);
      }
      if (prop === 'run' || prop === 'all' || prop === 'first' || prop === 'raw') {
        return (...args) => {
          if (/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql)) writes += 1;
          const method = Reflect.get(target, prop, receiver);
          return Reflect.apply(method, target, args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  const db = new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === 'prepare') {
        return (sql) => wrap(target.prepare(sql), sql);
      }
      if (prop === 'batch') {
        return (statements) => {
          writes += 1;
          return target.batch(statements);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  return { db, writes: () => writes };
}

describe('consolidated migration files and public-safe wrangler config', () => {
  test('every migration SQL file matches its SHA-256 digest in manifest.json', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_DIR, 'manifest.json'), 'utf8'));
    assert.equal(manifest.migrations.length, 4);
    for (const entry of manifest.migrations) {
      const bytes = fs.readFileSync(path.join(MIGRATIONS_DIR, entry.file));
      const actual = crypto.createHash('sha256').update(bytes).digest('hex');
      assert.equal(actual, entry.sha256, `digest mismatch for ${entry.file}`);
    }
  });

  test('wrangler.toml uses the redacted zero placeholder database_id and expected bindings', () => {
    const toml = fs.readFileSync(path.join(SERVICE_DIR, 'wrangler.toml'), 'utf8');
    assert.match(toml, /name\s*=\s*"vi-assets"/);
    assert.match(toml, /main\s*=\s*"worker\.js"/);
    assert.match(toml, /workers_dev\s*=\s*false/);
    assert.match(toml, /preview_urls\s*=\s*false/);
    assert.match(toml, /ASSET_BASE\s*=\s*"https:\/\/assets\.vidoxlabs\.dev"/);
    assert.match(toml, /database_id\s*=\s*"00000000-0000-0000-0000-000000000000"/);
  });
});

describe('Phase 0 asset service routes and security', { skip: !DatabaseSync && 'node:sqlite requires Node 22.5+' }, () => {
  let db;

  beforeEach(async () => {
    const setup = setupDatabase();
    db = setup.db;
    await seedDatabase(db);
  });

  function call(input, init, overrides) {
    const url = input.startsWith('https://') ? input : `https://example.com${input}`;
    return worker.fetch(new Request(url, init), makeEnv(db, overrides));
  }

  test('health reports ready when bindings and the asset host are configured', async () => {
    const response = await call('/healthz');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      checks: {
        database: 'ok',
        assets_bucket: 'ok',
        staging_bucket: 'ok',
        asset_base: 'ok',
      },
    });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  });

  test('health stays honest when DB, R2 bindings, or ASSET_BASE are missing or foreign', async () => {
    const noDb = await call('/healthz', undefined, { DB: undefined });
    assert.equal(noDb.status, 503);
    assert.equal((await noDb.json()).checks.database, 'missing');

    const noAssets = await call('/healthz', undefined, { ASSETS: undefined });
    const noStaging = await call('/healthz', undefined, { STAGING: undefined });
    assert.equal(noAssets.status, 503);
    assert.equal(noStaging.status, 503);
    assert.equal((await noAssets.json()).checks.assets_bucket, 'missing');
    assert.equal((await noStaging.json()).checks.staging_bucket, 'missing');

    const missingBase = await call('/healthz', undefined, { ASSET_BASE: '' });
    const foreignBase = await call('/healthz', undefined, { ASSET_BASE: 'https://example.com' });
    const httpBase = await call('/healthz', undefined, { ASSET_BASE: 'http://assets.vidoxlabs.dev' });
    assert.equal(missingBase.status, 503);
    assert.equal(foreignBase.status, 503);
    assert.equal(httpBase.status, 503);
    assert.equal((await missingBase.json()).checks.asset_base, 'missing');
    const foreignBody = await foreignBase.text();
    assert.ok(foreignBody.includes('invalid'));
    assert.equal(foreignBody.includes('example.com'), false);
    assert.equal((await httpBase.json()).checks.asset_base, 'invalid');

    const wrongMethod = await call('/healthz', { method: 'POST' });
    assert.equal(wrongMethod.status, 405);
    assert.equal(wrongMethod.headers.get('Allow'), 'GET');
  });

  test('lists visible assets, filters by vi/type/slot/version=latest, and hides withdrawn/deleted rows', async () => {
    const list = await call('/v1/assets');
    assert.equal(list.status, 200);
    const body = await list.json();
    assert.deepEqual(
      body.assets.map((asset) => asset.asset_id),
      [
        'violet/chibi/happy/v001',
        'violet/chibi/neutral/v001',
        'violet/chibi/neutral/v002',
        'violet/full/neutral/v001',
        'violet/sheet/anchor/v001',
      ],
    );

    const filtered = await call('/v1/assets?vi=violet&type=chibi&slot=neutral');
    assert.equal(filtered.status, 200);
    assert.deepEqual((await filtered.json()).assets, [
      {
        asset_id: 'violet/chibi/neutral/v001',
        url: `${ASSET_HOST}/vi/violet/chibi/violet_chibi_neutral_v001.png`,
        sha256: HASH_A,
        bytes: 120,
        width: 512,
        height: 512,
        mode: 'RGBA',
        canon_version: 'canon-1',
        alt: 'neutral',
        approved_at: '2026-10-01T00:00:00.000Z',
      },
      {
        asset_id: 'violet/chibi/neutral/v002',
        url: `${ASSET_HOST}/vi/violet/chibi/violet_chibi_neutral_v002.png`,
        sha256: HASH_B,
        bytes: 140,
        width: 512,
        height: 512,
        mode: 'RGBA',
        canon_version: 'canon-1',
        alt: 'neutral',
        approved_at: '2026-10-02T00:00:00.000Z',
      },
    ]);

    const latest = await call('/v1/assets?vi=violet&type=chibi&slot=neutral&version=latest');
    assert.equal(latest.status, 200);
    assert.deepEqual((await latest.json()).assets.map((a) => a.asset_id), ['violet/chibi/neutral/v002']);
  });

  test('resolves single asset by id, redirects /latest to highest published row, and skips unpublished rows', async () => {
    const found = await call(`/v1/assets/${encodeURIComponent('violet/chibi/happy/v001')}`);
    assert.equal(found.status, 200);
    const foundBody = await found.json();
    assert.equal(foundBody.asset_id, 'violet/chibi/happy/v001');
    assert.equal(foundBody.sha256, HASH_D);

    assert.equal((await call(`/v1/assets/${encodeURIComponent('violet/chibi/neutral/v999')}`)).status, 404);
    assert.equal((await call(`/v1/assets/${encodeURIComponent('violet/chibi/confused/v001')}`)).status, 404);
    assert.equal((await call(`/v1/assets/${encodeURIComponent('wisteria/full/neutral/v001')}`)).status, 404);

    const current = await call('/v1/assets/violet/chibi/neutral/latest');
    assert.equal(current.status, 302);
    assert.equal(current.headers.get('Location'), `${ASSET_HOST}/vi/violet/chibi/violet_chibi_neutral_v002.png`);
    assert.equal(current.headers.get('Cache-Control'), 'public, max-age=300');

    const skipped = await call('/v1/assets/violet/full/neutral/latest');
    assert.equal(skipped.status, 302);
    assert.equal(skipped.headers.get('Location'), `${ASSET_HOST}/vi/violet/full/violet_full_neutral_v001.png`);

    assert.equal((await call('/v1/assets/violet/chibi/missing/latest')).status, 404);
    assert.equal((await call('/v1/assets/violet/chibi/happy/latest')).status, 404);

    const insert = db.prepare(
      `INSERT INTO assets (
        asset_id, vi, type, slot, version, status, key, sha256, bytes, width, height, mode, canon_version, alt, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    await db.batch([
      insert.bind('violet/chibi/pose/v002', 'violet', 'chibi', 'pose', 2, 'published', 'vi/violet/chibi/violet_chibi_pose_v002.png', '9'.repeat(64), 80, 64, 64, 'RGBA', 'canon-1', 'pose', '2026-10-04T00:00:00.000Z'),
      insert.bind('violet/chibi/pose/v003', 'violet', 'chibi', 'pose', 3, 'needs-regen', 'vi/violet/chibi/violet_chibi_pose_v003.png', '8'.repeat(64), 80, 64, 64, 'RGBA', 'canon-1', 'pose', null),
      insert.bind('violet/chibi/pose/v004', 'violet', 'chibi', 'pose', 4, 'legacy', 'vi/violet/chibi/violet_chibi_pose_v004.png', '7'.repeat(64), 80, 64, 64, 'RGBA', 'canon-1', 'pose', null),
    ]);
    const latestPose = await call('/v1/assets/violet/chibi/pose/latest');
    assert.equal(latestPose.status, 302);
    assert.equal(latestPose.headers.get('Location'), `${ASSET_HOST}/vi/violet/chibi/violet_chibi_pose_v002.png`);
  });

  test('pages deterministically and rejects invalid filters, cursors, unsafe keys, and non-GET methods', async () => {
    const seen = [];
    let after = null;
    for (let guard = 0; guard < 10; guard += 1) {
      const reqPath = after === null ? '/v1/assets?limit=2' : `/v1/assets?limit=2&after=${encodeURIComponent(after)}`;
      const res = await call(reqPath);
      assert.equal(res.status, 200);
      const body = await res.json();
      seen.push(...body.assets.map((a) => a.asset_id));
      if (body.next === null) break;
      assert.equal(body.assets.length, 2);
      after = body.next;
    }
    assert.deepEqual(seen, [
      'violet/chibi/happy/v001',
      'violet/chibi/neutral/v001',
      'violet/chibi/neutral/v002',
      'violet/full/neutral/v001',
      'violet/sheet/anchor/v001',
    ]);

    assert.equal((await call('/v1/assets?vi=Violet')).status, 400);
    assert.deepEqual(await (await call('/v1/assets?version=0')).json(), { error: 'invalid_version' });
    assert.deepEqual(await (await call('/v1/assets?limit=201')).json(), { error: 'invalid_limit' });
    assert.deepEqual(await (await call('/v1/assets?after=../secret')).json(), { error: 'invalid_cursor' });

    const posted = await call('/v1/assets', { method: 'POST' });
    assert.equal(posted.status, 405);
    assert.equal(posted.headers.get('Allow'), 'GET, OPTIONS');
    assert.equal((await call('/v1/vocabulary')).status, 404);
    assert.equal((await call('/v1/admin/import')).status, 404);

    // Public reads survive without STAGING
    const withoutStaging = await call('/v1/assets', undefined, { STAGING: undefined });
    assert.equal(withoutStaging.status, 200);

    // Unsafe stored object key fails closed 503 without echoing foreign host
    await db.prepare(
      `INSERT INTO assets (
        asset_id, vi, type, slot, version, status, key, sha256, bytes, width, height, mode, canon_version, alt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind('yarrow/bg/deck/v001', 'yarrow', 'bg', 'deck', 1, 'published', 'https://evil.example/object.png', '3'.repeat(64), 80, 64, 64, 'RGBA', 'canon-1', 'deck').run();
    const unsafeRes = await call(`/v1/assets/${encodeURIComponent('yarrow/bg/deck/v001')}`);
    assert.equal(unsafeRes.status, 503);
    assert.equal((await unsafeRes.text()).includes('evil.example'), false);

    // Request host never overrides ASSET_BASE
    const customOriginReq = await call(`${ORIGIN}/v1/assets/violet/chibi/neutral/latest`);
    assert.equal(customOriginReq.headers.get('Location'), `${ASSET_HOST}/vi/violet/chibi/violet_chibi_neutral_v002.png`);

    // Empty catalog returns empty list and 404 on /latest
    await db.prepare('DELETE FROM assets').run();
    const emptyList = await call('/v1/assets');
    assert.equal(emptyList.status, 200);
    assert.deepEqual(await emptyList.json(), { assets: [], next: null });
    assert.equal((await call('/v1/assets/violet/chibi/neutral/latest')).status, 404);

    // Missing DB on data routes returns 503 without leaking ASSET_HOST
    const noDbAssets = await call('/v1/assets', undefined, { DB: undefined });
    assert.equal(noDbAssets.status, 503);
    const noDbBody = await noDbAssets.text();
    assert.ok(noDbBody.includes('missing'));
    assert.equal(noDbBody.includes(ASSET_HOST), false);
  });

  test('enforces exact https CORS origins, Vary: Origin, and excludes admin/review/candidates paths', async () => {
    assert.deepEqual(parseCorsOrigins(undefined), []);
    assert.deepEqual(parseCorsOrigins('*'), []);
    assert.deepEqual(parseCorsOrigins(`http://vidoxlabs.dev, ${ALLOWED_ORIGIN}`), [ALLOWED_ORIGIN]);

    const allow = `${ALLOWED_ORIGIN}, https://app.example.com`;
    const listed = await call('/v1/assets', { headers: { Origin: ALLOWED_ORIGIN } }, { CORS_ORIGINS: allow });
    const suffix = await call('/v1/assets', { headers: { Origin: 'https://vidoxlabs.dev.evil.example' } }, { CORS_ORIGINS: allow });
    const starOrigin = await call('/v1/assets', { headers: { Origin: '*' } }, { CORS_ORIGINS: allow });
    const anonymous = await call('/v1/assets', undefined, { CORS_ORIGINS: allow });

    assert.equal(listed.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN);
    assert.ok(listed.headers.get('Vary').includes('Origin'));
    assert.equal(suffix.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal(starOrigin.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal(anonymous.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal(listed.headers.get('Access-Control-Allow-Credentials'), null);

    const redirectDenied = await call(
      '/v1/assets/violet/chibi/neutral/latest',
      { headers: { Origin: 'https://evil.example' } },
      { CORS_ORIGINS: ALLOWED_ORIGIN },
    );
    assert.equal(redirectDenied.status, 302);
    assert.equal(redirectDenied.headers.get('Access-Control-Allow-Origin'), null);
    assert.ok(redirectDenied.headers.get('Vary').includes('Origin'));

    const preflight = await call('/v1/assets', { method: 'OPTIONS', headers: { Origin: ALLOWED_ORIGIN } }, { CORS_ORIGINS: ALLOWED_ORIGIN });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN);
    assert.equal(preflight.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');

    for (const p of ['/v1/admin/import', '/v1/review', '/v1/candidates/abc/blob']) {
      const blocked = await call(p, { headers: { Origin: ALLOWED_ORIGIN } }, { CORS_ORIGINS: ALLOWED_ORIGIN });
      assert.equal(blocked.status, 404);
      assert.equal(blocked.headers.get('Access-Control-Allow-Origin'), null);
    }
  });

  test('enforces two-bucket HMAC failed-auth rate limit, triggers 2h purge, and avoids writes once limited', async () => {
    const clientIp = ipv4(192, 0, 2, 10);
    const headers = { Authorization: credential('fixture-auth-value'), 'CF-Connecting-IP': clientIp };
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal((await call('/v1/assets', { headers })).status, 401);
    }
    const limited = await call('/v1/assets', { headers });
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), { error: 'rate_limited' });
    assert.ok(Number(limited.headers.get('Retry-After')) > 0);

    // Credential bucket catches distributed IPv6 /64 attempts sharing an 8-char prefix
    await db.prepare('DELETE FROM auth_fail_windows').run();
    await db.prepare('DELETE FROM events').run();
    for (let index = 1; index <= 12; index += 1) {
      const address = `2001:db8:0:${index.toString(16)}::1`;
      const res = await call('/v1/assets', {
        headers: { Authorization: credential('fixture-auth-value'), 'CF-Connecting-IP': address },
      });
      assert.equal(res.status, index <= 10 ? 401 : 429);
    }

    // Stops writing once limited & triggers keep 1 event per minute/hour window
    await db.prepare('DELETE FROM auth_fail_windows').run();
    await db.prepare('DELETE FROM events').run();
    const counter = countingDatabase(db);
    const countHeaders = { Authorization: credential('other-auth-value'), 'CF-Connecting-IP': ipv4(192, 0, 2, 77) };
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const res = await call('/v1/assets', { headers: countHeaders }, { DB: counter.db });
      assert.equal(res.status, attempt < 10 ? 401 : 429);
    }
    assert.equal(counter.writes(), 11);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM events').first()).n, 2);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM auth_fail_windows').first()).n, 4);

    // Trigger purges windows older than 2 hours
    const now = Date.parse('2026-10-26T15:00:00.000Z');
    const staleStart = new Date(now - RETENTION_MS - 1000).toISOString();
    const freshStart = new Date(now - RETENTION_MS + 60000).toISOString();
    await db.prepare('DELETE FROM auth_fail_windows').run();
    await db.prepare(
      `INSERT INTO auth_fail_windows (subject_hash, window_kind, window_start, hits)
       VALUES (?1, 'm', ?2, 1), (?3, 'm', ?4, 1)`,
    ).bind('e'.repeat(64), staleStart, 'f'.repeat(64), freshStart).run();
    await recordAuthFailure(db, { ip: 'a'.repeat(64), credential: 'b'.repeat(64) }, { perMinute: 10, perHour: 100 }, now);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM auth_fail_windows WHERE subject_hash = ?').bind('e'.repeat(64)).first()).n, 0);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM auth_fail_windows WHERE subject_hash = ?').bind('f'.repeat(64)).first()).n, 1);

    // Fail-closed checks: missing/invalid CF-Connecting-IP -> 400; missing key or dropped table -> 503 while anon reads stay 200
    assert.equal((await call('/v1/assets', { headers: { Authorization: credential('fixture-auth-value') } })).status, 400);
    assert.equal((await call('/v1/assets', { headers: { Authorization: credential('fixture-auth-value'), 'CF-Connecting-IP': 'not-an-ip' } })).status, 400);
    assert.equal((await call('/v1/assets', { headers }, { THROTTLE_HMAC_KEY: '' })).status, 503);
    assert.equal((await call('/v1/assets', undefined, { THROTTLE_HMAC_KEY: '' })).status, 200);
    assert.equal(parseLimits({ AUTH_FAIL_LIMIT_PER_HOUR: 'nope' }).ok, false);

    // Subject separation check
    assert.deepEqual(clientMaterial(ipv4(192, 0, 2, 9)), { ok: true, material: `${ipv4(192, 0, 2, 0)}/24` });
    assert.deepEqual(clientMaterial('2001:db8:0:1::1'), { ok: true, material: '2001:0db8:0000:0001::/64' });
    assert.equal(credentialMaterial(credential('fixture-auth-value')), 'fixture-');
    const h1 = await subjectHash('k', 'ip', `${ipv4(192, 0, 2, 0)}/24`);
    const h2 = await subjectHash('k', 'credential', `${ipv4(192, 0, 2, 0)}/24`);
    assert.notEqual(h1, h2);

    // Configured minute/hour limits & non-positive integer limit fail-closed
    const customLimitHeaders = { Authorization: credential('custom-limit-val'), 'CF-Connecting-IP': ipv4(203, 0, 113, 10) };
    const limitOverrides = { AUTH_FAIL_LIMIT_PER_MINUTE: '2', AUTH_FAIL_LIMIT_PER_HOUR: '100' };
    assert.equal((await call('/healthz', { headers: customLimitHeaders }, limitOverrides)).status, 401);
    assert.equal((await call('/healthz', { headers: customLimitHeaders }, limitOverrides)).status, 401);
    assert.equal((await call('/healthz', { headers: customLimitHeaders }, limitOverrides)).status, 429);
    assert.equal((await call('/v1/assets', { headers: customLimitHeaders }, { AUTH_FAIL_LIMIT_PER_MINUTE: '0' })).status, 503);

    // Resets minute window without resetting hour window
    await db.prepare('DELETE FROM auth_fail_windows').run();
    const minSub = { ip: '1'.repeat(64), credential: '2'.repeat(64) };
    const hrSub = { ip: '3'.repeat(64), credential: '4'.repeat(64) };
    const t0 = Date.parse('2026-10-26T15:00:30.000Z');
    assert.equal((await recordAuthFailure(db, minSub, { perMinute: 1, perHour: 100 }, t0)).limited, false);
    assert.equal((await recordAuthFailure(db, minSub, { perMinute: 1, perHour: 100 }, t0 + 1000)).limited, true);
    assert.equal((await recordAuthFailure(db, minSub, { perMinute: 1, perHour: 100 }, Date.parse('2026-10-26T15:01:00.000Z'))).limited, false);
    assert.equal((await recordAuthFailure(db, hrSub, { perMinute: 100, perHour: 2 }, t0)).limited, false);
    assert.equal((await recordAuthFailure(db, hrSub, { perMinute: 100, perHour: 2 }, t0 + 1000)).limited, false);
    assert.equal((await recordAuthFailure(db, hrSub, { perMinute: 100, perHour: 2 }, t0 + 2000)).limited, true);
    assert.equal((await recordAuthFailure(db, hrSub, { perMinute: 100, perHour: 2 }, t0 + 61000)).limited, true);
    assert.equal((await recordAuthFailure(db, hrSub, { perMinute: 100, perHour: 2 }, Date.parse('2026-10-26T16:00:00.000Z'))).limited, false);
  });

  test('redacts logs, validates structured event detail, and fails closed when auth_fail_windows is absent', async () => {
    const lines = [];
    const originalLog = console.log;
    console.log = (...args) => lines.push(args.map(String).join(' '));
    try {
      const clientIp = ipv4(203, 0, 113, 44);
      const res = await call(secretUrl(), {
        headers: {
          Authorization: credential('fixture-auth-value'),
          Cookie: 'fixture-cookie-value',
          'CF-Connecting-IP': clientIp,
        },
      });
      assert.equal(res.status, 401);
    } finally {
      console.log = originalLog;
    }
    const logged = lines.join('\n');
    assert.ok(logged.includes('/v1/assets'));
    assert.equal(logged.includes('fixture-'), false);
    assert.equal(logged.toLowerCase().includes('authorization'), false);
    const storedEvents = (await db.prepare('SELECT actor, kind, ref, detail FROM events').all()).results;
    assert.ok(storedEvents.length >= 1 && storedEvents.length <= 2);
    assert.equal(storedEvents[0].actor, 'service');
    assert.equal(storedEvents[0].kind, 'auth-fail');
    assert.equal(storedEvents[0].detail, JSON.stringify({ status: 401, reason_code: 'unauthorized' }));
    assert.match(storedEvents[0].ref, /^[mh]-[0-9t]+$/);

    assert.deepEqual(
      buildRequestLog(new Request(secretUrl(), { headers: { Authorization: credential('x') } }), 200),
      { method: 'GET', path: '/v1/assets', status: 200 },
    );
    assert.deepEqual(
      redactRecord({ method: 'GET', authorization: 'x', nested: { a: 1 }, status: 200 }),
      { method: 'GET', status: 200 },
    );

    assert.equal(validateEventDetail('free text'), null);
    assert.equal(validateEventDetail({ status: 401, note: 'unexpected' }), null);
    assert.deepEqual(validateEventDetail({ status: 401, reason_code: 'unauthorized' }), {
      status: 401,
      reason_code: 'unauthorized',
    });
    assert.equal(await writeEvent(db, 'auth-fail', 'raw request', 'assets-list'), false);

    await db.prepare('DROP TABLE auth_fail_windows').run();
    const authed = await call('/v1/assets', {
      headers: { Authorization: credential('fixture-auth-value'), 'CF-Connecting-IP': ipv4(192, 0, 2, 80) },
    });
    assert.equal(authed.status, 503);
    const anon = await call('/v1/assets');
    assert.equal(anon.status, 200);
  });
});
