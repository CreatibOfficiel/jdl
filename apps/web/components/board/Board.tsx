import type { Board as BoardData } from '@jeu-soiree/shared';
import { PAWN_COLORS } from '@jeu-soiree/shared';
import type { ClientPlayer } from '@/types/colyseus';
import { BromanceLinks } from './BromanceLinks';
import { getAllCaseGeometries, VIEWBOX_SIZE } from './boardGeometry';
import { Case } from './Case';
import { Pawn } from './Pawn';

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface BoardProps {
  board: BoardData;
  players?: ReadonlyArray<ClientPlayer>;
  activeId?: string;
}

export function Board({ board, players = [], activeId }: BoardProps) {
  const geometries = getAllCaseGeometries();
  const treasureSet = new Set(board.treasureCases);
  const tzStart = board.thirstZone.start;
  const tzEnd = tzStart + board.thirstZone.length - 1;

  const byPosition = new Map<number, ClientPlayer[]>();
  for (const p of players) {
    const list = byPosition.get(p.position) ?? [];
    list.push(p);
    byPosition.set(p.position, list);
  }

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      className="h-full w-full"
      role="img"
      aria-label={`Plateau pour seed ${board.seed}`}
    >
      <title>{`Plateau ${board.seed}`}</title>
      {board.cases.map((caseData) => {
        const geom = geometries[caseData.index - 1];
        if (!geom) return null;
        const inThirst = caseData.index >= tzStart && caseData.index <= tzEnd;
        return (
          <Case
            key={caseData.index}
            geometry={geom}
            data={caseData}
            isTreasure={treasureSet.has(caseData.index)}
            isInThirstZone={inThirst}
          />
        );
      })}
      <BromanceLinks players={players} byPosition={byPosition} />
      {players.map((p) => {
        const cluster = byPosition.get(p.position) ?? [p];
        const clusterIndex = cluster.findIndex((x) => x.id === p.id);
        const hex = COLOR_BY_ID.get(p.color) ?? '#999999';
        return (
          <Pawn
            key={p.id}
            player={{ id: p.id, name: p.name, hex, emoji: p.emoji, position: p.position }}
            isActive={p.id === activeId}
            cluster={{ index: clusterIndex, total: cluster.length }}
            isTeleport={p.lastTeleport}
          />
        );
      })}
    </svg>
  );
}
