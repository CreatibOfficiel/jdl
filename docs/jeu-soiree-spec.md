# Jeu de l'Oie Soirée — Spec & Plan

> **Version** : 1.0 — 8 mai 2026
> **Auteur** : Thibaud (specs) + Claude (rédaction)
> **Status** : Spec gelée, prête pour implémentation

---

## 1. Vision

Adapter en application web temps-réel un jeu de l'oie revisité version soirée (jeu de plateau physique existant). Chaque joueur se connecte depuis son propre device (mobile ou desktop), apparaît sur le plateau avec son pion, et la partie se joue à plusieurs (jusqu'à 10+ joueurs simultanés) avec une logique de gorgées appliquée IRL.

Le jeu sert à la fois :
- de produit de soirée fonctionnel (multi-device, design clean, expérience fluide)
- de pièce de portfolio pour la pivot GTM/AI Engineering
- de terrain d'expérimentation pour des patterns temps-réel propres (server-authoritative, état synchronisé, randomisation procédurale)

### Objectifs de design

| Priorité | Objectif | Contraintes |
|---|---|---|
| 1 | MVP testable rapidement | Itération courte, pas d'over-engineering |
| 2 | Design clean et fluide | Animations soignées, feedback clair, mobile-first |
| 3 | Architecture propre et scalable | TypeScript end-to-end, état serveur autoritaire |
| 4 | Self-hosted | Docker Compose sur VPS Contabo, derrière Caddy |

### Non-objectifs (explicites)

- **Pas d'auth complexe** au démarrage. Pseudo + signe au lobby suffit.
- **Pas de gestion IRL des gorgées**. L'app affiche les ordres de boire, le joueur boit en vrai.
- **Pas de monétisation, pas de pub.**
- **Pas de matchmaking public**. Les parties se rejoignent par code/lien partagé entre amis.

---

## 2. Stack technique

### Choix retenus

| Couche | Techno | Raison |
|---|---|---|
| Backend | **Colyseus 0.16** (Node.js + TypeScript) | Framework turn-based natif, schéma synchronisé delta-compressé, rooms et matchmaking out-of-the-box, autorité serveur par design |
| Frontend | **Next.js 15 + React 19 + TypeScript** | App Router pour le lobby SSR + page de jeu CSR, écosystème connu, déploiement simple |
| Plateau | **SVG natif + Framer Motion** | Plateau circulaire 63 cases en arc, pions animés via path SVG, déclaratif, accessible, pas de canvas |
| Styling | **Tailwind CSS v4** | Vitesse de prototypage, design tokens cohérents |
| Composants | **shadcn/ui** + **Radix** | Modals, sliders, dialogs, accessibles par défaut |
| State client | **Zustand** + hooks Colyseus | Léger, pas de Redux, le state autoritaire vient du serveur |
| Stats persistées | **SQLite** (better-sqlite3) | Fichier monté en volume, zéro admin, suffisant pour stats locales |
| Build | **pnpm workspaces** (monorepo) | apps/server, apps/web, packages/shared |
| Container | **Docker Compose** | 3 services : web, server, caddy |
| Reverse proxy | **Caddy** (déjà en place) | WS upgrade auto, TLS auto, config triviale |
| Lint / format | **Biome** | 1 outil au lieu de eslint+prettier, rapide |
| Tests | **Vitest** | Rapide, compatible TS, pour le boardGenerator et la game logic |

### Structure du repo

