import { generateBoard } from '@jeu-soiree/game-logic';
import {
  AVATAR_EMOJIS,
  GAME_CONFIG_BY_DIFFICULTY,
  isDifficultyLevel,
  PAWN_COLORS,
} from '@jeu-soiree/shared';
import { type Client, Room, ServerError } from 'colyseus';
import { persistFinishedGame } from '../db/repositories/games';
import { handleChooseBromance } from '../game/cases/bromance';
import {
  clearDistributeStateOnDisconnect,
  handleConfirmDrink,
  handleDistributeSips,
} from '../game/cases/distribute';
import { handleChoosePill } from '../game/cases/pills';
import { handleRailAnswer } from '../game/cases/railDeBus';
import { handleBuyItem, handleSkipShop } from '../game/cases/shop';
import { handleOpenTreasure, handleSkipTreasure, handleSwapPosition } from '../game/cases/treasure';
import { handleUseItem } from '../game/cases/useItem';
import { handleGivePotion, handleSayThanks } from '../game/cases/witch';
import { pushEvent } from '../game/eventLog';
import { handleRollOrderDice } from '../game/rollingOrder';
import { endTurn, handleRollDice } from '../game/turnHandler';
import {
  type JoinOptions,
  JoinOptionsSchema,
  SpectatorJoinSchema,
  UpdateProfileSchema,
} from '../lib/messages';
import { BoardCaseSchema } from '../schemas/BoardCaseSchema';
import { GameState } from '../schemas/GameState';
import { Player } from '../schemas/Player';
import type { SipEvent } from '../schemas/SipEvent';

// 10 players + up to 10 spectators (master TV screens etc). Spectators don't add Player entries.
const MAX_CLIENTS = 20;
const MIN_PLAYERS_TO_START = 2;
const RECONNECTION_TIMEOUT_SECONDS = 60;

interface CreateOptions {
  code?: string;
  difficulty?: string;
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
  difficulty: 'soft' | 'medium' | 'hardcore' = 'medium';
  /** Counter incremented on every advanceTurn; drives hydration cadence. */
  totalTurnCount: number = 0;
  /** Per-client throttle for the react message (1 emoji per second per client). */
  private readonly lastReactionAt = new Map<string, number>();

  override async onCreate(options: CreateOptions): Promise<void> {
    const code = options.code ?? '';
    if (!code) {
      throw new ServerError(400, 'Missing room code');
    }

    this.setState(new GameState());
    this.state.boardSeed = code;
    this.startedAt = Date.now();
    await this.setMetadata({ code });

    const difficulty = isDifficultyLevel(options.difficulty) ? options.difficulty : 'medium';
    const cfg = GAME_CONFIG_BY_DIFFICULTY[difficulty];
    this.state.difficultyLevel = difficulty;
    this.state.sipsPerCard = cfg.sipsPerCard;
    this.state.witchPotionSips = cfg.witchPotionSips;
    this.state.ptMalusSips = cfg.ptMalusSips;
    this.difficulty = difficulty;

    const board = generateBoard(code, difficulty);
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
    this.onMessage('distribute_sips', (client, message) =>
      handleDistributeSips(this, client, message),
    );
    this.onMessage('confirm_drink', (client) => handleConfirmDrink(this, client));
    this.onMessage('i_am_done', (client) => this.handleExit(client));
    this.onMessage('host_set_ceiling', (client, message: { ceiling?: number }) =>
      this.handleHostSetCeiling(client, message),
    );
    this.onMessage('host_ack_checklist', (client) => this.handleAckChecklist(client));
    this.onMessage('react', (client, message: { emoji?: string }) =>
      this.handleReact(client, message),
    );
    this.onMessage('update_profile', (client, message) =>
      this.handleUpdateProfile(client, message),
    );
    this.onMessage('host_kick', (client, message: { targetPlayerId: string }) =>
      this.handleKick(client, message),
    );
    this.onMessage('host_set_pin', (client, message: { pin?: string }) =>
      this.handleSetPin(client, message),
    );
    this.onMessage('toggle_ready', (client) => this.handleToggleReady(client));
  }

  private pickRandomColor(): string {
    const taken = new Set<string>();
    for (const p of this.state.players.values()) {
      if (p.connected && p.color) taken.add(p.color);
    }
    const available = PAWN_COLORS.filter((c) => !taken.has(c.id));
    if (available.length > 0) return available[Math.floor(Math.random() * available.length)].id;
    return PAWN_COLORS[Math.floor(Math.random() * PAWN_COLORS.length)].id;
  }

