export interface PlayerStats {
  id: string;
  name: string;
  totalGames: number;
  totalWins: number;
  totalSipsTaken: number;
  totalSipsGiven: number;
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

export interface TopStats {
  drinkers: PlayerStats[];
  givers: PlayerStats[];
  winners: PlayerStats[];
  recent: GameRecord[];
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
