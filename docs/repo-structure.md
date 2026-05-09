# Structure du repo — Meilleures pratiques 2026

> Recherches et décisions sur l'organisation du code, les outils, et la structure du projet
> **Date** : 8 mai 2026

---

## 1. Synthèse des recherches

### Verdict sur les outils de monorepo

D'après les recherches récentes (2026), le consensus est clair :

> "Start with pnpm workspaces + Turborepo — lowest friction, excellent caching, good documentation. Define clear boundaries: shared packages in packages/, applications in apps/." — Source : DevToolBox 2026

**pnpm workspaces** gagne largement sur npm/yarn pour 3 raisons :
1. **Strict dependency isolation** — les packages ne peuvent pas accéder aux dépendances non déclarées (évite les phantom deps)
2. **Disk efficiency** via content-addressable store (gain massif d'espace disque)
3. **Protocole `workspace:*`** qui rend les références cross-package explicites

**Turborepo** par-dessus apporte :
- Build orchestration avec cache local (réduction de 30s → 0.2s sur builds incrémentaux d'après Nhost)
- Task dependency graph (ne build que ce qui a changé)
- Remote caching gratuit (via Vercel) si on en veut plus tard

### Verdict linter/formatter

**Biome** est devenu en 2026 le choix par défaut pour les nouveaux projets. Recherches récentes :

> "Biome est 10-25x plus rapide que ESLint + Prettier, utilise un seul fichier de config au lieu de quatre, et ship en single binary au lieu de 127+ packages npm." — Source : Better Dev 2025

> "Pour les nouveaux projets, Biome est maintenant le choix par défaut." — Source : DEV 2026

Biome v2.x (sortie juin 2025) inclut maintenant le **type-aware linting** qui était la dernière raison de rester sur ESLint. Performance : 423+ règles, 0.8s pour linter 10k fichiers (vs 45s avec ESLint).

**Limite à connaître** : Biome ne couvre pas encore certains plugins ESLint (comme `eslint-plugin-tailwindcss` pour ordonner les classes Tailwind), mais on peut s'en passer ou ajouter ESLint en surcouche pour ces cas-là plus tard.

### Verdict Colyseus

Colyseus est en **v0.17** au moment de la spec. Le pattern moderne utilise `defineServer`. Le SDK TypeScript permet maintenant de **partager les types directement entre client et serveur** via `Client<typeof server>` :

```typescript
// Client side
import { Client } from "@colyseus/sdk";
import type { server } from "../../server/src/app.config.ts";
const client = new Client<typeof server>("http://localhost:2567");
// Auto-complete fonctionne automatiquement sur room.state
```

Le compilo TS doit avoir ces flags (sinon les `@type` decorators ne marchent pas) :
```json
{
  "compilerOptions": {
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "strict": true
  }
}
```

---

## 2. Décisions retenues pour le projet

| Outil | Choix | Justification |
|---|---|---|
| Package manager | **pnpm** | Strict deps isolation, workspace:* protocol, gain disque |
| Build orchestration | **Turborepo** | Cache local efficace, simple à configurer |
| Linter + Formatter | **Biome** v2 | 1 outil, 1 config, 10-25x plus rapide |
| Tests | **Vitest** | Compatible Vite/Next, rapide, API Jest |
| Backend framework | **Colyseus 0.17** | Multiplayer turn-based natif |
| Frontend framework | **Next.js 15** + React 19 | App Router, SSR du lobby, écosystème connu |
| Type checking | **TypeScript 5.7** | Strict mode partout |
| Container | **Docker** + Compose | Self-hosted Contabo VPS |
| Reverse proxy | **Caddy** | Déjà en place, WS natif, TLS auto |

---

## 3. Structure de dossiers détaillée

### Vue d'ensemble

```
jeu-soiree/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint + test + build
│       └── deploy.yml              # Build images + push + deploy
├── apps/
│   ├── server/                     # Colyseus
│   └── web/                        # Next.js
├── packages/
│   ├── shared/                     # Types et constantes partagés
│   ├── game-logic/                 # Logique pure (testable, sans deps réseau)
│   └── tsconfig/                   # Configs TS partagées
├── docker/
│   ├── Caddyfile
│   └── docker-compose.yml
├── scripts/
│   ├── dev.sh                      # Lance tout en dev
│   └── seed-test-game.ts           # Crée une partie test
├── data/                           # SQLite (gitignored, monté en volume)
│   └── .gitkeep
├── .dockerignore
├── .gitignore
├── .nvmrc                          # Node version pinnée
├── biome.json                      # Config Biome unique
├── docker-compose.yml              # Compose pour prod
├── docker-compose.dev.yml          # Compose pour dev
├── package.json                    # Root, scripts globaux
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── README.md
├── tsconfig.base.json              # Config TS racine
└── turbo.json
```

### Détail `apps/server/`

```
apps/server/
├── src/
│   ├── index.ts                    # Entry point (defineServer)
│   ├── app.config.ts               # Config Colyseus (rooms, transport)
│   ├── rooms/
│   │   ├── GameRoom.ts             # Room principale
│   │   └── GameRoom.test.ts
│   ├── schemas/
│   │   ├── GameState.ts            # State synchronisé
│   │   ├── Player.ts
│   │   ├── BoardCase.ts
│   │   └── EventLog.ts
│   ├── handlers/                   # Handlers de messages client
│   │   ├── rollDice.ts
│   │   ├── buyItem.ts
│   │   ├── useItem.ts
│   │   ├── choosePill.ts
│   │   ├── railDeBus.ts
│   │   ├── givePotion.ts
│   │   ├── chooseBromance.ts
│   │   └── index.ts                # Re-export + register
│   ├── game/                       # Game flow (pas de réseau)
│   │   ├── turnEngine.ts           # Logique de tour
│   │   ├── effectsResolver.ts      # Application des effets de cases
│   │   ├── inventoryManager.ts
│   │   ├── bromanceManager.ts
│   │   └── victoryCheck.ts
│   ├── persistence/
│   │   ├── sqlite.ts               # better-sqlite3 setup
│   │   ├── migrations/
│   │   │   └── 001_init.sql
│   │   ├── repositories/
│   │   │   ├── games.ts
│   │   │   ├── players.ts
│   │   │   └── stats.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── logger.ts               # pino
│   │   └── env.ts                  # validation des env vars (zod)
│   └── types/
│       └── messages.ts             # Types des messages client→server
├── tests/
│   ├── integration/
│   │   └── full-game.test.ts       # Joue une partie complète
│   └── fixtures/
│       └── test-board.ts
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

### Détail `apps/web/`

```
apps/web/
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Layout racine (font, theme)
│   ├── page.tsx                    # Landing : créer/rejoindre
│   ├── lobby/
│   │   └── [code]/
│   │       └── page.tsx            # Lobby de partie
│   ├── game/
│   │   └── [code]/
│   │       └── page.tsx            # Écran de jeu
│   ├── end/
│   │   └── [gameId]/
│   │       └── page.tsx            # Récap fin de partie
│   ├── stats/
│   │   └── page.tsx                # Stats globales
│   └── preview/
│       └── page.tsx                # Preview de boardGenerator (admin)
├── components/
│   ├── board/
│   │   ├── Board.tsx               # SVG plateau
│   │   ├── Case.tsx                # Case mémoïsée
│   │   ├── Pawn.tsx                # Pion animé
│   │   ├── ZoneSoifIndicator.tsx
│   │   └── boardGeometry.ts        # Calculs angles/coords
│   ├── dice/
│   │   ├── Dice.tsx                # Dé 3D CSS
│   │   └── dice.module.css
│   ├── modals/
│   │   ├── BaseModal.tsx
│   │   ├── ShopModal.tsx
│   │   ├── PilulesModal.tsx
│   │   ├── RailDeBusModal.tsx
│   │   ├── BromanceModal.tsx
│   │   ├── WitchPotionModal.tsx
│   │   └── TreasureModal.tsx
│   ├── lobby/
│   │   ├── PlayersList.tsx
│   │   ├── BoardPreview.tsx
│   │   ├── ConfigSliders.tsx
│   │   └── QRCodeShare.tsx
│   ├── ui/                         # Primitives shadcn/ui
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── EventLog.tsx
│   ├── PlayersBar.tsx
│   ├── Inventory.tsx
│   └── ConnectionStatus.tsx
├── hooks/
│   ├── useColyseusRoom.ts          # Connexion + subscribe state
│   ├── useGameState.ts             # Sélecteurs sur le state
│   ├── useReducedMotion.ts
│   ├── useSounds.ts                # Howler.js wrapper
│   └── useVibration.ts
├── lib/
│   ├── colyseus.ts                 # Client Colyseus singleton
│   ├── sounds.ts                   # Préchargement
│   └── format.ts                   # Helpers d'affichage
├── stores/
│   └── uiStore.ts                  # Zustand : UI state local (modal open, mute, etc.)
├── public/
│   ├── sounds/
│   │   ├── dice-shake.mp3
│   │   ├── dice-land.mp3
│   │   └── ...
│   └── icons/
├── styles/
│   └── globals.css                 # Tailwind + custom
├── Dockerfile
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

### Détail `packages/shared/`

```
packages/shared/
├── src/
│   ├── index.ts                    # Re-exports
│   ├── types/
│   │   ├── case.ts                 # CaseType, BoardCase
│   │   ├── player.ts               # Suit, ItemType
│   │   ├── game.ts                 # GamePhase, GameConfig
│   │   ├── messages.ts             # Types messages WS
│   │   └── events.ts               # GameEvent
│   ├── constants/
│   │   ├── board.ts                # BOARD_SIZE, casting, etc.
│   │   ├── colors.ts               # Palette daltonisme-friendly
│   │   ├── emojis.ts               # Avatars disponibles
│   │   └── game-rules.ts           # Defaults configurables
│   └── utils/
│       └── codes.ts                # Génération codes de partie
├── package.json
└── tsconfig.json
```

### Détail `packages/game-logic/`

> Ce package est important : il contient toute la logique pure du jeu (pas de réseau, pas de DOM). Il est partagé entre client (pour preview/replay) et serveur (pour autorité). Tests faciles parce que pure fonction.

```
packages/game-logic/
├── src/
│   ├── index.ts
│   ├── boardGenerator/
│   │   ├── index.ts                # generateBoard(seed): Board
│   │   ├── constraints.ts          # Validation des contraintes
│   │   ├── poissonDisk.ts          # Algorithme de placement
│   │   └── seed.ts                 # PRNG seedé
│   ├── effects/
│   │   ├── numbers.ts              # Effets cases-chiffres
│   │   ├── special.ts              # Effets cases spéciales
│   │   └── index.ts
│   ├── rules/
│   │   ├── prison.ts
│   │   ├── bromance.ts
│   │   ├── treasure.ts
│   │   └── ...
│   └── types.ts                    # Types internes (pas exposés aux apps)
├── tests/
│   ├── boardGenerator.test.ts      # 100 seeds testés
│   ├── effects.test.ts
│   └── rules/
│       └── ...
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 4. Configurations clés

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `package.json` (root)

```json
{
  "name": "jeu-soiree",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.3.0",
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### `turbo.json`

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### `biome.json`

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.3.0/schema.json",
  "files": {
    "ignoreUnknown": true,
    "ignore": [
      "**/dist",
      "**/.next",
      "**/node_modules",
      "**/coverage",
      "**/data"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "warn",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "useConst": "error",
        "useTemplate": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "organizeImports": {
    "enabled": true
  }
}
```

### `tsconfig.base.json` (racine)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

> Note : `useDefineForClassFields: false` et `experimentalDecorators: true` sont **obligatoires** pour Colyseus (les decorators `@type` ne fonctionnent pas sinon).

### `apps/server/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

### `apps/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 5. Conventions de code

### Boundaries strictes (très important)

D'après les recherches : "Define clear boundaries: shared packages in packages/, applications in apps/. Never import app code from a shared package."

**Règles** :
- `packages/*` ne peut **jamais** importer de `apps/*`
- `apps/*` peut importer de `packages/*`
- `packages/game-logic` ne peut **jamais** importer de `packages/shared` (ou inversement) — sauf si `shared` est un sous-set de pure types
- Pas de cycle d'imports

Pour faire respecter ça, on peut activer une règle Biome (ou ajouter `eslint-plugin-boundaries` plus tard si besoin).

### Naming conventions

```
- Fichiers TypeScript : camelCase pour utilitaires, PascalCase pour composants/classes
  - components/Button.tsx       (composant React)
  - hooks/useGameState.ts       (hook)
  - lib/format.ts               (utilitaires)
  - schemas/GameState.ts        (classe Schema)

- Constants : SCREAMING_SNAKE_CASE
  - const MAX_PLAYERS = 10;

- Types/interfaces : PascalCase
  - type CaseType = ...
  - interface BoardCase { ... }

- Variables/fonctions : camelCase
  - const playerCount = ...
  - function generateBoard() { ... }
```

### Pattern : `index.ts` barrel files

Chaque dossier de feature exporte ses contenus via un `index.ts` :

```typescript
// packages/game-logic/src/effects/index.ts
export * from "./numbers";
export * from "./special";
```

Permet d'importer joliment : `import { applyNumberEffect, applySpecialEffect } from "@jeu-soiree/game-logic/effects"`.

### Pattern : separation client/server schémas

Les **schémas Colyseus** restent côté serveur (`apps/server/src/schemas/`), mais les **types purs** (sans decorators) sont dans `packages/shared`. Le client utilise les types purs pour le typage et `Client<typeof server>` pour récupérer le schema runtime.

### Path aliases

Dans `tsconfig.base.json` on peut ajouter des aliases pour éviter `../../../` :

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["packages/shared/src/*"],
      "@game-logic/*": ["packages/game-logic/src/*"]
    }
  }
}
```

---

## 6. Docker — Multi-stage builds avec Turborepo

### Pourquoi `turbo prune` est crucial

Sans optimisation, à chaque petit changement dans un package, **tous les Docker layers sont invalidés** parce que le contexte de build inclut tout le repo. Turborepo offre une solution avec `turbo prune` :

> "In a large monorepo, this can result in a huge amount of lost time, as any change to a monorepo's lockfile cascades into tens or hundreds of deploys. The solution is to prune the inputs to the Dockerfile to only what is strictly necessary." — Turborepo docs

`turbo prune <app> --docker` génère un dossier `out/` avec seulement les fichiers nécessaires pour l'app cible, séparés en :
- `out/json/` — juste les `package.json` (pour le `pnpm install`, layer cacheable)
- `out/full/` — le code source (layer qui change souvent)

### `apps/server/Dockerfile`

```dockerfile
ARG NODE_VERSION=20-alpine
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# === Pruner stage ===
FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo@2 prune server --docker

# === Installer stage ===
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# === Builder stage ===
FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=server

# === Runner stage ===
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache libc6-compat
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 colyseus
USER colyseus
WORKDIR /app

COPY --from=builder --chown=colyseus:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=colyseus:nodejs /app/apps/server/package.json ./
COPY --from=builder --chown=colyseus:nodejs /app/node_modules ./node_modules

EXPOSE 2567
CMD ["node", "dist/index.js"]
```

### `apps/web/Dockerfile`

```dockerfile
ARG NODE_VERSION=20-alpine
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# === Pruner stage ===
FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo@2 prune web --docker

# === Installer stage ===
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# === Builder stage ===
FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo build --filter=web

# === Runner stage ===
FROM node:${NODE_VERSION} AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output (configure dans next.config.js)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

> Note : il faut ajouter `output: 'standalone'` dans `apps/web/next.config.js` pour bénéficier du tracing automatique des dépendances.

### `docker-compose.yml`

```yaml
services:
  web:
    build:
      context: .
      dockerfile: ./apps/web/Dockerfile
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_COLYSEUS_URL=wss://${DOMAIN}/colyseus
    networks:
      - app
    depends_on:
      - server

  server:
    build:
      context: .
      dockerfile: ./apps/server/Dockerfile
    restart: unless-stopped
    environment:
      - PORT=2567
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    networks:
      - app

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - DOMAIN=${DOMAIN}
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - app
    depends_on:
      - web
      - server

networks:
  app:

volumes:
  caddy_data:
  caddy_config:
```

### `docker-compose.dev.yml` (pour dev local)

```yaml
services:
  server:
    build:
      context: .
      dockerfile: ./apps/server/Dockerfile.dev
    volumes:
      - ./apps/server/src:/app/apps/server/src
      - ./packages:/app/packages
    environment:
      - NODE_ENV=development
    ports:
      - "2567:2567"
    command: pnpm --filter server dev

  web:
    build:
      context: .
      dockerfile: ./apps/web/Dockerfile.dev
    volumes:
      - ./apps/web:/app/apps/web
      - ./packages:/app/packages
      - /app/apps/web/.next
      - /app/node_modules
    environment:
      - NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567
    ports:
      - "3000:3000"
    command: pnpm --filter web dev
```

> En local, la plupart du temps tu lanceras `pnpm dev` directement (sans Docker) — c'est plus rapide. Docker compose dev sert pour tester l'env Docker exact ou rejoindre un copain qui aiderait sur le projet.

### `.dockerignore`

```
**/node_modules
**/.next
**/dist
**/.turbo
**/coverage
**/.env*
**/.git
**/.vscode
**/.idea
**/data
**/*.log
README.md
```

---

## 7. Caddyfile final

```caddy
{$DOMAIN} {
  encode gzip zstd

  # WebSocket Colyseus + matchmaking HTTP
  handle_path /colyseus/* {
    reverse_proxy server:2567
  }

  # Frontend Next.js (catch-all)
  handle {
    reverse_proxy web:3000
  }

  # Évite de fermer brutalement les WebSockets lors d'un reload de Caddy
  servers {
    stream_close_delay 5m
  }

  log {
    output file /data/access.log {
      roll_size 10mb
      roll_keep 5
    }
  }
}
```

---

## 8. CI/CD avec GitHub Actions

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.15.0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

### `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: SSH deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/jeu-soiree
            git pull
            docker compose pull
            docker compose up -d --build
            docker image prune -f
```

> Approche simple "git pull + rebuild" qui marche sur ton Contabo. Plus tard, on peut passer à un registry Docker (ghcr.io) avec push d'images puis pull sur le VPS — moins de CPU consommé sur le VPS pour les builds.

---

## 9. Outils de développement complémentaires

### `.vscode/extensions.json` (recommandé pour ton équipe)

```json
{
  "recommendations": [
    "biomejs.biome",
    "bradlc.vscode-tailwindcss",
    "vitest.explorer",
    "dbaeumer.vscode-eslint",
    "ms-azuretools.vscode-docker"
  ]
}
```

### `.vscode/settings.json`

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": "explicit",
    "quickfix.biome": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

### Husky + lint-staged (pre-commit hook)

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,ts,jsx,tsx,json}": ["biome check --write --no-errors-on-unmatched"]
  }
}
```

```bash
# .husky/pre-commit
pnpm lint-staged
```

Cela garantit que tout le code est formatté/linté avant commit, sans bloquer si des fichiers sont irréparables.

---

## 10. Checklist initialisation du projet

À l'init du projet, voici les commandes dans l'ordre :

```bash
# 1. Init structure
mkdir jeu-soiree && cd jeu-soiree
git init
echo "20" > .nvmrc
nvm use

# 2. Install pnpm
corepack enable
corepack prepare pnpm@9.15.0 --activate

# 3. Init root package.json
pnpm init
# (copier le package.json template ci-dessus)

# 4. Workspace
echo 'packages:' > pnpm-workspace.yaml
echo '  - "apps/*"' >> pnpm-workspace.yaml
echo '  - "packages/*"' >> pnpm-workspace.yaml

# 5. Install root deps
pnpm add -Dw turbo @biomejs/biome typescript

# 6. Init Biome
pnpm biome init

# 7. Créer les configs (turbo.json, tsconfig.base.json) — copier les templates

# 8. Créer les apps/packages
mkdir -p apps/server/src apps/web packages/shared/src packages/game-logic/src

# 9. Init server avec colyseus
cd apps/server
pnpm init  # name: "server"
pnpm add colyseus @colyseus/schema @colyseus/ws-transport
pnpm add -D ts-node-dev typescript @types/node

# 10. Init web avec Next.js
cd ../web
pnpm create next-app@latest . --ts --tailwind --app --no-src-dir --import-alias "@/*"
pnpm add motion howler canvas-confetti zustand qrcode.react clsx
pnpm add @colyseus/sdk

# 11. Init shared package
cd ../../packages/shared
pnpm init  # name: "@jeu-soiree/shared"
pnpm add -D typescript

# 12. Init game-logic
cd ../game-logic
pnpm init  # name: "@jeu-soiree/game-logic"
pnpm add -D typescript vitest

# 13. Tout réinstaller depuis la racine
cd ../..
pnpm install

# 14. Premier commit
git add . && git commit -m "chore: initial monorepo setup"
```

---

## 11. Décisions à challenger (optionnel)

Quelques alternatives qu'on peut considérer si tu veux pousser plus loin :

### Bun au lieu de Node ?

Colyseus 0.17 supporte officiellement Bun via `@colyseus/bun-websockets`. Avantages : démarrage 4x plus rapide, runtime natif TypeScript (pas de compilation). Inconvénient : moins mature, certaines libs ont des edge cases.

**Verdict** : reste sur Node pour le MVP, c'est éprouvé. Bun en post-MVP si tu veux explorer.

### Drizzle ORM au lieu de SQL brut ?

Pour les stats SQLite, tu pourrais utiliser Drizzle. Avantages : type-safe, migrations gérées, pas de SQL strings dans le code.

**Verdict** : oui, c'est une bonne idée. Léger (8kb), zero-runtime, marche très bien avec better-sqlite3. À ajouter dans `apps/server/package.json` :
```bash
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit
```

### Zod pour valider les messages WS ?

Très recommandé. Zod permet de valider les payloads des messages côté serveur avant de les traiter, éviter les bugs/exploits.

```typescript
const RollDiceMessage = z.object({});
const BuyItemMessage = z.object({ itemType: z.enum(['key', 'crowbar', 'malus']) });
```

**Verdict** : oui, à ajouter. ~12kb gzipped, parfait pour ce cas.

---

## 12. Récapitulatif des décisions

| Domaine | Décision |
|---|---|
| Package manager | **pnpm 9** |
| Build orchestration | **Turborepo 2** |
| Linter/Formatter | **Biome 2** (un seul outil) |
| Tests | **Vitest** |
| Backend | **Colyseus 0.17** + Node 20 |
| Frontend | **Next.js 15** + React 19 |
| Animations | **Motion** (ex Framer Motion) |
| Database | **SQLite** + **Drizzle ORM** |
| Validation | **Zod** côté serveur |
| Container | **Docker** multi-stage avec `turbo prune` |
| Deploy | **Self-hosted Contabo** + Caddy + GitHub Actions |
| CI | **GitHub Actions** (lint + test + build) |
| Pre-commit | **Husky + lint-staged + Biome** |

---

*Document de structure prêt. Le repo est maintenant entièrement spécifié, prêt pour `pnpm install` et l'implémentation Phase 1.*
