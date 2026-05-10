'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';

interface QRCodeShareProps {
  url: string;
  code: string;
}

export function QRCodeShare({ url, code }: QRCodeShareProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  async function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 p-4">
      <div className="flex-shrink-0 rounded-lg bg-white dark:bg-zinc-800 p-2 shadow-sm">
        <QRCodeSVG value={url} size={96} level="M" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Code de partie</p>
        <p className="font-mono text-2xl font-bold tracking-wider text-zinc-900 dark:text-zinc-100">
          {code}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
        >
          {copied ? '✓ Copié' : '📋 Copier le lien'}
        </button>
      </div>
    </div>
  );
}
