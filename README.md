# Jeu de l'Oie Soirée

Adaptation web temps-réel d'un jeu de l'oie revisité version soirée. Multi-device, jusqu'à 10+ joueurs, server-authoritative via WebSocket (Colyseus).

## Stack

- **pnpm** workspaces + **Turborepo** + **Biome**
- **Colyseus 0.17** + TypeScript (serveur)
- **Next.js 15** + React 19 + Motion (web)
- **SQLite** + Drizzle ORM (persistance)
- **Docker Compose** + Caddy (déploiement)

## Specs

Lire dans cet ordre avant de coder :

1. [`docs/jeu-soiree-spec.md`](docs/jeu-soiree-spec.md) — spec produit complète
2. [`docs/section-10-resolutions.md`](docs/section-10-resolutions.md) — résolutions des points en suspens
3. [`docs/ui-ux-design.md`](docs/ui-ux-design.md) — design UI/UX (Jackbox-inspired)
4. [`docs/repo-structure.md`](docs/repo-structure.md) — structure technique cible

## Développement

```bash
pnpm install        # une fois
pnpm dev            # tous les services en parallèle
pnpm test           # tests Vitest
pnpm lint           # Biome
pnpm typecheck      # TypeScript
```

## Phase actuelle

**Phase 1** : `boardGenerator` + page `/preview?seed=XXX` pour visualiser le plateau procédural.
