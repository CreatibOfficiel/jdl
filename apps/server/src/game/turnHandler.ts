import { applyMove, nextTurnIndex } from '@jeu-soiree/game-logic';
import { isDifficultyLevel, SAFETY_BY_DIFFICULTY } from '@jeu-soiree/shared';
import type { Client } from 'colyseus';
import type { GameRoom } from '../rooms/GameRoom';
import type { Player } from '../schemas/Player';
import { checkTreasure } from './cases/treasure';
import { resolveCaseEffect } from './effectsResolver';
import { pushEvent } from './eventLog';

const DICE_FACES = 6;

function rollDie(): number {
  return 1 + Math.floor(Math.random() * DICE_FACES);
}

function rollPlayerDie(player: Player): number {
  if (player.pendingForcedDice > 0) {
    const value = player.pendingForcedDice;
    player.pendingForcedDice = 0;
    return value;
  }
  return rollDie();
}

export function handleRollDice(room: GameRoom, client: Client): void {
  if (room.state.phase !== 'playing') return;

  const expectedId = room.state.turnOrder[room.state.currentTurnIndex];
  if (expectedId !== client.sessionId) return;

  const player = room.state.players.get(client.sessionId);
  if (!player) return;

  if (player.prisonTurnsLeft > 0) {
    handlePrisonTurn(room, player);
    return;
  }

  if (player.holeTurnsLeft > 0) {
    handleHoleTurn(room, player);
    return;
  }

  handleNormalRoll(room, player);
}

function handleNormalRoll(room: GameRoom, player: Player): void {
  const wasForced = player.pendingForcedDice > 0;
  const dice = rollPlayerDie(player);
  room.state.lastDiceRoll = dice;
  player.lastTeleport = false;
  player.diceRolls += 1;

  pushEvent(room.state, {
    playerId: player.id,
    kind: 'roll_dice',
    text: `🎲 ${player.name} fait ${dice}${wasForced ? ' (dé pipé)' : ''}`,
    importance: 'normal',
  });

  const move = applyMove(player.position, dice);
  player.position = move.newPosition;

  if (move.bounced) {
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'bounce',
      text: `↩️ ${player.name} dépasse l'arrivée et recule à ${move.newPosition}`,
      importance: 'normal',
    });
  }

  resolveCaseEffect(room, player);

  if (room.state.winnerId) return;
  if (room.state.activeModal) return;

  checkTreasure(room, player);
  if (room.state.activeModal) return;

  advanceTurn(room);
}

function handlePrisonTurn(room: GameRoom, player: Player): void {
  // Last turn → auto-release and play normally
  if (player.prisonTurnsLeft === 1) {
    player.prisonTurnsLeft = 0;
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'prison_release_auto',
      text: `⏰ ${player.name} sort de prison automatiquement et lance le dé`,
      importance: 'high',
    });
    handleNormalRoll(room, player);
    return;
  }

  const dice = rollDie();
  room.state.lastDiceRoll = dice;
  pushEvent(room.state, {
    playerId: player.id,
    kind: 'prison_attempt',
    text: `🔒 ${player.name} tente l'évasion → ${dice}`,
    importance: 'normal',
  });

  if (dice === 6) {
    player.prisonTurnsLeft = 0;
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'prison_escape',
      text: `🔓 ${player.name} fait un 6 — libéré !`,
      importance: 'high',
    });
  } else {
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'prison_drink',
      text: `🍻 ${player.name} boit 1 gorgée (encore ${player.prisonTurnsLeft - 1} tour(s) en prison)`,
      importance: 'normal',
    });
    player.prisonTurnsLeft -= 1;
  }

  advanceTurn(room);
}

function handleHoleTurn(room: GameRoom, player: Player): void {
  player.lastTeleport = false;
  const move = applyMove(player.position, 1);
  player.position = move.newPosition;
  player.holeTurnsLeft -= 1;

  pushEvent(room.state, {
    playerId: player.id,
    kind: 'hole_step',
    text: `🕳️ ${player.name} progresse d'1 case${player.holeTurnsLeft > 0 ? ` (${player.holeTurnsLeft} tour(s) restant(s) dans le trou)` : ' (sort du trou)'}`,
    importance: 'normal',
  });

  resolveCaseEffect(room, player);
  if (room.state.winnerId) return;
  if (room.state.activeModal) return;
  checkTreasure(room, player);
  if (room.state.activeModal) return;
  advanceTurn(room);
}

function advanceTurn(room: GameRoom): void {
  const total = room.state.turnOrder.length;
  if (total === 0) return;

  room.totalTurnCount += 1;

  // Hydration prompt every N global turns. Per-difficulty cadence; never per-player.
  const level = isDifficultyLevel(room.state.difficultyLevel) ? room.state.difficultyLevel : 'medium';
  const cadence = SAFETY_BY_DIFFICULTY[level].hydrationEveryNTurns;
  if (cadence > 0 && room.totalTurnCount % cadence === 0) {
    pushEvent(room.state, {
      kind: 'hydration',
      text: `💧 Pause hydratation — un verre d'eau pour tout le monde 💧`,
      importance: 'high',
    });
    room.state.totalHydrationPrompts += 1;
  }

  room.state.currentTurnIndex = nextTurnIndex(room.state.currentTurnIndex, total);

  for (let attempts = 0; attempts < total; attempts++) {
    const id = room.state.turnOrder[room.state.currentTurnIndex];
    if (!id) return;
    const player = room.state.players.get(id);
    if (player?.connected) return;
    room.state.currentTurnIndex = nextTurnIndex(room.state.currentTurnIndex, total);
  }
}

/** Public so case handlers can advance the turn after the player resolves a modal. */
export function endTurn(room: GameRoom): void {
  advanceTurn(room);
}