  private pickRandomEmoji(): string {
    const taken = new Set<string>();
    for (const p of this.state.players.values()) {
      if (p.connected && p.emoji) taken.add(p.emoji);
    }
    const available = AVATAR_EMOJIS.filter((e) => !taken.has(e));
    if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
    return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
  }

  private autoRandomizeProfile(player: Player): void {
    if (!player.emoji) player.emoji = this.pickRandomEmoji();
    if (!player.color) player.color = this.pickRandomColor();
    if (!player.suit) {
      const suits = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
      player.suit = suits[Math.floor(Math.random() * suits.length)];
    }
    if (!player.equivalencePreference) player.equivalencePreference = 'drinks';
    console.log(
      `[GameRoom ${this.state.boardSeed}] auto-randomized ${player.name} → ` +
        `emoji=${player.emoji} color=${player.color} suit=${player.suit}`,
    );
  }

  private handleReact(client: Client, message: { emoji?: string }): void {
    const ALLOWED = ['👍', '🔥', '😱', '🤣', '😴', '💀', '👏', '🍻'];
    const emoji = message.emoji;
    if (!emoji || !ALLOWED.includes(emoji)) return;
    // Throttle: drop if same client sent in the last 1s.
    const now = Date.now();
    const last = this.lastReactionAt.get(client.sessionId) ?? 0;
    if (now - last < 1000) return;
    this.lastReactionAt.set(client.sessionId, now);
    this.broadcast('reaction', { from: client.sessionId, emoji, ts: now });
  }

