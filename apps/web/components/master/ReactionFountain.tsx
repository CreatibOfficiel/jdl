'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { FloatingReaction } from '@/hooks/useReactions';

interface ReactionFountainProps {
  reactions: ReadonlyArray<FloatingReaction>;
}

export function ReactionFountain({ reactions }: ReactionFountainProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 60, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], y: -300, scale: [0.7, 1.4, 1.4, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: 'easeOut' }}
            className="absolute"
            style={{
              left: `${10 + r.rx * 80}%`,
              bottom: 0,
              fontSize: 96,
              filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
            }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
