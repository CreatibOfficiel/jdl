import type { Client } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom';
import type { Player } from '../../schemas/Player';
import { pushEvent } from '../eventLog';
import { applyDrink } from '../sipsHelper';
import { endTurn } from '../turnHandler';

interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: number;
}

const SUITS: ReadonlyArray<Card['suit']> = ['spades', 'hearts', 'diamonds', 'clubs'];
const SUIT_SYMBOL: Record<Card['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i] as Card;
    deck[i] = deck[j] as Card;
    deck[j] = tmp;
  }
  return deck;
}

function cardToString(c: Card): string {
  const r =
    c.rank === 1
      ? 'A'
      : c.rank === 11
        ? 'J'
        : c.rank === 12
          ? 'Q'
          : c.rank === 13
            ? 'K'
            : String(c.rank);
  return `${r}${SUIT_SYMBOL[c.suit]}`;
}

interface RailRuntime {
  deck: Card[];
  drawn: Card[];
  playerId: string;
}

const sessions = new WeakMap<GameRoom, RailRuntime>();

/** Called when a player lands on the rail_de_bus case. */
export function startRailDeBus(room: GameRoom, player: Player): void {
  const deck = makeDeck();
  const first = deck.pop();
  if (!first) return;
  sessions.set(room, { deck, drawn: [first], playerId: player.id });

  room.state.railRound = 1;
  room.state.railCards.clear();
  room.state.railCards.push(cardToString(first));
  room.state.activeModal = 'rail_de_bus';
  room.state.activeModalPlayerId = player.id;

  pushEvent(room.state, {
    playerId: player.id,
    kind: 'rail_open',
    text: `🎴 ${player.name} arrive au Rail de bus — manche 1/4 (couleur)`,
    importance: 'high',
  });
}

interface AnswerMessage {
  answer: string;
}

export function handleRailAnswer(room: GameRoom, client: Client, message: AnswerMessage): void {
  if (room.state.activeModal !== 'rail_de_bus') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;
  const session = sessions.get(room);
  if (!session) return;
  const player = room.state.players.get(client.sessionId);
  if (!player) return;

  const round = room.state.railRound;
  const drawn = session.drawn;
  const next = session.deck.pop();
  if (!next) return; // shouldn't happen with a fresh deck

  drawn.push(next);
  room.state.railCards.push(cardToString(next));

  let success = false;
  switch (round) {
    case 1: {
      const isRed = next.suit === 'hearts' || next.suit === 'diamonds';
      success = (message.answer === 'red' && isRed) || (message.answer === 'black' && !isRed);
      break;
    }
    case 2: {
      const prev = drawn[drawn.length - 2] as Card;
      if (next.rank > prev.rank) success = message.answer === 'higher';
      else if (next.rank < prev.rank) success = message.answer === 'lower';
      else success = false; // equal = always fail
      break;
    }
    case 3: {
      const prev1 = drawn[drawn.length - 3] as Card;
      const prev2 = drawn[drawn.length - 2] as Card;
      const lo = Math.min(prev1.rank, prev2.rank);
      const hi = Math.max(prev1.rank, prev2.rank);
      const inside = next.rank > lo && next.rank < hi;
      const outside = next.rank < lo || next.rank > hi;
      success =
        (message.answer === 'inside' && inside) || (message.answer === 'outside' && outside);
      break;
    }
    case 4: {
      success = message.answer === next.suit;
      break;
    }
  }

  if (!success) {
    const sips = round; // 1, 2, 3, or 4 sips depending on round of failure
    applyDrink(room, {
      player,
      sips,
      emoji: '🎴',
      kind: 'rail_fail',
      reason: `échec manche ${round}`,
    });
    closeRailDeBus(room);
    endTurn(room);
    return;
  }

  if (round === 4) {
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'rail_win',
      text: `🎴 ${player.name} réussit les 4 manches du Rail de bus — pas une goutte !`,
      importance: 'epic',
    });
    closeRailDeBus(room);
    endTurn(room);
    return;
  }

  room.state.railRound = round + 1;
  pushEvent(room.state, {
    playerId: player.id,
    kind: 'rail_advance',
    text: `🎴 ${player.name} passe à la manche ${round + 1}/4`,
    importance: 'normal',
  });
}

function closeRailDeBus(room: GameRoom): void {
  room.state.activeModal = '';
  room.state.activeModalPlayerId = '';
  room.state.railRound = 0;
  room.state.railCards.clear();
  sessions.delete(room);
}
