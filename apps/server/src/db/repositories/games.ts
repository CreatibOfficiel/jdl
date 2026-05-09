import { eq, sql } from 'drizzle-orm';
import type { GameState } from '../../schemas/GameState';
import type { SipEvent } from '../../schemas/SipEvent';
import { db, normalizePseudoId } from '../index';
import { gamePlayerStats, games, players, sipEvents } from '../schema';

interface PersistFinishedGameInput {
  roomId: string;
  startedAt: number;
  state: GameState;
  /** Unbounded mirror of every SipEvent emitted in the room. The state.sipEvents buffer
   *  is capped at 200 for client-sync efficiency; we persist the full history instead. */
  allSipEvents: ReadonlyArray<SipEvent>;
}

export function persistFinishedGame(input: PersistFinishedGameInput): void {
  const { roomId, startedAt, state, allSipEvents } = input;
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

      // Increment lifetime totals (always bump equivalence units regardless of the host's
      // countEquivalenceAsSips toggle — the toggle only affects whether sipsTaken was bumped
      // in the first place inside applySipToPlayer).
      tx.update(players)
        .set({
          totalGames: sql`${players.totalGames} + 1`,
          totalWins: sql`${players.totalWins} + ${won}`,
          totalSipsTaken: sql`${players.totalSipsTaken} + ${p.sipsTaken}`,
          totalSipsGiven: sql`${players.totalSipsGiven} + ${p.sipsGiven}`,
          totalEquivalenceUnits: sql`${players.totalEquivalenceUnits} + ${p.equivalenceUnitsCompleted}`,
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
          equivalencePreference: p.equivalencePreference || null,
          equivalenceUnitsCompleted: p.equivalenceUnitsCompleted,
        })
        .onConflictDoNothing()
        .run();
    });

    // Resolve sessionId → normalized pseudoId so /stats heatmaps are stable across reconnects
    const sessionToPseudoId = new Map<string, string>();
    state.players.forEach((p) => {
      sessionToPseudoId.set(p.id, normalizePseudoId(p.name));
    });

    if (allSipEvents.length > 0) {
      const rows = allSipEvents.map((e) => ({
        gameId: roomId,
        ts: e.ts,
        fromId: e.fromId ? (sessionToPseudoId.get(e.fromId) ?? null) : null,
        toId: sessionToPseudoId.get(e.toId) ?? e.toId,
        count: e.count,
        source: e.source,
        equivalence: e.equivalence || null,
      }));
      // Drizzle insertMany via .values(arr)
      tx.insert(sipEvents).values(rows).run();
    }
  });
}