```
jeu-soiree/
├── apps/
│   ├── server/                    # Colyseus
│   │   ├── src/
│   │   │   ├── rooms/
│   │   │   │   └── GameRoom.ts
│   │   │   ├── schemas/
│   │   │   │   ├── GameState.ts
│   │   │   │   └── Player.ts
│   │   │   ├── logic/
│   │   │   │   ├── boardGenerator.ts
│   │   │   │   ├── effects.ts        # Application des effets de cases
│   │   │   │   └── turnEngine.ts     # Logique de tour
│   │   │   ├── stats/
│   │   │   │   └── sqlite.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                       # Next.js
│       ├── app/
│       │   ├── page.tsx           # Landing / création partie
│       │   ├── lobby/[code]/page.tsx
│       │   └── game/[code]/page.tsx
│       ├── components/
│       │   ├── Board/             # SVG plateau
│       │   ├── Pawn/              # Pion animé
│       │   ├── Dice/
│       │   ├── EventLog/
│       │   ├── Inventory/
│       │   └── modals/
│       │       ├── ShopModal.tsx
│       │       ├── PilulesModal.tsx
│       │       ├── RailDeBusModal.tsx
│       │       └── ...
│       ├── hooks/
│       │   ├── useColyseusRoom.ts
│       │   └── useGameState.ts
│       ├── lib/
│       │   └── boardGeometry.ts   # Calcul x/y des 63 cases sur l'arc
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared/                    # Types partagés client/serveur
│       └── src/
│           ├── types.ts
│           └── constants.ts
├── docker-compose.yml
├── Caddyfile
├── pnpm-workspace.yaml
├── biome.json
└── README.md
```

---

## 3. Modélisation des règles

### 3.1 Plateau

- **63 cases** + Départ + Arrivée
- Forme : spirale circulaire (anneau extérieur 1→27, anneau intermédiaire 28→55, anneau intérieur 56→63)
- Sens de progression : voir photo (Départ en bas, Arrivée au centre-bas)

### 3.2 Casting des cases (fixe, identique chaque partie)

