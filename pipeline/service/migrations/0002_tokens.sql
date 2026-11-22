-- 0002_tokens.sql
CREATE TABLE tokens (
  token_id     TEXT PRIMARY KEY,
  scope        TEXT NOT NULL CHECK (scope IN ('request','forge','canon','admin')),
  token_hash   TEXT NOT NULL UNIQUE,                      -- HMAC-SHA256(VI_TOKEN_PEPPER, token)
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  revoked_at   TEXT,
  last_used_at TEXT,
  note         TEXT
);
CREATE INDEX tokens_active ON tokens(scope) WHERE revoked_at IS NULL;
