'use client';

import type { ClientArraySchema, ClientGameEvent } from '@/types/colyseus';

interface EventLogProps {
  events: ClientArraySchema<ClientGameEvent>;
}

const IMPORTANCE_STYLES: Record<string, string> = {
  low: 'text-zinc-400 dark:text-zinc-500',
  normal: 'text-zinc-700 dark:text-zinc-300',
  high: 'font-semibold text-zinc-900 dark:text-zinc-100',
  epic: 'font-bold text-amber-600 dark:text-amber-400',
};

export function EventLog({ events }: EventLogProps) {
  const list: ClientGameEvent[] = [];
  events.forEach((e) => {
    list.push(e);
  });
  // Most recent first
  list.reverse();
  const recent = list.slice(0, 10);

  if (recent.length === 0) {
    return (
      <p className="text-sm italic text-zinc-400 dark:text-zinc-500">L'event log apparaît ici…</p>
    );
  }

  return (
    <ul className="space-y-1 text-sm" aria-live="polite">
      {recent.map((e) => (
        <li
          key={e.id}
          className={IMPORTANCE_STYLES[e.importance] ?? 'text-zinc-700 dark:text-zinc-300'}
        >
          {e.text}
        </li>
      ))}
    </ul>
  );
}
