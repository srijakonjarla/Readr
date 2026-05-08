import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

// All persisted state lives under data/ at the repo root. Resolves from
// process.cwd() so it works in dev (next dev) and in compiled builds.
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Hold a single shared connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __readrDb?: DatabaseSync };

export const db: DatabaseSync =
  globalForDb.__readrDb ??
  (globalForDb.__readrDb = new DatabaseSync(path.join(DATA_DIR, "readr.db")));

// Schema migration — idempotent.
db.exec(`
  CREATE TABLE IF NOT EXISTS highlights (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    kind TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    chapter_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    thread_count INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_highlights_filename ON highlights(filename);

  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    title TEXT NOT NULL,
    anchor_text TEXT,
    chapter_index INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_threads_filename ON threads(filename);

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    anchor INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, id);

  CREATE TABLE IF NOT EXISTS reading_state (
    filename TEXT PRIMARY KEY,
    last_chapter_index INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`);

db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");
