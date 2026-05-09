'use client';

import { AnimatePresence, motion } from 'motion/react';

export interface EchoPayload {
  id: string;
  title: string;
  importance: 'high' | 'epic';
}

interface ModalEchoProps {
  echo: EchoPayload | null;
}

/** Full-screen overlay that flashes a giant title when an important event lands.
 *  Slam-in (scale 1.4 → 1) + 4s hold + fade-out. Mounts on top of the master view. */
export function ModalEcho({ echo }: ModalEchoProps) {
  return (
    <AnimatePresence mode="wait">
      {echo && (
        <motion.div
          key={echo.id}
          initial={{ opacity: 0, scale: 1.4 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.4 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-12"
          style={{
            background:
              echo.importance === 'epic'
                ? 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(0,0,0,0.85) 70%)'
                : 'radial-gradient(circle, rgba(59,130,246,0.30) 0%, rgba(0,0,0,0.80) 70%)',
          }}
        >
          <p
            className={`text-center font-bold leading-tight tracking-tight ${
              echo.importance === 'epic' ? 'text-amber-200' : 'text-white'
            }`}
            style={{
              fontSize: 'clamp(3rem, 9vw, 9rem)',
              textShadow: '0 4px 24px rgba(0,0,0,0.6)',
            }}
          >
            {echo.title}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
