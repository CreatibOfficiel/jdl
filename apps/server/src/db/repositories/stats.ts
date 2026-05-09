import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../index';
import { gamePlayerStats, games, players, sipEvents } from '../schema';

export function getTopDrinkers(limit = 10) {
  return db.select().from(players).orderBy(desc(players.totalSipsTaken)).limit(limit).all();
}

export function getTopGivers(limit = 10) {
  return db.select().from(players).orderBy(desc(players.totalSipsGiven)).limit(limit).all();
}

export function getTopWinners(limit = 10) {
  return db.select().from(players).orderBy(desc(players.totalWins)).limit(limit).all();
}

export function getTopAthletes(limit = 10) {
  return db
    .select()
    .from(players)
    .orderBy(desc(players.totalEquivalenceUnits))
    .limit(limit)
    .all();
}

export function getRecentGames(limit = 10) {
  return db.select().from(games).orderBy(desc(games.startedAt)).limit(limit).all();
}

export function getGameStats(gameId: string) {
  return db.select().from(gamePlayerStats).where(eq(gamePlayerStats.gameId, gameId)).all();
}

export function getGameSipEvents(gameId: string) {
  return db
    .select()
    .from(sipEvents)
    .where(eq(sipEvents.gameId, gameId))
    .orderBy(asc(sipEvents.ts))
    .all();
}

export function getGameById(gameId: string) {
  return db.select().from(games).where(eq(games.id, gameId)).get();
}
