import { Client } from 'colyseus.js';

let client: Client | null = null;

function resolveUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_COLYSEUS_URL;
  if (fromEnv) return fromEnv;
  if (typeof window === 'undefined') return 'ws://localhost:2567';

  const isSecure = window.location.protocol === 'https:';
  // Behind Caddy/reverse proxy in HTTPS: the upstream path is /colyseus/*
  if (isSecure) {
    return `wss://${window.location.host}/colyseus`;
  }
  // Direct port access (local dev or HTTP-only VPS access by IP)
  return `ws://${window.location.hostname}:2567`;
}

export function getColyseusClient(): Client {
  if (!client) {
    client = new Client(resolveUrl());
  }
  return client;
}
