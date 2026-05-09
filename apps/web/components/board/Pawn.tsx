'use client';

import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { CENTER, getCaseGeometry, VIEWBOX_SIZE } from './boardGeometry';

interface PawnPlayer {
  id: string;
  name: string;
  hex: string;
  emoji: string;
  position: number;
}

interface PawnProps {
  player: PawnPlayer;
  isActive: boolean;
  cluster: { index: number; total: number };
  isTeleport: boolean;
}

const STEP_MS = 220;
const ORBIT_RADIUS = 9;
const PAWN_RADIUS = 9;
const START_BASE_Y = VIEWBOX_SIZE - 16;
const START_SPACING = 22;
const FINISH_INDEX = 63;

interface DisplayCoords {
  cx: number;
  cy: number;
}

function getDisplayCoords(
  position: number,
  cluster: { index: number; total: number },
): DisplayCoords {
  if (position <= 0) {
    const cx = CENTER + (cluster.index - (cluster.total - 1) / 2) * START_SPACING;
    return { cx, cy: START_BASE_Y };
  }
  const geom = getCaseGeometry(position);
  let cx = geom.centerX;
  let cy = geom.centerY;
  if (cluster.total > 1) {
    const angle = (cluster.index / cluster.total) * 2 * Math.PI;
    cx += ORBIT_RADIUS * Math.cos(angle);
    cy += ORBIT_RADIUS * Math.sin(angle);
  }
  return { cx, cy };
}

function computePath(from: number, to: number): number[] {
  const path: number[] = [];
  if (to >= from) {
    for (let i = from + 1; i <= to; i++) path.push(i);
  } else {
    // Forward to finish, then bounce back
    for (let i = from + 1; i <= FINISH_INDEX; i++) path.push(i);
    for (let i = FINISH_INDEX - 1; i >= to; i--) path.push(i);
  }
  return path;
}

export function Pawn({ player, isActive, cluster, isTeleport }: PawnProps) {
  const [displayedPos, setDisplayedPos] = useState(player.position);
  const [opacity, setOpacity] = useState(1);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (player.position === displayedPos) return;
    cancelRef.current = false;

    if (isTeleport) {
      // Fade out, jump, fade in
      setOpacity(0);
      const t1 = setTimeout(() => {
        if (cancelRef.current) return;
        setDisplayedPos(player.position);
        setOpacity(1);
      }, 250);
      return () => {
        cancelRef.current = true;
        clearTimeout(t1);
      };
    }

    const path = computePath(displayedPos, player.position);
    if (path.length === 0) return;

    let i = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function step() {
      if (cancelRef.current) return;
      if (i >= path.length) return;
      const next = path[i];
      if (next === undefined) return;
      setDisplayedPos(next);
      i += 1;
      timeoutId = setTimeout(step, STEP_MS);
    }
    timeoutId = setTimeout(step, 50);

    return () => {
      cancelRef.current = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [player.position, displayedPos, isTeleport]);

  const { cx, cy } = getDisplayCoords(displayedPos, cluster);

  return (
    <motion.g animate={{ opacity }} transition={{ duration: 0.25 }}>
      {isActive && (
        <motion.circle
          animate={{ cx, cy }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, duration: STEP_MS / 1000 }}
          r={PAWN_RADIUS + 4}
          fill="none"
          stroke="#FFD60A"
          strokeWidth={2}
          opacity={0.85}
        >
          <animate
            attributeName="r"
            values={`${PAWN_RADIUS + 3};${PAWN_RADIUS + 6};${PAWN_RADIUS + 3}`}
            dur="1.4s"
            repeatCount="indefinite"
          />
        </motion.circle>
      )}
      <motion.circle
        animate={{ cx, cy }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, duration: STEP_MS / 1000 }}
        r={PAWN_RADIUS}
        fill={player.hex}
        stroke="white"
        strokeWidth={2}
      />
      <motion.text
        animate={{ x: cx, y: cy + 3.5 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, duration: STEP_MS / 1000 }}
        textAnchor="middle"
        fontSize={10}
        style={{ pointerEvents: 'none' }}
      >
        {player.emoji}
      </motion.text>
      <title>{`${player.name} — case ${player.position}`}</title>
    </motion.g>
  );
}
