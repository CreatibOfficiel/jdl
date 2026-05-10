'use client';

import type { Room } from 'colyseus.js';
import { useEffect, useRef, useState } from 'react';
import type { ClientGameState } from '@/types/colyseus';

interface PinControlsProps {
  room: Room<ClientGameState>;
  lobbyPin: string;
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function PinControls({ room, lobbyPin }: PinControlsProps) {
  const [enabled, setEnabled] = useState(lobbyPin.length > 0);
  const [inputValue, setInputValue] = useState(lobbyPin);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEnabled(lobbyPin.length > 0);
    setInputValue(lobbyPin);
  }, [lobbyPin]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  function handleToggle() {
    if (enabled) {
      room.send('host_set_pin', { pin: '' });
    } else {
      const pin = generatePin();
      room.send('host_set_pin', { pin });
    }
  }

  function handleInputChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setInputValue(digits);
    if (digits.length === 4) {
      room.send('host_set_pin', { pin: digits });
    }
  }

  function handleCopy() {
    try {
      navigator.clipboard
        .writeText(lobbyPin)
        .then(() => {
          setCopied(true);
          copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    } catch {
      // Clipboard may be unavailable
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Protection par code
      </h2>

      <label className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${
            enabled ? 'bg-blue-600' : 'bg-zinc-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-800 shadow transition ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-zinc-700 dark:text-zinc-300">Protéger par un code</span>
      </label>

      {enabled && lobbyPin && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 font-mono text-2xl font-bold tracking-widest text-zinc-900 dark:text-zinc-100">
              {lobbyPin}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-2 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
            >
              {copied ? '✓ Copié' : '📋 Copier'}
            </button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Changer le code"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => room.send('host_set_pin', { pin: '' })}
            className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-sm text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30"
          >
            Supprimer le code
          </button>
        </div>
      )}
    </section>
  );
}
