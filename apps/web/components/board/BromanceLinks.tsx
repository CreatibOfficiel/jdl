'use client';

import type { ClientPlayer } from '@/types/colyseus';
import { CENTER, getCaseGeometry, VIEWBOX_SIZE } from './boardGeometry';

const START_BASE_Y = VIEWBOX_SIZE - 20;
const START_SPACING = 22;

function getCenter(
  player: ClientPlayer,
  clusterIndex: number,
  clusterTotal: number,
): { x: number; y: number } {
  if (player.position <= 0) {
    return {
      x: CENTER + (clusterIndex - (clusterTotal - 1) / 2) * START_SPACING,
      y: START_BASE_Y,
    };
  }
  const geom = getCaseGeometry(player.position);
  return { x: geom.centerX, y: geom.centerY };
}

interface BromanceLinksProps {
  players: ReadonlyArray<ClientPlayer>;
  byPosition: Map<number, ClientPlayer[]>;
}

export function BromanceLinks({ players, byPosition }: BromanceLinksProps) {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const drawn = new Set<string>();
  const lines: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];

  for (const a of players) {
    if (!a.bromanceWith) continue;
    const b = playerById.get(a.bromanceWith);
    if (!b || b.bromanceWith !== a.id) continue;
    const pairKey = [a.id, b.id].sort().join('::');
    if (drawn.has(pairKey)) continue;
    drawn.add(pairKey);

    const aCluster = byPosition.get(a.position) ?? [a];
    const bCluster = byPosition.get(b.position) ?? [b];
    const aPos = getCenter(a, aCluster.indexOf(a), aCluster.length);
    const bPos = getCenter(b, bCluster.indexOf(b), bCluster.length);

    lines.push({ id: pairKey, x1: aPos.x, y1: aPos.y, x2: bPos.x, y2: bPos.y });
  }

  if (lines.length === 0) return null;

  return (
    <g>
      {lines.map((l) => {
        const midX = (l.x1 + l.x2) / 2;
        const midY = (l.y1 + l.y2) / 2;
        return (
          <g key={l.id}>
            <line
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="#FF006E"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.6}
            />
            <text x={midX} y={midY + 5} textAnchor="middle" fontSize={14} opacity={0.85}>
              💞
            </text>
          </g>
        );
      })}
    </g>
  );
}
