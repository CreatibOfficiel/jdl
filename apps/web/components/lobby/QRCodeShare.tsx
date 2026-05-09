'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface QRCodeShareProps {
  url: string;
  code: string;
}

export function QRCodeShare({ url, code }: QRCodeShareProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex-shrink-0 rounded-lg bg-white p-2 shadow-sm">
        <QRCodeSVG value={url} size={96} level="M" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-500">Code de partie</p>
        <p className="font-mono text-2xl font-bold tracking-wider text-zinc-900">{code}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          {copied ? '✓ Copié' : '📋 Copier le lien'}
        </button>
      </div>
    </div>
  );
}
