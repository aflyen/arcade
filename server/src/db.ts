import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "./data/arcade.db";

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id    TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    score      INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores(game_id, score DESC);
`);

export type ScoreRow = {
  id: number;
  game_id: string;
  name: string;
  score: number;
  created_at: string;
};

const topStmt = db.prepare<[string], ScoreRow>(
  `SELECT id, game_id, name, score, created_at
   FROM scores
   WHERE game_id = ?
   ORDER BY score DESC, created_at ASC
   LIMIT 10`,
);

const insertStmt = db.prepare(
  `INSERT INTO scores (game_id, name, score) VALUES (?, ?, ?)`,
);

const rankStmt = db.prepare<[string, number], { cnt: number }>(
  `SELECT COUNT(*) AS cnt FROM scores WHERE game_id = ? AND score > ?`,
);

export function getTop(gameId: string): ScoreRow[] {
  return topStmt.all(gameId);
}

export function insertScore(gameId: string, name: string, score: number): {
  id: number | bigint;
  rank: number;
  isTop10: boolean;
} {
  const info = insertStmt.run(gameId, name, score);
  const betterCount = rankStmt.get(gameId, score)?.cnt ?? 0;
  const rank = betterCount + 1;
  return { id: info.lastInsertRowid, rank, isTop10: rank <= 10 };
}
