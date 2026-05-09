import { ImageResponse } from 'next/og';
import { fetchGameDetail } from '@/lib/statsApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const detail = await fetchGameDetail(id);
  if (!detail) {
    return new Response('Not found', { status: 404 });
  }

  const { game, players } = detail;
  const winner = players.find((p) => p.won === 1);
  const totalSips = players.reduce((acc, p) => acc + p.sipsTaken, 0);
  const totalEquiv = players.reduce((acc, p) => acc + (p.equivalenceUnitsCompleted ?? 0), 0);
  const durationMin = game.endedAt ? Math.round((game.endedAt - game.startedAt) / 60000) : 0;
  const top3 = [...players].sort((a, b) => b.sipsTaken - a.sipsTaken).slice(0, 3);
  const podium = ['🥇', '🥈', '🥉'];

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#fff',
        padding: '60px 80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 36, color: '#94a3b8' }}>🎲 Jeu de l'Oie Soirée</div>
        <div style={{ fontSize: 28, color: '#94a3b8', fontFamily: 'monospace' }}>{game.seed}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, color: '#fbbf24' }}>
          🏆 {winner?.name ?? '—'}
        </div>
        <div style={{ fontSize: 36, color: '#cbd5e1', marginTop: 16 }}>
          gagne en {durationMin} min · {players.length} joueurs
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {top3.map((p, i) => (
            <div
              key={p.playerId}
              style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28 }}
            >
              <span style={{ fontSize: 40 }}>{podium[i]}</span>
              <span style={{ fontWeight: 600, flex: 1 }}>{p.name}</span>
              <span style={{ color: '#fbbf24' }}>🍻 {p.sipsTaken}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: '#fbbf24' }}>{totalSips}</div>
          <div style={{ fontSize: 22, color: '#94a3b8' }}>gorgées totales</div>
          {totalEquiv > 0 && (
            <div style={{ fontSize: 22, color: '#cbd5e1', marginTop: 8 }}>
              💪 {totalEquiv} unités d'effort
            </div>
          )}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
