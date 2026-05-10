import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
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
  return db.select().from(players).orderBy(desc(players.totalEquivalenceUnits)).limit(limit).all();
}

export function getPlayerById(playerId: string) {
  return db.select().from(players).where(eq(players.id, playerId)).get();
}

export function getPlayerRecentGames(playerId: string, limit = 20) {
  return db
    .select({
      gameId: gamePlayerStats.gameId,
      sipsTaken: gamePlayerStats.sipsTaken,
      sipsGiven: gamePlayerStats.sipsGiven,
      equivalenceUnitsCompleted: gamePlayerStats.equivalenceUnitsCompleted,
      diceRolls: gamePlayerStats.diceRolls,
      finishedPosition: gamePlayerStats.finishedPosition,
      won: gamePlayerStats.won,
      seed: games.seed,
      startedAt: games.startedAt,
      endedAt: games.endedAt,
      playerCount: games.playerCount,
    })
    .from(gamePlayerStats)
    .innerJoin(games, eq(gamePlayerStats.gameId, games.id))
    .where(eq(gamePlayerStats.playerId, playerId))
    .orderBy(desc(games.startedAt))
    .limit(limit)
    .all();
}

/** Aggregate top "duos toxiques" — pairs with the most cumulative sip flow.
 *  Skips events with empty fromId (auto-drinks) or empty toId (distribute-without-target). */
export function getTopPairs(limit = 10) {
  return db
    .select({
      fromId: sipEvents.fromId,
      toId: sipEvents.toId,
      total: sql<number>`SUM(${sipEvents.count})`.as('total'),
    })
    .from(sipEvents)
    .where(
      and(
        isNotNull(sipEvents.fromId),
        sql`${sipEvents.fromId} != ''`,
        sql`${sipEvents.toId} != ''`,
      ),
    )
    .groupBy(sipEvents.fromId, sipEvents.toId)
    .orderBy(desc(sql`total`))
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
