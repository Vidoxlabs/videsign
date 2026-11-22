-- Failed-auth counters. subject_hash is HMAC-SHA256 with the Worker secret
-- THROTTLE_HMAC_KEY. The two buckets are domain-separated:
--   ip:         IPv4 truncated to /24, or IPv6 truncated to /64
--   credential: the first 8 characters after the auth scheme
-- The address, the credential, the prefix, and the HMAC input are not stored.
-- A recorded failure deletes rows whose window_start is older than 2 hours.
-- That purge, and at most one auth-fail event per window, run inside the counter write.
CREATE TABLE auth_fail_windows (
  subject_hash TEXT NOT NULL CHECK (length(subject_hash) = 64),
  window_kind  TEXT NOT NULL CHECK (window_kind IN ('m', 'h')),
  window_start TEXT NOT NULL,
  hits         INTEGER NOT NULL CHECK (hits > 0),
  PRIMARY KEY (subject_hash, window_kind, window_start)
);
CREATE INDEX auth_fail_windows_window_start ON auth_fail_windows(window_start);

CREATE TRIGGER auth_fail_purge_insert
AFTER INSERT ON auth_fail_windows
WHEN NEW.window_kind = 'm'
BEGIN
  DELETE FROM auth_fail_windows
  WHERE window_start < strftime('%Y-%m-%dT%H:%M:%fZ', NEW.window_start, '-2 hours');
END;

CREATE TRIGGER auth_fail_purge_update
AFTER UPDATE ON auth_fail_windows
WHEN NEW.window_kind = 'm'
BEGIN
  DELETE FROM auth_fail_windows
  WHERE window_start < strftime('%Y-%m-%dT%H:%M:%fZ', NEW.window_start, '-2 hours');
END;

CREATE TRIGGER auth_fail_event
AFTER INSERT ON auth_fail_windows
WHEN NEW.hits = 1
BEGIN
  INSERT INTO events (actor, kind, ref, detail)
  SELECT 'service', 'auth-fail',
         NEW.window_kind || '-' || lower(substr(replace(replace(NEW.window_start, '-', ''), ':', ''), 1,
           CASE NEW.window_kind WHEN 'm' THEN 13 ELSE 11 END)),
         '{"status":401,"reason_code":"unauthorized"}'
  WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE kind = 'auth-fail'
      AND ref = NEW.window_kind || '-' || lower(substr(replace(replace(NEW.window_start, '-', ''), ':', ''), 1,
            CASE NEW.window_kind WHEN 'm' THEN 13 ELSE 11 END))
  );
END;
