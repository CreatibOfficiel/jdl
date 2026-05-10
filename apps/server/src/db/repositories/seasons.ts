import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../index';
import { gamePlayerStats, seasonGames, seasons } from '../schema';

export function createSeason(name: string): { id: string; name: string; createdAt: number } {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Season name required');
  const id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = Date.now();
  db.insert(seasons).values({ id, name: trimmed, createdAt }).run();
  return { id, name: trimmed, createdAt };
}

export function getSeasonById(seasonId: string) {
  return db.select().from(seasons).where(eq(seasons.id, seasonId)).get();
}

export function listSeasons(limit = 50) {
  return db.select().from(seasons).orderBy(desc(seasons.createdAt)).limit(limit).all();
}

export function addGameToSeason(seasonId: string, gameId: string): boolean {
  const season = getSeasonById(seasonId);
  if (!season) return false;
  try {
    db.insert(seasonGames)
      .values({ seasonId, gameId, addedAt: Date.now() })
      .onConflictDoNothing()
      .run();
    return true;
  } catch {
    return false;
  }
}

export function getSeasonGameIds(seasonId: string): string[] {
  return db
    .select({ gameId: seasonGames.gameId })
    .from(seasonGames)
    .where(eq(seasonGames.seasonId, seasonId))
    .all()
    .map((r) => r.gameId);
}

/** Aggregate per-player totals across all games in a season. */
export function getSeasonStandings(seasonId: string) {
  const ids = getSeasonGameIds(seasonId);
  if (ids.length === 0) return [];
  return db
    .select({
      playerId: gamePlayerStats.playerId,
      name: gamePlayerStats.name,
      games: sql<number>`COUNT(*)`.as('games'),
      wins: sql<number>`SUM(${gamePlayerStats.won})`.as('wins'),
      sipsTaken: sql<number>`SUM(${gamePlayerStats.sipsTaken})`.as('sipsTaken'),
      sipsGiven: sql<number>`SUM(${gamePlayerStats.sipsGiven})`.as('sipsGiven'),
      equivalenceUnits: sql<number>`SUM(${gamePlayerStats.equivalenceUnitsCompleted})`.as(
        'equivalenceUnits',
      ),
    })
    .from(gamePlayerStats)
    .where(inArray(gamePlayerStats.gameId, ids))
    .groupBy(gamePlayerStats.playerId)
    .orderBy(desc(sql`wins`), desc(sql`sipsTaken`))
    .all();
}