  private handleExit(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.exited) return;
    player.exited = true;
    player.exitedAt = Date.now();
    pushEvent(this.state, {
      playerId: player.id,
      kind: 'player_exit',
      text: `🪑 ${player.name} se met en pause pour la fin de la partie`,
      importance: 'high',
    });
    const expected = this.state.turnOrder[this.state.currentTurnIndex];
    if (expected === client.sessionId && this.state.phase === 'playing') {
      this.state.activeModal = '';
      this.state.activeModalPlayerId = '';
      endTurn(this);
    }
  }

  private handleHostSetCeiling(client: Client, message: { ceiling?: number }): void {
    if (client.sessionId !== this.state.hostId) return;
    if (this.state.phase !== 'lobby') return;
    if (typeof message.ceiling !== 'number') return;
    const ceiling = Math.max(0, Math.floor(message.ceiling));
    this.state.maxSipsPerPlayerPerGame = ceiling;
  }

  private handleAckChecklist(client: Client): void {
    if (client.sessionId !== this.state.hostId) return;
    if (this.state.phase !== 'lobby') return;
    this.state.checklistAcked = true;
  }

  override onJoin(client: Client, rawOptions: unknown): void {
    // Spectators (master TV) skip the player profile path entirely: no Player schema entry,
    // no suit/color/name collision check. Existing message handlers already guard on
    // `state.players.get(sessionId)` so spectators can't trigger gameplay actions.
    const spectatorParsed = SpectatorJoinSchema.safeParse(rawOptions);
    if (spectatorParsed.success) {
      if (this.state.lobbyPin && spectatorParsed.data.pin !== this.state.lobbyPin) {
        throw new ServerError(403, 'Wrong PIN');
      }
      client.userData = { spectator: true };
      console.log(`[GameRoom ${this.state.boardSeed}] spectator joined (${client.sessionId})`);
      return;
    }

    const parsed = JoinOptionsSchema.safeParse(rawOptions);
    if (!parsed.success) {
      if (this.state.lobbyPin) {
        const pinAttempt = (rawOptions as Record<string, unknown>)?.pin;
        if (!pinAttempt) {
          throw new ServerError(401, 'PIN required');
        }
        if (pinAttempt !== this.state.lobbyPin) {
          throw new ServerError(403, 'Wrong PIN');
        }
      }
      throw new ServerError(400, `Invalid join options: ${parsed.error.message}`);
    }
    const options: JoinOptions = parsed.data;

    console.log(
      `[GameRoom ${this.state.boardSeed}] join attempt ${options.name} (${client.sessionId}) ` +
        `phase=${this.state.phase} color=${options.color ?? ''} emoji=${options.emoji ?? ''} suit=${options.suit ?? ''}`,
    );

    if (this.state.lobbyPin && options.pin !== this.state.lobbyPin) {
      throw new ServerError(403, 'Wrong PIN');
    }

    if (this.state.players.size >= 10) {
      throw new ServerError(403, 'Lobby is full (max 10 players)');
    }

    // Name collision: auto-append a number suffix
    let finalName = options.name;
    const existingNames = new Set<string>();
    for (const p of this.state.players.values()) {
      if (p.connected) existingNames.add(p.name.toLowerCase());
    }
    if (existingNames.has(finalName.toLowerCase())) {
      let i = 2;
      while (existingNames.has(`${finalName} ${i}`.toLowerCase())) i++;
      finalName = `${finalName} ${i}`;
    }

    const existingPlayer = this.state.players.get(client.sessionId);
    if (existingPlayer) {
      existingPlayer.connected = true;
      console.log(
        `[GameRoom ${this.state.boardSeed}] reconnected ${existingPlayer.name} (${client.sessionId}) ` +
          `emoji=${existingPlayer.emoji} color=${existingPlayer.color} suit=${existingPlayer.suit}`,
      );
      return;
    }

    // Don't allow brand new players after the game has started playing
    // (rolling_order is still ok — they can spectate/join late)
    if (this.state.phase === 'playing' || this.state.phase === 'finished') {
      throw new ServerError(403, 'Game already in progress');
    }

    const player = new Player();
    player.id = client.sessionId;
    player.name = finalName;
    player.suit = options.suit;
    player.color = options.color;
    player.emoji = options.emoji;
    player.equivalencePreference = options.equivalencePreference;
    player.equivalencePerSource = options.equivalencePerSource ?? '';
    player.connected = true;
    player.isHost = this.state.players.size === 0;

    // Auto-resolve color collision
    if (player.color) {
      for (const existing of this.state.players.values()) {
        if (existing.connected && existing.color === player.color) {
          player.color = '';
          break;
        }
      }
    }
    if (!player.color) player.color = this.pickRandomColor();

    // Auto-resolve emoji collision
    if (player.emoji) {
      for (const existing of this.state.players.values()) {
        if (existing.connected && existing.emoji === player.emoji) {
          player.emoji = '';
          break;
        }
      }
    }
    if (!player.emoji) player.emoji = this.pickRandomEmoji();

    // Auto-assign suit if missing
    if (!player.suit) {
      const suits = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
      player.suit = suits[Math.floor(Math.random() * suits.length)];
    }

    if (player.isHost) {
      this.state.hostId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);
    console.log(
      `[GameRoom ${this.state.boardSeed}] joined ${finalName} (${client.sessionId}) ` +
        `emoji=${player.emoji} color=${player.color} suit=${player.suit} ` +
        `— ${this.state.players.size}/${MAX_CLIENTS}`,
    );
  }

  override async onLeave(client: Client, consented?: boolean): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    console.log(
      `[GameRoom ${this.state.boardSeed}] leave ${player.name} (${client.sessionId}) ` +
        `(consented=${consented ?? false}) emoji=${player.emoji} color=${player.color} suit=${player.suit}`,
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
    console.log(
      `[GameRoom ${this.state.boardSeed}] remove ${player.name} (${sessionId}) host=${wasHost}`,
    );

    if (this.state.phase === 'playing' && this.state.activeModalPlayerId === sessionId) {
      this.state.activeModal = '';
      this.state.activeModalPlayerId = '';
      if (this.state.witchOffererId === sessionId) {
        this.state.witchOffererId = '';
        this.state.witchDeadline = 0;
      }
      clearDistributeStateOnDisconnect(this);
      endTurn(this);
    } else if (
      this.state.phase === 'playing' &&
      this.state.activeModal === 'distribute_wait' &&
      player.pendingDrinkConfirm > 0
    ) {
      player.pendingDrinkConfirm = 0;
      let anyPending = false;
      for (const p of this.state.players.values()) {
        if (p.pendingDrinkConfirm > 0) {
          anyPending = true;
          break;
        }
      }
      if (!anyPending) {
        clearDistributeStateOnDisconnect(this);
        this.state.activeModal = '';
        this.state.activeModalPlayerId = '';
        endTurn(this);
      }
    }

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

  private handleUpdateProfile(client: Client, rawMessage: unknown): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const parsed = UpdateProfileSchema.safeParse(rawMessage);
    if (!parsed.success) {
      console.log(
        `[GameRoom ${this.state.boardSeed}] update_profile invalid ${player.name} (${client.sessionId}) ` +
          `${parsed.error.message}`,
      );
      return;
    }
    const msg = parsed.data;

    const isRestoring =
      this.state.phase !== 'lobby' && (!player.emoji || !player.color || !player.suit);
    if (this.state.phase !== 'lobby' && !isRestoring) {
      console.log(
        `[GameRoom ${this.state.boardSeed}] update_profile ignored ${player.name} (${client.sessionId}) ` +
          `phase=${this.state.phase} emoji=${player.emoji} color=${player.color}`,
      );
      return;
    }

    console.log(
      `[GameRoom ${this.state.boardSeed}] update_profile ${player.name} (${client.sessionId}) ` +
        `phase=${this.state.phase} emoji=${msg.emoji ?? ''} color=${msg.color ?? ''} suit=${msg.suit ?? ''}`,
    );

    if (msg.suit !== undefined) player.suit = msg.suit;
    if (msg.equivalencePreference !== undefined)
      player.equivalencePreference = msg.equivalencePreference;

    if (msg.emoji !== undefined && msg.emoji !== player.emoji) {
      for (const existing of this.state.players.values()) {
        if (existing.id === client.sessionId || !existing.connected) continue;
        if (existing.emoji === msg.emoji) {
          console.log(
            `[GameRoom ${this.state.boardSeed}] update_profile emoji taken ${msg.emoji} ` +
              `by ${existing.name} (${existing.id})`,
          );
          client.send('profile_error', {
            field: 'emoji',
            message: `Emoji ${msg.emoji} already taken`,
          });
          return;
        }
      }
      player.emoji = msg.emoji;
    }

    if (msg.color !== undefined && msg.color !== player.color) {
      for (const existing of this.state.players.values()) {
        if (existing.id === client.sessionId || !existing.connected) continue;
        if (existing.color === msg.color) {
          console.log(
            `[GameRoom ${this.state.boardSeed}] update_profile color taken ${msg.color} ` +
              `by ${existing.name} (${existing.id})`,
          );
          client.send('profile_error', {
            field: 'color',
            message: `Color ${msg.color} already taken`,
          });
          return;
        }
      }
      player.color = msg.color;
    }

    console.log(
      `[GameRoom ${this.state.boardSeed}] update_profile applied ${player.name} (${client.sessionId}) ` +
        `emoji=${player.emoji} color=${player.color} suit=${player.suit}`,
    );
  }

  private handleKick(client: Client, message: { targetPlayerId: string }): void {
    if (client.sessionId !== this.state.hostId) return;
    if (this.state.phase !== 'lobby') return;
    const targetId = message.targetPlayerId;
    if (!targetId || targetId === client.sessionId) return;
    const target = this.state.players.get(targetId);
    if (!target) return;

    if (target.bromanceWith) {
      const prev = this.state.players.get(target.bromanceWith);
      if (prev) prev.bromanceWith = '';
    }

    if (this.state.activeModalPlayerId === targetId) {
      this.state.activeModal = '';
      this.state.activeModalPlayerId = '';
    }
    if (this.state.witchOffererId === targetId) {
      this.state.witchOffererId = '';
      this.state.witchDeadline = 0;
    }

    pushEvent(this.state, {
      kind: 'player_kicked',
      text: `🚫 ${target.name} a été expulsé par le host`,
      importance: 'high',
    });

    this.state.players.delete(targetId);
    this.reassignHost();

    const targetClient = this.clients.find((c) => c.sessionId === targetId);
    targetClient?.close(4003, 'Kicked by host');
  }

  private handleSetPin(client: Client, message: { pin?: string }): void {
    if (client.sessionId !== this.state.hostId) return;
    if (this.state.phase !== 'lobby') return;
    const pin = message.pin ?? '';
    if (pin !== '' && !/^\d{4}$/.test(pin)) return;
    this.state.lobbyPin = pin;
  }

  private handleStartGame(client: Client): void {
    if (client.sessionId !== this.state.hostId) return;
    if (this.state.phase !== 'lobby') return;
    if (this.state.players.size < MIN_PLAYERS_TO_START) return;
    if (!this.state.checklistAcked) return;

    let connectedCount = 0;
    let readyCount = 0;
    for (const p of this.state.players.values()) {
      if (!p.connected) continue;
      connectedCount++;
      if (p.ready) readyCount++;
    }

    if (readyCount === 0 || readyCount < connectedCount * 0.5) return;

    for (const p of this.state.players.values()) {
      if (!p.connected) continue;
      this.autoRandomizeProfile(p);
    }

    this.state.phase = 'rolling_order';
    this.state.rollOrderRolls.clear();
    pushEvent(this.state, {
      kind: 'phase_change',
      text: `🎲 Lancez tous votre dé pour déterminer l'ordre`,
      importance: 'high',
    });
    console.log(
      `[GameRoom ${this.state.boardSeed}] starting with ${this.state.players.size} players ` +
        `(${readyCount}/${connectedCount} ready)`,
    );
  }

  private handleToggleReady(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    if (this.state.phase !== 'lobby') return;
    player.ready = !player.ready;
    console.log(`[GameRoom ${this.state.boardSeed}] toggle_ready ${player.name} → ${player.ready}`);
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
        allSipEvents: this.allSipEvents,
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
