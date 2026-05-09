export interface PlayerStats {
  id: string;
  name: string;
  totalGames: number;
  totalWins: number;
  totalSipsTaken: number;
  totalSipsGiven: number;
  totalEquivalenceUnits: number;
  createdAt: number;
}

export interface GameRecord {
  id: string;
  seed: string;
  startedAt: number;
  endedAt: number | null;
  winnerId: string | null;
  playerCount: number;
}

export interface GamePlayerRecord {
  gameId: string;
  playerId: string;
  name: string;
  sipsTaken: number;
  sipsGiven: number;
  shopPurchases: number;
  diceRolls: number;
  finishedPosition: number | null;
  won: number;
  equivalencePreference: string | null;
  equivalenceUnitsCompleted: number;
}

export interface SipEventRecord {
  id: number;
  gameId: string;
  ts: number;
  fromId: string | null;
  toId: string;
  count: number;
  source: string;
  equivalence: string | null;
}

export interface PairStat {
  fromId: string;
  toId: string;
  total: number;
}

export interface TopStats {
  drinkers: PlayerStats[];
  givers: PlayerStats[];
  winners: PlayerStats[];
  athletes: PlayerStats[];
  pairs: PairStat[];
  recent: GameRecord[];
}

export interface GameDetail {
  game: GameRecord;
  players: GamePlayerRecord[];
}

function resolveBaseUrl(): string {
  return process.env.COLYSEUS_HTTP_URL ?? 'http://localhost:2567';
}

export async function fetchTopStats(): Promise<TopStats | null> {
  try {
    const res = await fetch(`${resolveBaseUrl()}/api/stats/top`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as TopStats;
  } catch {
    return null;
  }
}

export async function fetchGameDetail(gameId: string): Promise<GameDetail | null> {
  try {
    const res = await fetch(`${resolveBaseUrl()}/api/games/${encodeURIComponent(gameId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as GameDetail;
  } catch {
    return null;
  }
}

export interface PlayerRecentGame {
  gameId: string;
  sipsTaken: number;
  sipsGiven: number;
  equivalenceUnitsCompleted: number | null;
  diceRolls: number;
  finishedPosition: number | null;
  won: number;
  seed: string;
  startedAt: number;
  endedAt: number | null;
  playerCount: number;
}

export interface PlayerProfile {
  player: PlayerStats;
  recent: PlayerRecentGame[];
}

export async function fetchPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  try {
    const res = await fetch(`${resolveBaseUrl()}/api/players/${encodeURIComponent(playerId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as PlayerProfile;
  } catch {
    return null;
  }
}

export async function fetchGameSipEvents(gameId: string): Promise<SipEventRecord[]> {
  try {
    const res = await fetch(`${resolveBaseUrl()}/api/games/${encodeURIComponent(gameId)}/sips`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { events: SipEventRecord[] };
    return body.events ?? [];
  } catch {
    return [];
  }
}
