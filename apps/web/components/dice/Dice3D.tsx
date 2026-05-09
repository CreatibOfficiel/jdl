'use client';

import { motion, useAnimate } from 'motion/react';
import { useEffect, useRef } from 'react';

type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Canonical orientation that brings a face to the user when applied as cube rotation.
 * Standard D6 (opposite faces sum to 7): 1↔6, 2↔5, 3↔4.
 */
const SHOW_FACE: Record<DiceValue, { rotateX: number; rotateY: number }> = {
  1: { rotateX: 0, rotateY: 0 },
  2: { rotateX: -90, rotateY: 0 },
  3: { rotateX: 0, rotateY: 90 },
  4: { rotateX: 0, rotateY: -90 },
  5: { rotateX: 90, rotateY: 0 },
  6: { rotateX: 180, rotateY: 0 },
};

/** Pip positions per value as [row, col] in a 3×3 grid (1-indexed). */
const FACE_PIPS: Record<DiceValue, ReadonlyArray<[number, number]>> = {
  1: [[2, 2]],
  2: [
    [1, 1],
    [3, 3],
  ],
  3: [
    [1, 1],
    [2, 2],
    [3, 3],
  ],
  4: [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
  ],
  5: [
    [1, 1],
    [1, 3],
    [2, 2],
    [3, 1],
    [3, 3],
  ],
  6: [
    [1, 1],
    [1, 2],
    [1, 3],
    [3, 1],
    [3, 2],
    [3, 3],
  ],
};

interface Dice3DProps {
  /** 0 = not yet rolled (placeholder), 1-6 otherwise */
  value: number;
  /**
   * Increments on each new roll, even if value is unchanged.
   * Drives the re-animation. Pass eventLog.length or a roll counter.
   */
  rollKey: number;
  size?: number;
}

export function Dice3D({ value, rollKey, size = 96 }: Dice3DProps) {
  const [scope, animate] = useAnimate();
  const initializedRef = useRef(false);
  const spinSignRef = useRef(1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rollKey is the explicit re-roll trigger; size is intentionally read fresh
  useEffect(() => {
    if (!scope.current) return;
    if (value < 1 || value > 6) return;
    const v = value as DiceValue;
    const target = SHOW_FACE[v];

    if (!initializedRef.current) {
      // Snap to face on first paint — no tumble animation
      initializedRef.current = true;
      animate(
        scope.current,
        { rotateX: target.rotateX, rotateY: target.rotateY, y: 0, scale: 1 },
        { duration: 0 },
      );
      return;
    }

    spinSignRef.current *= -1;
    const sign = spinSignRef.current;
    const spinTurnsX = 2 + Math.floor(Math.random() * 2); // 2 or 3 full rotations
    const spinTurnsY = 2 + Math.floor(Math.random() * 2);

    animate(
      scope.current,
      {
        rotateX: target.rotateX + sign * 360 * spinTurnsX,
        rotateY: target.rotateY + sign * 360 * spinTurnsY,
        y: [0, -size * 0.7, 0],
        scale: [1, 1.06, 1],
      },
      {
        duration: 1.15,
        ease: [0.2, 0.8, 0.2, 1],
      },
    );
  }, [rollKey, value]);

  const halfSize = size / 2;
  const placeholder = value < 1 || value > 6;

  return (
    <div
      className="dice-scene"
      style={{
        perspective: `${size * 8}px`,
        width: size,
        height: size,
      }}
    >
      <motion.div
        ref={scope}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {([1, 2, 3, 4, 5, 6] as DiceValue[]).map((face) => (
          <DiceFace key={face} face={face} size={size} halfSize={halfSize} />
        ))}
      </motion.div>
      {placeholder && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
          ?
        </div>
      )}
    </div>
  );
}

const FACE_TRANSFORMS: Record<DiceValue, string> = {
  1: 'translateZ(var(--half))',
  6: 'rotateY(180deg) translateZ(var(--half))',
  3: 'rotateY(-90deg) translateZ(var(--half))',
  4: 'rotateY(90deg) translateZ(var(--half))',
  2: 'rotateX(90deg) translateZ(var(--half))',
  5: 'rotateX(-90deg) translateZ(var(--half))',
};

interface DiceFaceProps {
  face: DiceValue;
  size: number;
  halfSize: number;
}

function DiceFace({ face, size, halfSize }: DiceFaceProps) {
  const pips = FACE_PIPS[face];
  return (
    <div
      style={
        {
          position: 'absolute',
          width: `${size}px`,
          height: `${size}px`,
          transform: FACE_TRANSFORMS[face],
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #f0f0f0 60%, #d8d8d8 100%)',
          border: '2px solid #1a1a1a',
          borderRadius: `${Math.max(8, size * 0.12)}px`,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.08)',
          display: 'grid',
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateColumns: 'repeat(3, 1fr)',
          padding: `${size * 0.12}px`,
          boxSizing: 'border-box',
          ['--half' as never]: `${halfSize}px`,
        } as React.CSSProperties
      }
    >
      {pips.map(([row, col]) => (
        <span
          key={`${face}-${row}-${col}`}
          style={{
            gridRow: row,
            gridColumn: col,
            width: '70%',
            height: '70%',
            background: 'radial-gradient(circle at 30% 30%, #2a2a2a 0%, #0a0a0a 70%)',
            borderRadius: '50%',
            alignSelf: 'center',
            justifySelf: 'center',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </div>
  );
}
