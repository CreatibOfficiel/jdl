import { generateBoard } from '@jeu-soiree/game-logic';
import { type Client, Room, ServerError } from 'colyseus';
import { persistFinishedGame } from '../db/repositories/games';
import { handleChooseBromance } from '../game/cases/bromance';
import { handleChoosePill } from '../game/cases/pills';
import { handleRailAnswer } from '../game/cases/railDeBus';
import { handleBuyItem, handleSkipShop } from '../game/cases/shop';
import { handleOpenTreasure, handleSkipTreasure, handleSwapPosition } from '../game/cases/treasure';
import { handleUseItem } from '../game/cases/useItem';
import { handleGivePotion, handleSayThanks } from '../game/cases/witch';
import { pushEvent } from '../game/eventLog';
import { handleRollOrderDice } from '../game/rollingOrder';
import { handleRollDice } from '../game/turnHandler';
import { type JoinOptions, JoinOptionsSchema } from '../lib/messages';
import { BoardCaseSchema } from '../schemas/BoardCaseSchema';
import { GameState } from '../schemas/GameState';
import { Player } from '../schemas/Player';
import type { SipEvent } from '../schemas/SipEvent';

const MAX_CLIENTS = 10;
const MIN_PLAYERS_TO_START = 2;
const RECONNECTION_TIMEOUT_SECONDS = 60;

interface CreateOptions {
  code?: string;
}

interface RoomMetadata {
  code: string;
}

export class GameRoom extends Room<GameState, RoomMetadata> {
  maxClients = MAX_CLIENTS;
  private treasureCases: number[] = [];
  private startedAt: number = 0;
  private persisted: boolean = false;
  /** Unbounded mirror of every SipEvent emitted (state.sipEvents is capped at 200 for client sync).
   *  Consumed by persistFinishedGame in Stage A4 so post-game stats remain exact. */
  readonly allSipEvents: SipEvent[] = [];

  override async onCreate(options: CreateOptions): Promise<void> {
    const code = options.code ?? '';
    if (!code) {
      throw new ServerError(400, 'Missing room code');
    }

    this.setState(new GameState());
    this.state.boardSeed = code;
    this.startedAt = Date.now();
    await this.setMetadata({ code });

    const board = generateBoard(code);
    this.state.thirstZoneStart = board.thirstZone.start;
    this.state.thirstZoneLength = board.thirstZone.length;
    this.treasureCases = [...board.treasureCases];

    for (const c of board.cases) {
      const cs = new BoardCaseSchema();
      cs.index = c.index;
      cs.caseType = c.type;
      cs.numberValue = c.numberValue ?? 0;
      cs.portalPairId = c.portalPairId ?? -1;
      this.state.board.push(cs);
    }

    this.onMessage('start_game', (client) => this.handleStartGame(client));
    this.onMessage('roll_order_dice', (client) => handleRollOrderDice(this, client));
    this.onMessage('roll_dice', (client) => handleRollDice(this, client));
    this.onMessage('choose_bromance', (client, message) =>
      handleChooseBromance(this, client, message),
    );
    this.onMessage('buy_item', (client, message) => handleBuyItem(this, client, message));
    this.onMessage('skip_shop', (client) => handleSkipShop(this, client));
    this.onMessage('use_item', (client, message) => handleUseItem(this, client, message));
    this.onMessage('choose_pill', (client, message) => handleChoosePill(this, client, message));
    this.onMessage('give_potion', (client, message) => handleGivePotion(this, client, message));
    this.onMessage('say_thanks', (client) => handleSayThanks(this, client));
    this.onMessage('open_treasure', (client) => handleOpenTreasure(this, client));
    this.onMessage('skip_treasure', (client) => handleSkipTreasure(this, client));
    this.onMessage('swap_position', (client, message) => handleSwapPosition(this, client, message));
    this.onMessage('rail_de_bus_answer', (client, message) =>
      handleRailAnswer(this, client, message),
    );
  }

  override onJoin(client: Client, rawOptions: unknown): void {
    const parsed = JoinOptionsSchema.safeParse(rawOptions);
    if (!parsed.success) {
      throw new ServerError(400, `Invalid join options: ${parsed.error.message}`);
    }
    const options: JoinOptions = parsed.data;

    for (const existing of this.state.players.values()) {
      if (!existing.connected) continue;
      if (existing.suit === options.suit) {
        throw new ServerError(409, `Suit ${options.suit} already taken`);
      }
      if (existing.color === options.color) {
        throw new ServerError(409, `Color ${options.color} already taken`);
      }
      if (existing.name.toLowerCase() === options.name.toLowerCase()) {
        throw new ServerError(409, `Name ${options.name} already taken`);
      }
    }

    const player = new Player();
    player.id = client.sessionId;
    player.name = options.name;
    player.suit = options.suit;
    player.color = options.color;
    player.emoji = options.emoji;
    player.connected = true;
    player.isHost = this.state.players.size === 0;

    if (player.isHost) {
      this.state.hostId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);
    console.log(
      `[GameRoom ${this.state.boardSeed}] joined ${options.name} (${client.sessionId}) — ${this.state.players.size}/${MAX_CLIENTS}`,
    );
  }

  override async onLeave(client: Client, consented?: boolean): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    console.log(
      `[GameRoom ${this.state.boardSeed}] leave ${player.name} (consented=${consented ?? false})`,
    );

    if (consented) {
      this.removePlayer(client.sessionId);
      return;
    }

    player.connected = false;
    try {
      await this.allowReconnection(client, RECONNECTION_TIMEOUT_SECONDS);
      const reconnected = this.state.players.get(client.sessionId);
      if (reconnected) {
        reconnected.connected = true;
        console.log(`[GameRoom ${this.state.boardSeed}] reconnected ${reconnected.name}`);
      }
    } catch {
      this.removePlayer(client.sessionId);
    }
  }

  private removePlayer(sessionId: string): void {
    const player = this.state.players.get(sessionId);
    if (!player) return;
    const wasHost = player.isHost;
    this.state.players.delete(sessionId);
    if (wasHost) {
      this.reassignHost();
    }
  }

  private reassignHost(): void {
    const next = this.state.players.values().next().value as Player | undefined;
    if (next) {
      next.isHost = true;
      this.state.hostId = next.id;
    } else {
      this.state.hostId = '';
    }
  }

  private handleStartGame(client: Client): void {
    if (client.sessionId !== this.state.hostId) return;
    if (this.state.phase !== 'lobby') return;
    if (this.state.players.size < MIN_PLAYERS_TO_START) return;
    this.state.phase = 'rolling_order';
    this.state.rollOrderRolls.clear();
    pushEvent(this.state, {
      kind: 'phase_change',
      text: `🎲 Lancez tous votre dé pour déterminer l'ordre`,
      importance: 'high',
    });
    console.log(
      `[GameRoom ${this.state.boardSeed}] starting with ${this.state.players.size} players`,
    );
  }

  /** Treasures are intentionally not synced; they're revealed only when opened. */
  getTreasureCases(): readonly number[] {
    return this.treasureCases;
  }

  /** Persist the finished game once. Idempotent. */
  persistIfFinished(): void {
    if (this.persisted) return;
    if (this.state.phase !== 'finished') return;
    try {
      persistFinishedGame({
        roomId: this.roomId,
        startedAt: this.startedAt,
        state: this.state,
      });
      this.persisted = true;
      console.log(`[GameRoom ${this.state.boardSeed}] persisted to SQLite`);
    } catch (e) {
      console.error('[GameRoom] persist failed:', e);
    }
  }

  override onDispose(): void {
    this.persistIfFinished();
  }
}
