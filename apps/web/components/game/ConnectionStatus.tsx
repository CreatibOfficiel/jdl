'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { RoomStatus } from '@/hooks/useColyseusRoom';

interface ConnectionStatusProps {
  status: RoomStatus;
  error: string | null;
}

export function ConnectionStatus({ status, error }: ConnectionStatusProps) {
  const visible = status === 'reconnecting' || status === 'error';
  const isError = status === 'error';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className={`fixed inset-x-0 top-0 z-50 px-4 py-2 text-center text-sm font-medium text-white shadow-md ${
            isError ? 'bg-red-600' : 'bg-amber-500'
          }`}
        >
          {isError ? `❌ ${error ?? 'Erreur de connexion'}` : '🔄 Reconnexion en cours…'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
