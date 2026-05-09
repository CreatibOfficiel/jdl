import { desc, eq } from 'drizzle-orm';
import { db } from '../index';
import { gamePlayerStats, games, players } from '../schema';

export function getTopDrinkers(limit = 10) {
  return db.select().from(players).orderBy(desc(players.totalSipsTaken)).limit(limit).all();
}

export function getTopGivers(limit = 10) {
  return db.select().from(players).orderBy(desc(players.totalSipsGiven)).limit(limit).all();
}

export function getTopWinners(limit = 10) {
  return db.select().from(players).orderBy(desc(players.totalWins)).limit(limit).all();
}

export function getRecentGames(limit = 10) {
  return db.select().from(games).orderBy(desc(games.startedAt)).limit(limit).all();
}

export function getGameStats(gameId: string) {
  return db.select().from(gamePlayerStats).where(eq(gamePlayerStats.gameId, gameId)).all();
}
