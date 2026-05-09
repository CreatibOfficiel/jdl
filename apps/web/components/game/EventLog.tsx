'use client';

import type { ClientArraySchema, ClientGameEvent } from '@/types/colyseus';

interface EventLogProps {
  events: ClientArraySchema<ClientGameEvent>;
}

const IMPORTANCE_STYLES: Record<string, string> = {
  low: 'text-zinc-400',
  normal: 'text-zinc-700',
  high: 'font-semibold text-zinc-900',
  epic: 'font-bold text-amber-600',
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
    return <p className="text-sm italic text-zinc-400">L'event log apparaît ici…</p>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {recent.map((e) => (
        <li key={e.id} className={IMPORTANCE_STYLES[e.importance] ?? 'text-zinc-700'}>
          {e.text}
        </li>
      ))}
    </ul>
  );
}
