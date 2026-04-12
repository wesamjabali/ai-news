import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";

let _db: SqlJsDatabase | null = null;
let _initPromise: Promise<SqlJsDatabase> | null = null;

const dataDir = join(process.cwd(), ".data");
const dbPath = join(dataDir, "news.db");

function getDb(): Promise<SqlJsDatabase> {
  if (_db) return Promise.resolve(_db);
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const SQL = await initSqlJs();
    mkdirSync(dataDir, { recursive: true });

    if (existsSync(dbPath)) {
      const buffer = readFileSync(dbPath);
      _db = new SQL.Database(buffer);
    } else {
      _db = new SQL.Database();
    }

    _db.run(`
      CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    return _db;
  })();

  return _initPromise;
}

function saveDb() {
  if (_db) {
    const data = _db.export();
    writeFileSync(dbPath, Buffer.from(data));
  }
}

type SummaryRow = { id: number; content: string; createdAt: string };

export async function getLatestSummary(): Promise<SummaryRow | undefined> {
  const db = await getDb();
  const result = db.exec(
    `SELECT id, content, created_at as createdAt FROM summaries ORDER BY created_at DESC LIMIT 1`,
  );
  if (result.length === 0 || result[0].values.length === 0) return undefined;
  const [id, content, createdAt] = result[0].values[0];
  return {
    id: id as number,
    content: content as string,
    createdAt: createdAt as string,
  };
}

export async function insertSummary(content: string) {
  const db = await getDb();
  db.run(`INSERT INTO summaries (content) VALUES (?)`, [content]);
  const result = db.exec(`SELECT last_insert_rowid()`);
  saveDb();
  return result[0].values[0][0];
}

export async function getRecentSummaryCount(minutes = 60): Promise<number> {
  const db = await getDb();
  const result = db.exec(
    `SELECT COUNT(*) FROM summaries WHERE created_at > datetime('now', '-' || ? || ' minutes')`,
    [minutes],
  );
  if (result.length === 0) return 0;
  return result[0].values[0][0] as number;
}

export async function getSummaryById(
  id: number,
): Promise<SummaryRow | undefined> {
  const db = await getDb();
  const result = db.exec(
    `SELECT id, content, created_at as createdAt FROM summaries WHERE id = ?`,
    [id],
  );
  if (result.length === 0 || result[0].values.length === 0) return undefined;
  const [rowId, content, createdAt] = result[0].values[0];
  return {
    id: rowId as number,
    content: content as string,
    createdAt: createdAt as string,
  };
}

export async function getAllSummaries(): Promise<SummaryRow[]> {
  const db = await getDb();
  const result = db.exec(
    `SELECT id, content, created_at as createdAt FROM summaries ORDER BY created_at DESC`,
  );
  if (result.length === 0) return [];
  return result[0].values.map(([id, content, createdAt]) => ({
    id: id as number,
    content: content as string,
    createdAt: createdAt as string,
  }));
}
