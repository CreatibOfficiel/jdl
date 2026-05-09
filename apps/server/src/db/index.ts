import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DB_PATH = resolve(process.env.DB_PATH ?? './data/jeu-soiree.db');

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

ensureDir(DB_PATH);

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Inline migration — keep it idempotent. Avoids needing drizzle-kit at deploy time.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    seed TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    winner_id TEXT,
    player_count INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    total_games INTEGER NOT NULL DEFAULT 0,
    total_wins INTEGER NOT NULL DEFAULT 0,
    total_sips_taken INTEGER NOT NULL DEFAULT 0,
    total_sips_given INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS game_player_stats (
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sips_taken INTEGER NOT NULL DEFAULT 0,
    sips_given INTEGER NOT NULL DEFAULT 0,
    shop_purchases INTEGER NOT NULL DEFAULT 0,
    dice_rolls INTEGER NOT NULL DEFAULT 0,
    finished_position INTEGER,
    won INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (game_id, player_id)
  );
  CREATE TABLE IF NOT EXISTS sip_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    from_id TEXT,
    to_id TEXT NOT NULL,
    count INTEGER NOT NULL,
    source TEXT NOT NULL,
    equivalence TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_games_started_at ON games(started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_gps_player ON game_player_stats(player_id);
  CREATE INDEX IF NOT EXISTS idx_sip_events_game ON sip_events(game_id);
`);

export const db = drizzle(sqlite, { schema });
export { schema };
export const sqliteRaw = sqlite;

export function normalizePseudoId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}
