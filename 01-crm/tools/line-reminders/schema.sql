CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, revision TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reminders (
 id TEXT PRIMARY KEY, client_id TEXT NOT NULL, due INTEGER NOT NULL,
 payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reminders_due ON reminders(due);
CREATE INDEX IF NOT EXISTS reminders_client ON reminders(client_id);
CREATE TABLE IF NOT EXISTS deliveries (
 event TEXT PRIMARY KEY, retry_key TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0, lease INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0, last_status INTEGER, sent_at INTEGER
);