| Type | Nb | Effet |
|---|---|---|
| Cases-chiffres rouges | 14 | Distribuer N gorgées (ou boire si zone soif) |
| Cases-chiffres verts | 14 | Distribuer N gorgées |
| Cartes ♠♥♦♣ | 4 | Match avec suit du joueur : sur ton signe = distribue, sinon = bois |
| Shop | 2 | Achat objets (clé prison, pied de biche, pt malus×6) |
| Formule 1 | 1 | Avance 4 cases immédiatement |
| Usain Bolt | 1 | Avance 2 cases immédiatement |
| Prison | 1 | Reste bloqué jusqu'au 4e tour ou un 6 ou clé |
| Trou | 2 | Lance dé, résultat N = N tours à n'avancer que d'1 case |
| Vacances | 1 | Aucun effet |
| Sorcière | 2 | Gagne 1 potion (utilisable pour sauver un autre joueur) |
| Bromance | 2 | Crée un lien réciproque (override l'ancien) |
| Pilules | 2 | Choix rouge ou bleu (cf. effets ci-dessous) |
| Rail de bus | 1 | Mini-jeu cartes virtuelles (4 manches max) |
| Tunnel/Portail | 4 (2 paires) | Téléportation bidirectionnelle, ne compte pas dans le décompte |
| Cases neutres | 10 | Aucun effet |

**Total : 63** (61 visibles + Départ + Arrivée)

**Trésors** : 2 cases tirées aléatoirement parmi les 63 au début de partie, non affichées au plateau. Si un joueur passe sur une case-trésor ET qu'il possède un pied de biche, il peut ouvrir.

### 3.3 Effets détaillés

#### Cases-chiffres (rouges/verts)

- **Hors zone de la soif** : le nombre N indique combien de gorgées le joueur distribue (à un autre joueur, son choix).
- **Dans la zone de la soif** : les rouges = boire N gorgées. Les verts continuent à distribuer.

#### Shop

À chaque passage sur la case Shop, le joueur peut acheter (modal qui s'ouvre) :
- **Clé de prison** — coût : 5 gorgées à boire
- **Pied de biche** — coût : 8 gorgées à boire (sert à ouvrir un coffre)
- **Pt malus ×6** — coût : 6 gorgées à boire (à clarifier : effet exact à confirmer)

Achat optionnel. Les objets sont stockés dans l'inventaire et utilisables manuellement.

#### Formule 1

Avance immédiatement de 4 cases. Pas de relance de dé. L'effet de la case d'arrivée s'applique normalement.

#### Usain Bolt

Avance immédiatement de 2 cases. Idem Formule 1.

#### Prison (case 35 originellement, position randomisée)

À chaque tour, le joueur lance un dé.
- Fait un 6 → libéré, pas de gorgée
- Sinon → boit 1 gorgée et reste en prison
- Au bout de son 4e tour, sort automatiquement et lance le dé normalement
- **Clé de prison** dans l'inventaire → libération immédiate (consommable)

#### Trésor

Quand un joueur ouvre un coffre (avec pied de biche), il lance un dé :
- **1-2** : distribue 3 gorgées à tout le monde
- **3-4** : gagne un dé pipé
- **5-6** : échange sa position avec un autre joueur (au choix)

Le pied de biche est consommé. Max 2 coffres par partie.

#### Tunnel / Portails

- 2 paires de portails sur le plateau
- Bidirectionnels : entrer par n'importe quel bout de la paire → sortir par l'autre
- **Ne compte pas dans le décompte des cases** : si tu lances un 5 et qu'il y a un portail entre toi et ta cible, tu fais quand même 5 cases (le portail te téléporte mais ne consomme pas de mouvement)

> **À clarifier** : déclenchement automatique en passant dessus, ou seulement en s'arrêtant dessus ? Hypothèse retenue : seulement en s'arrêtant dessus (sinon trop de téléportations parasites).

#### Sorcière

Quand un joueur tombe sur une case sorcière, il gagne **1 potion** (objet d'inventaire).

Utilisation manuelle : à n'importe quel moment, le joueur peut offrir sa potion à un autre joueur qui doit boire X gorgées.
- Si le receveur dit "merci" (bouton dans l'UI) → il est sauvé, ne boit rien
- S'il ne dit pas merci (timer 10s) → il boit le double des gorgées initiales

Max 2 sorcières activées par partie.

#### Bromance

Tomber sur une case bromance déclenche le choix d'un autre joueur avec lequel se "bromance".
- Lien réciproque : quand l'un boit, l'autre boit ; quand l'autre boit, le premier boit
- **Non cumulable** : tomber sur une nouvelle case bromance écrase le lien précédent
- Le bromance ne survit pas à la fin de partie

#### Rail de bus

Mini-jeu de cartes virtuelles à 4 manches successives :
1. **Couleur** : rouge ou noir ?
2. **Plus / moins** : la prochaine carte est-elle plus haute ou plus basse que la précédente ?
3. **Inter / exter** : la prochaine carte est-elle entre les deux précédentes ou en dehors ?
4. **Signe** : ♠ ♥ ♦ ou ♣ ?

Règles :
- À chaque échec, le joueur boit le nombre de cartes déjà tirées (1 gorgée pour échec en manche 1, 4 pour échec en manche 4)
- Max 4 essais (re-tirages) par partie sur cette case
- Réussir les 4 manches = pas de gorgée

#### Pilules

Choix immédiat : rouge ou bleu.

**Rouge** : boit 6 gorgées directement.

**Bleu** : lance un dé.
- 1-2 → boit 8 gorgées
- 3-4 → distribue 10 gorgées
- 5-6 → double tes prochaines gorgées (effet one-shot, consommé à la prochaine fois où tu bois)

#### Trou

Lance un dé. Le résultat N indique pendant combien de tours tu seras coincé à n'avancer que d'1 case par tour (pas de lancé de dé pendant cette période). Plus tu fais 1, plus tu sors vite. Plus tu fais 6, plus tu galères.

> Exemple : tu fais 4 → tu n'avances que d'1 case pendant 4 tours, puis reprends normalement.

#### Vacances

Aucun effet. Profite. ❤️

#### Cartes ♠♥♦♣

Au début de la partie, chaque joueur choisit un signe (visible dans son profil).
- Tomber sur la case correspondant à son propre signe → distribue
- Tomber sur la case d'un autre signe → boit (X gorgées, à définir, hypothèse : 3)

> **À clarifier** : nombre de gorgées exact pour les cartes (boit/distribue X). Hypothèse retenue : **3 gorgées**.

### 3.4 Conditions de tour et de victoire

- **Ordre de jeu** : phase initiale "rolling order", chaque joueur lance un dé, le plus grand commence (égalité = relance entre les ex-aequo).
- **Tour normal** : lance le dé → animation du pion case par case → application de l'effet de la case d'arrivée → fin de tour.
- **Victoire** : atterrir **exactement** sur la case 63.
- **Dépassement** : si le résultat du dé fait dépasser 63, le pion recule du surplus depuis 63. (Ex : sur 60, lance 5 → arrive à 63 + 2 → recule à 61.)
- **Le joueur sur la 63 gagne** : la partie s'arrête immédiatement, écran de récap.

---

## 4. Génération procédurale du plateau

### 4.1 Principe

À chaque création de partie, l'host génère un plateau via `boardGenerator(seed)` qui retourne :
- La position de chaque case spéciale
- La position des cartes ♠♥♦♣
- La répartition des cases-chiffres (rouges/verts)
- La zone de la soif (start, length)
- Les 2 cases-trésor (cachées)

Le **seed** est dérivé d'un code court partageable (ex : `THIB-4F2K`). Même seed = même plateau, ce qui permet de rejouer ou défier d'autres groupes.

### 4.2 Contraintes de placement

| Contrainte | Détail |
|---|---|
| Zone de la soif | 5 à 7 cases consécutives, démarrant entre cases 8 et 30 |
| Prison | Toujours entre cases 25 et 50 |
| Shop tôt | 1er Shop entre 5 et 30 |
| Shop tard | 2e Shop entre 31 et 58 |
| Rail de bus | Pas avant la case 20 |
| Vacances | Entre cases 55 et 61 |
| Distance min entre cases spéciales (effets) | 2 cases (pas d'adjacence) |
| Distance min entre cartes ♠♥♦♣ | 1 case (peuvent être proches) |
| Portails appariés | Distance min 15 entre entrée et sortie d'une paire |
| Équilibre rouge/vert | 14 de chaque, au moins 3 rouges dans la zone de la soif |

### 4.3 Algorithme

1. Tirer la zone de la soif (start + length) selon les contraintes
2. Placer les cases zonées : prison, shops, rail de bus, vacances
3. Placer les 2 paires de portails avec contrainte de distance
4. Placer les autres spéciales (Formule 1, Usain Bolt, Trous×2, Sorcières×2, Bromance×2, Pilules×2) via Poisson disk adapté (distance min = 2)
5. Placer les 4 cartes ♠♥♦♣ (distance min = 1)
6. Remplir les cases restantes en chiffres, en respectant l'équilibre rouge/vert et la contrainte zone de la soif
7. Tirer 2 cases-trésor parmi les cases neutres ou simples

### 4.4 Validation visuelle

Une page admin `/preview?seed=XXX` affiche le plateau généré sans démarrer de partie, pour valider la distribution avant lancement. Permet aussi de tester rapidement plusieurs seeds.

---

## 5. Architecture temps-réel (Colyseus)

### 5.1 Schémas synchronisés

```typescript
// packages/shared/src/types.ts
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type ItemType = 'prison_key' | 'crowbar' | 'malus_point' | 'potion' | 'loaded_die';
export type CaseType =
  | 'neutral' | 'red_number' | 'green_number'
  | 'spades' | 'hearts' | 'diamonds' | 'clubs'
  | 'shop' | 'formule1' | 'usain' | 'prison' | 'hole'
  | 'vacances' | 'witch' | 'bromance' | 'pills'
  | 'rail_de_bus' | 'portal';

export interface BoardCase {
  index: number;
  type: CaseType;
  numberValue?: number;       // pour red/green numbers
  portalPairId?: number;      // pour matcher les paires de portails
}

export interface Board {
  cases: BoardCase[];
  thirstZone: { start: number; length: number };
  treasureCases: number[];    // 2 cases (caché côté client jusqu'à ouverture)
  seed: string;
}
```

```typescript
// apps/server/src/schemas/Player.ts
export class Player extends Schema {
  @type("string") id!: string;
  @type("string") name!: string;
  @type("string") suit!: Suit;
  @type("string") color!: string;       // pion couleur
  @type("number") position: number = 0;
  @type([ "string" ]) inventory = new ArraySchema<string>();
  @type("string") bromanceWith: string | null = null;
  @type("number") prisonTurnsLeft: number = 0;
  @type("number") holeTurnsLeft: number = 0;
  @type("boolean") doubleNextSip: boolean = false;
  @type("boolean") connected: boolean = true;

  // Stats
  @type("number") sipsTaken: number = 0;
  @type("number") sipsGiven: number = 0;
  @type("number") shopPurchases: number = 0;
  @type("number") diceRolls: number = 0;
}
```

```typescript
// apps/server/src/schemas/GameState.ts
export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([ "string" ]) turnOrder = new ArraySchema<string>();
  @type("number") currentTurnIndex: number = 0;
  @type("string") phase: 'lobby' | 'rolling_order' | 'playing' | 'finished' = 'lobby';
  @type("string") boardSeed!: string;
  @type([ BoardCaseSchema ]) board = new ArraySchema<BoardCaseSchema>();
  @type([ "number" ]) thirstZone = new ArraySchema<number>(); // [start, length]
  @type("number") treasuresOpened: number = 0;
  @type("number") witchesUsed: number = 0;
  @type("string") winnerId: string | null = null;
  @type([ EventSchema ]) eventLog = new ArraySchema<EventSchema>();
  @type("string") activeModal: string | null = null;  // 'shop', 'pills', 'rail_de_bus', etc.
  @type("string") activeModalPlayerId: string | null = null;
}
```

> Les **cases-trésor** ne sont **pas** dans le state synchronisé — elles sont stockées en privé sur le serveur et révélées à l'ouverture.

### 5.2 Messages client → serveur

| Message | Payload | Quand |
|---|---|---|
| `join` | `{ name, suit }` | Connexion au lobby |
| `start_game` | — (host only) | Lobby → partie |
| `roll_dice` | — | Tour du joueur |
| `roll_order_dice` | — | Phase rolling_order |
| `buy_item` | `{ itemType }` | Modal shop ouvert |
| `use_item` | `{ itemType, targetPlayerId? }` | À tout moment |
| `choose_pill` | `{ color: 'red' \| 'blue' }` | Modal pills ouvert |
| `rail_de_bus_answer` | `{ round, answer }` | Modal rail de bus |
| `give_potion` | `{ targetPlayerId, sips }` | Sorcière |
| `say_thanks` | — | Quand on reçoit une potion (10s timer) |
| `choose_bromance` | `{ targetPlayerId }` | Tombe sur case bromance |
| `swap_position` | `{ playerId1, playerId2 }` | Trésor 5-6 |
| `place_loaded_die` | `{ value: 1-6 }` | Avant son prochain dé |

### 5.3 Reconnection

Colyseus offre `allowReconnection(client, 60)` qui garde le joueur en place 60 secondes après une déconnexion. Pendant ce temps, son tour est skippé si vient. Au-delà, il est éjecté de la partie et son pion reste sur place mais inactif.

---

## 6. Frontend — UX et géométrie

### 6.1 Géométrie du plateau SVG

Le plateau a 3 anneaux (extérieur 1→27, intermédiaire 28→55, intérieur 56→63). Chaque case est un trapèze sur un arc.

```typescript
// lib/boardGeometry.ts
export function getCasePosition(caseIndex: number): { x: number; y: number; angle: number } {
  // Détermine l'anneau (0/1/2)
  // Calcule l'angle dans l'anneau selon l'index
  // Retourne x, y, angle pour positionner le pion
}

export function getCasePath(caseIndex: number): string {
  // Retourne un path SVG pour dessiner le trapèze de la case
}
```

### 6.2 Animation du pion

À chaque mouvement, le pion ne saute pas directement à la case finale — il anime case par case avec un délai (ex : 200ms par case). Implémenté via Framer Motion en chaînant les `animate` props ou en utilisant `motion.path` + `motionPath`.

```tsx
<motion.circle
  cx={pos.x}
  cy={pos.y}
  r={12}
  fill={player.color}
  animate={{ cx: targetPos.x, cy: targetPos.y }}
  transition={{ duration: 0.2, ease: "easeInOut" }}
/>
```

Pour les téléportations (portails), l'animation est différente : fade-out à l'entrée, fade-in à la sortie.

### 6.3 Layout mobile-first

L'app cible les écrans mobiles en priorité :
- Plateau au centre (responsive, max-width 600px)
- Bouton "Lancer le dé" sticky en bas
- Event log en panneau latéral droit (drawer sur mobile)
- Inventaire icône en haut à droite (popup)
- Joueurs listés en haut avec avatar + position

### 6.4 Modals

Les modals s'ouvrent côté serveur (`activeModal` + `activeModalPlayerId` dans le state) pour que tous les joueurs voient ce qui se passe (transparence soirée). Mais seul le joueur actif peut interagir.

| Modal | Quand | Contenu |
|---|---|---|
| Shop | Tombe sur case shop | 3 boutons d'achat avec coût en gorgées |
| Pills | Tombe sur case pilules | Choix rouge/bleu |
| Rail de bus | Tombe sur case rail de bus | Mini-jeu 4 manches |
| Bromance | Tombe sur case bromance | Sélection joueur cible |
| Witch potion | Joueur veut utiliser sa potion | Sélection joueur cible + slider gorgées |
| Treasure | Joueur sur case-trésor avec pied de biche | Bouton "Ouvrir" → animation dé |

### 6.5 Sons et feedback

- Petit son de dé qui roule (Howler.js ou audio HTML5)
- Son distinct pour boire/distribuer
- (Optionnel v2) TTS pour annoncer "Sarah doit boire 4 gorgées"
- Vibration mobile sur événement important (Navigator.vibrate)

---

## 7. Persistance et stats

### 7.1 SQLite — schéma

```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  seed TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  winner_id TEXT,
  player_count INTEGER NOT NULL
);

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_sips_taken INTEGER DEFAULT 0,
  total_sips_given INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE game_player_stats (
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  sips_taken INTEGER DEFAULT 0,
  sips_given INTEGER DEFAULT 0,
  shop_purchases INTEGER DEFAULT 0,
  dice_rolls INTEGER DEFAULT 0,
  finished_position INTEGER,
  PRIMARY KEY (game_id, player_id)
);

CREATE TABLE event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  player_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT,           -- JSON
  timestamp INTEGER NOT NULL
);
```

### 7.2 Page de stats

URL : `/stats` (lecture seule).
Affiche :
- Top 10 buveurs (total sips_taken)
- Top 10 distributeurs (total sips_given)
- Top victoires
- Dernières parties (avec replay possible via `/replay?gameId=XXX`)

Le replay rejoue les events du log, animation par animation, sans interaction.

---

## 8. Plan d'exécution

### Phase 0 — Setup (½ jour)

- Init monorepo pnpm + Biome + Vitest
- Dockerfile server (Node 20 + better-sqlite3)
- Dockerfile web (Next.js standalone)
- docker-compose.yml + Caddyfile
- README avec instructions de dev local

### Phase 1 — boardGenerator + visualisation (1 jour)

- `packages/shared/types.ts` — types CaseType, Board, etc.
- `apps/server/src/logic/boardGenerator.ts` — algorithme de génération avec contraintes
- Tests Vitest sur 100 seeds : vérifier que toutes les contraintes sont respectées
- Page Next.js `/preview?seed=XXX` qui dessine le plateau SVG généré
- **Validation visuelle** par toi : tu navigues, tu valides ou tu demandes des ajustements

### Phase 2 — Lobby + connexion (1 jour)

- Schémas Colyseus de base (GameState, Player)
- `GameRoom.ts` avec onJoin/onLeave/onMessage('start_game')
- Page Next.js `/` avec création de partie (génère un code 4 lettres)
- Page `/lobby/[code]` : liste joueurs, choix pseudo + signe + couleur, bouton démarrer (host only)
- QR code pour partager la partie

### Phase 3 — Tour de jeu et plateau live (2 jours)

- Phase rolling_order : tous lancent le dé, ordre établi
- Page `/game/[code]` : plateau SVG avec tous les pions placés
- Bouton "Lancer le dé" pour le joueur actif (animation 3D simple)
- Animation pion case par case (Framer Motion)
- Application des effets simples : cases-chiffres (avec zone soif), Formule 1, Usain Bolt, Vacances, victoire 63 + rebond
- Event log live à droite

### Phase 4 — Cases complexes (3 jours)

Découpé en sous-tâches indépendantes :
1. Inventaire + Shop (modal achat)
2. Prison (relance d'évasion, clé)
3. Trou (mécanique de blocage progressif)
4. Trésor (tirage initial caché, pied de biche, dé d'effet)
5. Pilules (modal choix)
6. Sorcière + potion (UI offrir + dire merci)
7. Bromance (lien réciproque)
8. Cartes ♠♥♦♣ (matching)
9. Tunnel/Portails (téléportation)
10. Rail de bus (mini-jeu 4 manches)

### Phase 5 — Persistance + stats (1 jour)

- SQLite init + migration
- Hooks Colyseus pour log events à la fin de chaque tour
- Page `/stats` simple
- (Optionnel) replay `/replay/[gameId]`

### Phase 6 — Polish + déploiement (1 jour)

- Sons, animations finales
- Reconnection auto et UX dégradée
- Test multi-device sur ton VPS
- Caddyfile prod
- Monitoring simple (logs Docker)

**Total estimé : ~9-10 jours de travail effectif**, étalable sur 3-4 semaines selon ton rythme.

---

## 9. Caddyfile et docker-compose

### 9.1 docker-compose.yml

```yaml
services:
  web:
    build: ./apps/web
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_COLYSEUS_URL=wss://jeu.tondomaine.fr/colyseus
    networks:
      - app

  server:
    build: ./apps/server
    restart: unless-stopped
    environment:
      - PORT=2567
    volumes:
      - ./data:/app/data    # SQLite persistance
    networks:
      - app

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - app

networks:
  app:

volumes:
  caddy_data:
  caddy_config:
```

### 9.2 Caddyfile

```caddy
jeu.tondomaine.fr {
  encode gzip zstd

  # WebSocket Colyseus + matchmaking HTTP
  handle_path /colyseus/* {
    reverse_proxy server:2567
  }

  # Frontend Next.js
  handle {
    reverse_proxy web:3000
  }

  # Évite les disconnects WS lors d'un reload Caddy
  servers {
    stream_close_delay 5m
  }
}
```

---

## 10. Points en suspens à clarifier

| # | Sujet | Hypothèse retenue | Décision finale |
|---|---|---|---|
| 1 | Effet exact de "pt malus ×6" du shop | Inflige un malus à un autre joueur (ex: 6 gorgées sans pouvoir refuser) | À confirmer |
| 2 | Cartes ♠♥♦♣ : nb gorgées exact | 3 gorgées | À confirmer |
| 3 | Portails : déclenchement en passant ou seulement en s'arrêtant ? | Seulement en s'arrêtant | À confirmer |
| 4 | Sorcière : nombre de gorgées sur la potion | Choix du donneur (slider 1-10) | À confirmer |
| 5 | Pilule bleu 5-6 "double tes prochaines gorgées" : durée exacte | One-shot, consommé à la prochaine fois où le joueur boit | À confirmer |
| 6 | Bromance : que se passe-t-il si A bromance avec B, puis B bromance avec C ? Le lien A-B est-il rompu ? | Oui, B-A est écrasé, mais A reste seul (peut être re-bromancé plus tard) | À confirmer |
| 7 | Que faire si un joueur quitte définitivement en cours de partie (timeout reconnect) ? | Son pion reste sur place mais inactif. Tour skippé. | À confirmer |
| 8 | Couleurs des pions : choix libre ou imposées ? | Palette de 10 couleurs, premier arrivé premier servi | À confirmer |

---

## 11. Critères de validation MVP

Le MVP est considéré "done" quand :
- ✅ 4 personnes peuvent jouer en simultané sur 4 devices différents sans bug bloquant
- ✅ Toutes les cases spéciales appliquent leur effet correctement
- ✅ La partie se termine avec un gagnant et un récap des stats
- ✅ Si quelqu'un rafraîchit son onglet, il revient dans la partie sans perdre sa place
- ✅ Le plateau est lisible sur écran mobile en mode portrait
- ✅ Une partie de 5 joueurs dure 15-30 minutes en moyenne (équilibrage)
- ✅ Hébergé sur jeu.tondomaine.fr derrière Caddy avec HTTPS

---

## 12. Annexe — Liens et ressources

- Colyseus docs : https://docs.colyseus.io
- Colyseus deployment guide : https://docs.colyseus.io/deployment
- Framer Motion : https://www.framer.com/motion/
- Bridson Poisson disk algorithm : https://www.jasondavies.com/poisson-disc/
- shadcn/ui : https://ui.shadcn.com
- Caddy reverse proxy : https://caddyserver.com/docs/caddyfile/directives/reverse_proxy

---

*Fin du document de spec — prêt pour implémentation.*
