-- Quantum Q# identity and messaging storage. No names, emails, phone numbers, or IP addresses.
CREATE TABLE IF NOT EXISTS q_numbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  install_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_q_numbers_created_at ON q_numbers(created_at);

-- Device bearer credentials are stored only as SHA-256 hashes. Recovery is not implemented.
CREATE TABLE IF NOT EXISTS q_devices (
  install_id TEXT PRIMARY KEY,
  q_number_id INTEGER NOT NULL UNIQUE REFERENCES q_numbers(id),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_q_devices_q_number ON q_devices(q_number_id);

-- Initial message transport stores message text in D1. Do not describe this version as
-- end-to-end encrypted; E2EE key exchange and encrypted payloads are a separate release gate.
CREATE TABLE IF NOT EXISTS q_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES q_numbers(id),
  recipient_id INTEGER NOT NULL REFERENCES q_numbers(id),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_q_messages_inbox ON q_messages(recipient_id, id);
