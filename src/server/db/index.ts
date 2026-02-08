/**
 * Database Module - SQLite connection and query helpers
 */

import Database from 'better-sqlite3';
import { SCHEMA, MIGRATIONS } from './schema.js';
import path from 'path';
import fs from 'fs';

// ============================================================
// DATABASE INSTANCE
// ============================================================

let db: Database.Database | null = null;

/**
 * Get the database file path
 */
function getDbPath(): string {
  const dataDir = path.join(process.cwd(), 'data');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return path.join(dataDir, 'kasgate.db');
}

/**
 * Initialize the database connection
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDbPath();
  console.log(`[KasGate] Initializing database at ${dbPath}`);

  db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(SCHEMA);

  // Run migrations
  db.exec(MIGRATIONS);

  console.log('[KasGate] Database initialized');

  return db;
}

/**
 * Get the database instance (throws if not initialized)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[KasGate] Database closed');
  }
}

// ============================================================
// QUERY HELPERS
// ============================================================

/**
 * Run a query and return all results
 */
export function query<T>(sql: string, params: any[] = []): T[] {
  const stmt = getDatabase().prepare(sql);
  return stmt.all(...params) as T[];
}

/**
 * Run a query and return the first result
 */
export function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  const stmt = getDatabase().prepare(sql);
  return stmt.get(...params) as T | undefined;
}

/**
 * Run an insert/update/delete and return the changes
 */
export function execute(sql: string, params: any[] = []): Database.RunResult {
  const stmt = getDatabase().prepare(sql);
  return stmt.run(...params);
}

/**
 * Run multiple statements in a transaction
 */
export function transaction<T>(fn: () => T): T {
  const txn = getDatabase().transaction(fn);
  return txn();
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Convert a Date to ISO string for SQLite
 */
export function toSqliteDate(date: Date): string {
  return date.toISOString();
}

/**
 * Convert a SQLite date string to Date
 */
export function fromSqliteDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Serialize JSON for storage
 */
export function toJson(value: any): string {
  return JSON.stringify(value);
}

/**
 * Parse JSON from storage
 */
export function fromJson<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
