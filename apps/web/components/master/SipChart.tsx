'use client';

import type { CumulativeSeries } from '@/lib/sipStats';

interface SipChartProps {
  series: ReadonlyArray<CumulativeSeries>;
  /** playerId → hex color (matches the pawn). */
  colorByPlayerId: Map<string, string>;
  /** Optional player labels for the legend. */
  nameByPlayerId?: Map<string, string>;
  width?: number;
  height?: number;
}

const PADDING = { top: 12, right: 12, bottom: 24, left: 36 };

export function SipChart({
  series,
  colorByPlayerId,
  nameByPlayerId,
  width = 480,
  height = 220,
}: SipChartProps) {
  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) {
    return <EmptyState />;
  }

  const xMin = Math.min(...allPoints.map(([t]) => t));
  const xMax = Math.max(...allPoints.map(([t]) => t));
  const yMax = Math.max(1, ...allPoints.map(([, v]) => v));
  const xRange = Math.max(1, xMax - xMin);

  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const sx = (t: number) => PADDING.left + ((t - xMin) / xRange) * innerW;
  const sy = (v: number) => PADDING.top + innerH - (v / yMax) * innerH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(yMax * p));

  const totalSips = allPoints.length === 0 ? 0 : Math.max(...allPoints.map(([, v]) => v));

  return (
    <section className="rounded-3xl bg-zinc-900/60 p-4">
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold uppercase tracking-wider text-zinc-400">
          Gorgées cumulées
        </h2>
        <span className="text-sm text-zinc-500">{totalSips} sips · max</span>
      </header>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        role="img"
        aria-label="Cumul des gorgées par joueur dans le temps"
      >
        {/* Grid */}
        {gridLines.map((g, i) => {
          const y = sy(g);
          return (
            <g key={i}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.15)"
                strokeWidth={1}
              />
              <text x={4} y={y + 4} fill="rgba(148,163,184,0.6)" fontSize={10}>
                {g}
              </text>
            </g>
          );
        })}

        {/* Series polylines */}
        {series.map((s) => {
          if (s.points.length === 0) return null;
          const stroke = colorByPlayerId.get(s.playerId) ?? '#888';
          const points = s.points.map(([t, v]) => `${sx(t).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
          return (
            <polyline
              key={s.playerId}
              points={points}
              fill="none"
              stroke={stroke}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          );
        })}
      </svg>

      {nameByPlayerId && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {series.map((s) => {
            const color = colorByPlayerId.get(s.playerId) ?? '#888';
            const name = nameByPlayerId.get(s.playerId) ?? s.playerId;
            return (
              <li key={s.playerId} className="flex items-center gap-1 text-zinc-300">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                {name}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-3xl bg-zinc-900/60 p-4">
      <h2 className="mb-2 text-xl font-semibold uppercase tracking-wider text-zinc-400">
        Gorgées cumulées
      </h2>
      <p className="text-zinc-500">Pas encore de gorgées enregistrées…</p>
    </section>
  );
}
