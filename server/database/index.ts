import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join } from "path";

let _db: ReturnType<typeof Database> | null = null;

function getDb() {
  if (!_db) {
    const dataDir = join(process.cwd(), ".data");
    mkdirSync(dataDir, { recursive: true });
    _db = new Database(join(dataDir, "news.db"));
    _db.pragma("journal_mode = WAL");
    _db.exec(`
      CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }
  return _db;
}

export function getLatestSummary() {
  return getDb()
    .prepare(
      `SELECT id, content, created_at as createdAt FROM summaries ORDER BY created_at DESC LIMIT 1`,
    )
    .get() as { id: number; content: string; createdAt: string } | undefined;
}

export function insertSummary(content: string) {
  const stmt = getDb().prepare(`INSERT INTO summaries (content) VALUES (?)`);
  const result = stmt.run(content);
  return result.lastInsertRowid;
}

export function getAllSummaries() {
  return getDb()
    .prepare(
      `SELECT id, content, created_at as createdAt FROM summaries ORDER BY created_at DESC`,
    )
    .all() as { id: number; content: string; createdAt: string }[];
}
