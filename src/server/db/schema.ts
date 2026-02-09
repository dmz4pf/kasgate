/**
 * Database Schema - SQLite table definitions
 */

export const SCHEMA = `
-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  xpub TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  webhook_url TEXT,
  webhook_secret TEXT,
  next_address_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Payment sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  address TEXT NOT NULL,
  address_index INTEGER NOT NULL,
  amount TEXT NOT NULL,  -- sompi as string (bigint)
  status TEXT DEFAULT 'pending',
  tx_id TEXT,
  confirmations INTEGER DEFAULT 0,
  order_id TEXT,
  metadata TEXT,  -- JSON string
  redirect_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  paid_at TEXT,
  confirmed_at TEXT
);

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_address ON sessions(address);
CREATE INDEX IF NOT EXISTS idx_sessions_merchant ON sessions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Webhooks table (configured webhooks)
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL,  -- JSON array of event types
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id),
  session_id TEXT NOT NULL REFERENCES sessions(id),
  event TEXT NOT NULL,
  payload TEXT NOT NULL,  -- JSON string
  delivery_id TEXT,  -- Bug #14: Unique ID for replay protection/idempotency
  status_code INTEGER,
  response TEXT,
  attempts INTEGER DEFAULT 0,
  next_retry_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  delivered_at TEXT
);

-- Create index for webhook log lookups
CREATE INDEX IF NOT EXISTS idx_webhook_logs_session ON webhook_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry ON webhook_logs(next_retry_at);
`;

/**
 * Migration to add any missing columns (for upgrades)
 */
export const MIGRATIONS = `
-- Add api_key_hash for timing-safe API key verification (Bug #3)
ALTER TABLE merchants ADD COLUMN api_key_hash TEXT;

-- Add subscription_token for WebSocket authentication (Bug #5)
ALTER TABLE sessions ADD COLUMN subscription_token TEXT;

-- Add delivery_id for webhook replay protection/idempotency (Bug #14)
ALTER TABLE webhook_logs ADD COLUMN delivery_id TEXT;
`;
