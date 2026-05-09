import { applyMove, FINISH } from '@jeu-soiree/game-logic';
import { DEFAULT_GAME_CONFIG } from '@jeu-soiree/shared';
import type { GameRoom } from '../rooms/GameRoom';
import type { BoardCaseSchema } from '../schemas/BoardCaseSchema';
import type { Player } from '../schemas/Player';
import { startRailDeBus } from './cases/railDeBus';
import { pushEvent } from './eventLog';
import { applyDistribute, applyDrink } from './sipsHelper';

const PHASE4_PENDING: Record<string, { emoji: string; label: string }> = {};

const SUIT_SYMBOL: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export function resolveCaseEffect(room: GameRoom, player: Player): void {
  if (player.position === 0) return;

  if (player.position === FINISH) {
    room.state.phase = 'finished';
    room.state.winnerId = player.id;
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'victory',
      text: `🏆 ${player.name} GAGNE LA PARTIE !`,
      importance: 'epic',
    });
    room.persistIfFinished();
    return;
  }

  const caseData = findCase(room, player.position);
  if (!caseData) return;

  switch (caseData.caseType) {
    case 'neutral':
      return;

    case 'vacances':
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'vacances',
        text: `🌴 ${player.name} est en vacances. Profite !`,
        importance: 'normal',
      });
      return;

    case 'red_number':
      if (isInThirstZone(room, player.position)) {
        applyDrink(room, {
          player,
          sips: caseData.numberValue,
          emoji: '🍻',
          kind: 'red_drink',
          reason: 'zone soif',
        });
      } else {
        applyDistribute(room, player, caseData.numberValue, '🎁', 'red_distribute');
      }
      return;

    case 'green_number':
      applyDistribute(room, player, caseData.numberValue, '🎁', 'green_distribute');
      return;

    case 'formule1':
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'formule1',
        text: `🏎️ ${player.name} prend la Formule 1 → +4 cases !`,
        importance: 'high',
      });
      moveExtra(room, player, 4);
      return;

    case 'usain':
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'usain',
        text: `⚡ ${player.name} sprint Usain Bolt → +2 cases !`,
        importance: 'high',
      });
      moveExtra(room, player, 2);
      return;

    case 'spades':
    case 'hearts':
    case 'diamonds':
    case 'clubs': {
      const sips = DEFAULT_GAME_CONFIG.sipsPerCard;
      const symbol = SUIT_SYMBOL[caseData.caseType] ?? '?';
      if (caseData.caseType === player.suit) {
        applyDistribute(room, player, sips, symbol, 'card_match', 'son signe');
      } else {
        applyDrink(room, {
          player,
          sips,
          emoji: symbol,
          kind: 'card_mismatch',
          reason: 'pas son signe',
        });
      }
      return;
    }

    case 'portal': {
      const partner = findPortalPair(room, caseData);
      if (!partner) {
        pushEvent(room.state, {
          playerId: player.id,
          kind: 'portal_orphan',
          text: `🌀 ${player.name} tombe sur un portail orphelin (?)`,
          importance: 'normal',
        });
        return;
      }
      player.lastTeleport = true;
      player.position = partner.index;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'teleport',
        text: `🌀 ${player.name} traverse le portail → case ${partner.index}`,
        importance: 'high',
      });
      // Per §10.3: arriving via portal does NOT trigger the destination case effect
      return;
    }

    case 'bromance':
      room.state.activeModal = 'bromance';
      room.state.activeModalPlayerId = player.id;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'bromance_open',
        text: `💪 ${player.name} doit choisir un partenaire de bromance`,
        importance: 'high',
      });
      return;

    case 'shop':
      room.state.activeModal = 'shop';
      room.state.activeModalPlayerId = player.id;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'shop_open',
        text: `🛒 ${player.name} arrive au Shop`,
        importance: 'normal',
      });
      return;

    case 'prison':
      player.prisonTurnsLeft = 4;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'prison_caught',
        text: `🔒 ${player.name} est en PRISON ! (max 4 tours pour s'échapper)`,
        importance: 'high',
      });
      return;

    case 'hole': {
      const dice = 1 + Math.floor(Math.random() * 6);
      player.holeTurnsLeft = dice;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'hole_caught',
        text: `🕳️ ${player.name} tombe dans un trou et lance ${dice} → bloqué ${dice} tour(s)`,
        importance: 'high',
      });
      return;
    }

    case 'pills':
      room.state.activeModal = 'pills';
      room.state.activeModalPlayerId = player.id;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'pill_open',
        text: `💊 ${player.name} doit choisir : pilule ROUGE ou BLEUE ?`,
        importance: 'high',
      });
      return;

    case 'witch':
      player.inventory.push('potion');
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'witch_potion_get',
        text: `🧙 ${player.name} reçoit une potion ! (utilisable plus tard)`,
        importance: 'high',
      });
      return;

    case 'rail_de_bus':
      startRailDeBus(room, player);
      return;

    default: {
      const meta = PHASE4_PENDING[caseData.caseType] ?? { emoji: '·', label: caseData.caseType };
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'phase4_pending',
        text: `${meta.emoji} ${player.name} tombe sur ${meta.label} — effet à venir`,
        importance: 'normal',
      });
    }
  }
}

function moveExtra(room: GameRoom, player: Player, delta: number): void {
  const move = applyMove(player.position, delta);
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
}

function findCase(room: GameRoom, position: number): BoardCaseSchema | null {
  for (const c of room.state.board) {
    if (c.index === position) return c;
  }
  return null;
}

function findPortalPair(room: GameRoom, current: BoardCaseSchema): BoardCaseSchema | null {
  for (const c of room.state.board) {
    if (
      c.caseType === 'portal' &&
      c.portalPairId === current.portalPairId &&
      c.index !== current.index
    ) {
      return c;
    }
  }
  return null;
}

function isInThirstZone(room: GameRoom, position: number): boolean {
  const start = room.state.thirstZoneStart;
  const end = start + room.state.thirstZoneLength - 1;
  return position >= start && position <= end;
}
