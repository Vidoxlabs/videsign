-- 0001_init.sql
CREATE TABLE assets (
  asset_id        TEXT PRIMARY KEY,                       -- 'violet/chibi/confused/v001'
  vi              TEXT NOT NULL CHECK (vi IN ('violet','wisteria','xylia','yarrow','zinnia')),
  type            TEXT NOT NULL CHECK (type IN ('full','chibi','bg','sheet')),
  slot            TEXT NOT NULL,
  version         INTEGER NOT NULL CHECK (version >= 1),
  status          TEXT NOT NULL CHECK (status IN ('published','superseded','needs-regen','legacy',
                                                  'withdrawn','deleted')),          -- v1.1: takedown states
  key             TEXT NOT NULL UNIQUE,                   -- never reused, even after delete
  sha256          TEXT NOT NULL CHECK (length(sha256) = 64),
  bytes           INTEGER NOT NULL CHECK (bytes > 0 AND bytes <= 8388608),
  width           INTEGER NOT NULL,
  height          INTEGER NOT NULL,
  mode            TEXT NOT NULL,
  canon_version   TEXT NOT NULL,
  palette_sha256  TEXT,
  alt             TEXT NOT NULL DEFAULT '',
  request_id      TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  approved_at     TEXT,
  approved_by     TEXT,
  supersedes      TEXT REFERENCES assets(asset_id),
  legacy_alias    TEXT,
  withdrawn_at    TEXT,                                   -- v1.1
  withdrawn_by    TEXT,                                   -- v1.1: admin token label
  withdraw_reason TEXT,                                   -- v1.1
  withdrawn_key   TEXT                                    -- v1.1: staging key under withdrawn/ (NULL after delete)
);
CREATE UNIQUE INDEX one_version   ON assets(vi, type, slot, version);
CREATE INDEX        assets_lookup ON assets(vi, type, slot, status, version DESC);
CREATE INDEX        assets_status ON assets(status);

CREATE TABLE requests (
  request_id    TEXT PRIMARY KEY,
  dedupe_key    TEXT NOT NULL,
  vi            TEXT NOT NULL,
  type          TEXT NOT NULL,
  slot          TEXT NOT NULL,
  purpose       TEXT NOT NULL,
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','urgent')),
  status        TEXT NOT NULL CHECK (status IN ('queued','claimed','generating','candidate_ready','in_review',
                  'published','rejected','needs_human','rejected_final','cancelled','failed','invalid')),
  attempts      INTEGER NOT NULL DEFAULT 0,
  lease_until   TEXT,
  claimed_by    TEXT,
  asset_id      TEXT REFERENCES assets(asset_id),
  last_error    TEXT,
  requester     TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  canon_version TEXT NOT NULL
);
CREATE UNIQUE INDEX one_open ON requests(dedupe_key)
  WHERE status NOT IN ('published','rejected_final','cancelled','failed');
CREATE INDEX requests_queue ON requests(status, priority, created_at);
CREATE INDEX requests_lease ON requests(status, lease_until);

CREATE TABLE request_subscribers (
  request_id TEXT NOT NULL REFERENCES requests(request_id),
  requester  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (request_id, requester)
);

CREATE TABLE candidates (
  candidate_id TEXT PRIMARY KEY,
  request_id   TEXT NOT NULL REFERENCES requests(request_id),
  staging_key  TEXT NOT NULL UNIQUE,
  sha256       TEXT NOT NULL CHECK (length(sha256) = 64),
  bytes        INTEGER NOT NULL CHECK (bytes > 0 AND bytes <= 8388608),   -- v1.1 (Q2): Content-Length for /blob
  content_type TEXT NOT NULL DEFAULT 'image/png',                         -- v1.1 (Q2): Content-Type for /blob
  sidecar_json TEXT NOT NULL,
  review_json  TEXT,
  status       TEXT NOT NULL CHECK (status IN ('candidate_ready','in_review','approved','rejected','expired')),
  uploaded_by  TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX candidates_review ON candidates(status, created_at);

CREATE TABLE events (
  id     INTEGER PRIMARY KEY,
  at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  actor  TEXT NOT NULL,
  kind   TEXT NOT NULL,   -- 'import','publish','claim','reject','canon-bump',
                          -- v1.1: 'candidate-blob-read','takedown-requested','takedown','restore','auth-fail'
  ref    TEXT,
  detail TEXT
);
CREATE INDEX events_ref ON events(ref);
CREATE INDEX events_at  ON events(at);
