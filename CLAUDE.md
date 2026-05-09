# Jeu de l'Oie Soiree

## Contexte
Adaptation web d'un jeu de l'oie revisite version soiree.
Multi-device, jusqu'a 10+ joueurs, server-authoritative via WebSocket (Colyseus).

## Specs - LIRE DANS CET ORDRE AVANT DE CODER
1. docs/jeu-soiree-spec.md - spec produit complete
2. docs/section-10-resolutions.md - resolutions des 8 points en suspens
3. docs/ui-ux-design.md - design UI/UX (Jackbox-inspired)
4. docs/repo-structure.md - structure technique cible

## Stack technique
- pnpm + Turborepo + Biome (un seul outil, pas ESLint+Prettier)
- Colyseus 0.17 + TypeScript cote serveur
- Next.js 15 + React 19 + Motion (ex Framer Motion) cote web
- SQLite + Drizzle ORM pour la persistence
- Docker + Caddy pour le deploiement

## Conventions
- TypeScript strict partout
- Pas de sudo npm install
- Tests Vitest co-localises
- Boundaries strictes : packages/ n'importe jamais de apps/

## Phase actuelle
Phase 1 : boardGenerator + visualisation
1. Initialiser le repo selon docs/repo-structure.md section 10
2. Implementer packages/game-logic/src/boardGenerator/ selon docs/jeu-soiree-spec.md section 4
3. Creer la page Next.js /preview?seed=XXX qui dessine le plateau SVG genere
4. Tests Vitest sur 100 seeds pour valider toutes les contraintes

## Important
- Le serveur est autoritaire : la logique de jeu tourne uniquement cote serveur
- Le client envoie des intentions, jamais des resultats
- Schemas Colyseus : experimentalDecorators true et useDefineForClassFields false dans tsconfig
