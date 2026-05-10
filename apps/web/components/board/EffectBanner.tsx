'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface BannerEntry {
  id: string;
  text: string;
}

export function EffectBanner({ events }: { events: BannerEntry[] }) {
  const [visible, setVisible] = useState<BannerEntry | null>(null);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[events.length - 1];
    setVisible(latest);
    const t = setTimeout(() => setVisible(null), 3000);
    return () => clearTimeout(t);
  }, [events]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={visible.id}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="rounded-xl border border-zinc-200 bg-white/95 px-5 py-3 text-center text-sm font-semibold text-zinc-800 shadow-lg backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-800/95 dark:text-zinc-100"
          >
            {visible.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
