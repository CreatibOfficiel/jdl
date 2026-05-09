import { eq, sql } from 'drizzle-orm';
import type { GameState } from '../../schemas/GameState';
import { db, normalizePseudoId } from '../index';
import { gamePlayerStats, games, players } from '../schema';

interface PersistFinishedGameInput {
  roomId: string;
  startedAt: number;
  state: GameState;
}

export function persistFinishedGame(input: PersistFinishedGameInput): void {
  const { roomId, startedAt, state } = input;
  if (state.phase !== 'finished') return;
  const endedAt = Date.now();

  db.transaction((tx) => {
    // Idempotent insert of the game row
    tx.insert(games)
      .values({
        id: roomId,
        seed: state.boardSeed,
        startedAt,
        endedAt,
        winnerId: state.winnerId || null,
        playerCount: state.players.size,
      })
      .onConflictDoUpdate({
        target: games.id,
        set: { endedAt, winnerId: state.winnerId || null },
      })
      .run();

    state.players.forEach((p) => {
      const playerId = normalizePseudoId(p.name);
      const won = p.id === state.winnerId ? 1 : 0;

      // Upsert player profile
      tx.insert(players)
        .values({
          id: playerId,
          name: p.name,
          createdAt: Date.now(),
        })
        .onConflictDoNothing()
        .run();

      // Increment lifetime totals
      tx.update(players)
        .set({
          totalGames: sql`${players.totalGames} + 1`,
          totalWins: sql`${players.totalWins} + ${won}`,
          totalSipsTaken: sql`${players.totalSipsTaken} + ${p.sipsTaken}`,
          totalSipsGiven: sql`${players.totalSipsGiven} + ${p.sipsGiven}`,
          name: p.name,
        })
        .where(eq(players.id, playerId))
        .run();

      // Per-game record
      tx.insert(gamePlayerStats)
        .values({
          gameId: roomId,
          playerId,
          name: p.name,
          sipsTaken: p.sipsTaken,
          sipsGiven: p.sipsGiven,
          shopPurchases: p.shopPurchases,
          diceRolls: p.diceRolls,
          finishedPosition: p.position,
          won,
        })
        .onConflictDoNothing()
        .run();
    });
  });
}
