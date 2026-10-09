-- Quantum Q# assignment registry. Store no name, email, phone number, or IP address.
CREATE TABLE IF NOT EXISTS q_numbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  install_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_q_numbers_created_at ON q_numbers(created_at);
