'use client';

import type { ClientArraySchema } from '@/types/colyseus';

const ITEM_META: Record<string, { emoji: string; label: string; usable: boolean }> = {
  prison_key: { emoji: '🗝️', label: 'Clé de prison', usable: true },
  crowbar: { emoji: '🪛', label: 'Pied de biche (auto)', usable: false },
  malus_point: { emoji: '💣', label: 'Pt malus', usable: true },
  potion: { emoji: '🧪', label: 'Potion', usable: true },
  loaded_die: { emoji: '🎲', label: 'Dé pipé', usable: true },
};

interface InventoryProps {
  inventory: ClientArraySchema<string>;
  onUse: (itemType: string) => void;
}

export function Inventory({ inventory, onUse }: InventoryProps) {
  const items: string[] = [];
  inventory.forEach((it) => {
    items.push(it);
  });

  if (items.length === 0) {
    return <p className="text-xs italic text-zinc-400">Inventaire vide.</p>;
  }

  // Group by item type with count
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);

  return (
    <ul className="space-y-1.5">
      {Array.from(counts.entries()).map(([itemType, count]) => {
        const meta = ITEM_META[itemType] ?? { emoji: '·', label: itemType, usable: false };
        return (
          <li key={itemType} className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              {meta.emoji}
            </span>
            <span className="flex-1 text-sm text-zinc-700">{meta.label}</span>
            {count > 1 && (
              <span className="rounded-full bg-zinc-200 px-1.5 text-xs font-bold text-zinc-700">
                ×{count}
              </span>
            )}
            {meta.usable && (
              <button
                type="button"
                onClick={() => onUse(itemType)}
                className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                Utiliser
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
