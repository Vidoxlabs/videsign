-- 0003_idempotency.sql
CREATE TABLE idempotency_keys (
  token_id   TEXT NOT NULL,
  idem_key   TEXT NOT NULL,
  request_id TEXT NOT NULL REFERENCES requests(request_id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (token_id, idem_key)
);
