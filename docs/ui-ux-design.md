# UI/UX Design — Jeu de l'Oie Soirée

> Recherches et décisions design pour l'implémentation
> **Date** : 8 mai 2026

---

## 1. Inspiration et benchmarks

### Le modèle Jackbox (référence absolue)

Jackbox Party Pack est la **référence canonique** pour ton type de jeu. C'est exactement le pattern que tu construis : multi-device, écran partagé optionnel, pas d'app à installer, jeu de soirée social.

Le différenciateur immédiat de Jackbox vs les autres jeux est le format : les joueurs se rassemblent autour d'un écran principal, et chacun utilise son propre smartphone comme manette. Ils saisissent un code de room partagé sur une page web et sont immédiatement connectés. Pas d'app à télécharger, pas de manettes nécessaires.

### Les "Jack Principles" (à appliquer)

Les designers Jackbox suivent un document de référence "Jack Principles" écrit par Harry Gottlieb, fondateur de l'entreprise. Le secret est la création d'une **"Interactive Conversation Interface"** — l'idée que les designers doivent générer le sentiment qu'il y a un vrai animateur qui parle aux joueurs et les guide. Trois principes guident le design :

**1. Maintenir le rythme** — Limiter les choix de l'utilisateur, lui donner une seule tâche à la fois, s'assurer qu'il sait toujours quoi faire ensuite, lui faire savoir que le programme l'attend, rendre ses inputs aussi efficaces que possible.

**2. Créer un sentiment de présence** — Donner l'impression qu'il y a quelqu'un qui guide la partie, du caractère, de la personnalité.

**3. Respecter le langage TV** — Les jeux Jackbox empruntent au langage TV : timing narratif, transitions, dialogue. Les utilisateurs qui n'ont jamais joué à un jeu vidéo mais ont grandi avec la TV peuvent comprendre instantanément.

> **Application directe à ton jeu** : 
> - Toujours afficher "C'est à toi de jouer" / "En attente de Sarah..." de manière proéminente
> - Une seule action principale visible à la fois (gros bouton "Lancer le dé")
> - Le ton de l'event log doit être théâtral ("🎲 Sarah lance le dé... un 4 ! Elle avance jusqu'à la case 12 et... 💀 PRISON ! Elle est coffrée !")
> - Animations qui prennent le temps de respirer (pas trop rapides)

### Autres benchmarks utiles

- **Game UI Database** (gameuidatabase.com) — 55 000+ screenshots de jeux par catégorie, super utile pour s'inspirer
- **Mobbin** — patterns d'UI mobile classés
- **Among Us** — bel exemple de pion + couleur + nom dans un jeu social mobile
- **Drawful / Quiplash** — handling de modals et inputs sur mobile

---

## 2. Architecture d'écran : 2 modes possibles

### Mode A — "Tout sur le mobile" (recommandé pour MVP)

Chaque joueur a tout sur son téléphone : plateau, son pion, dé, log. C'est le plus simple à implémenter et ne nécessite pas d'écran partagé.

### Mode B — "Spectator screen" optionnel (post-MVP)

URL `/spectate/[code]` qu'on ouvre sur une TV/laptop : grand plateau, son d'ambiance, animations spectaculaires, pas d'inputs. Les téléphones restent les controllers.

**Décision** : on commence Mode A pour le MVP. Le mode B se rajoute facilement plus tard car le plateau sera déjà responsive.

---

## 3. Layout mobile (l'écran principal de jeu)

Voici le layout type pour iPhone 14 (390×844 pts) — le plus contraignant :

```
┌─────────────────────────────────────┐
│ [☰]  JEU SOIRÉE       [🎒3]  [📊]   │  ← Header 56px (navbar fixe)
├─────────────────────────────────────┤
│                                     │
│   ┌──────────────────────┐          │
│   │  [P1] [P2] [P3]...   │  ← 80px  │  Joueurs (avatar+couleur+pos)
│   └──────────────────────┘          │
│                                     │
│   ┌─────────────────────────┐       │
│   │                         │       │
│   │                         │       │
│   │     PLATEAU SVG         │  ← grosse zone variable
│   │     (carré, ~390×390)   │       │
│   │                         │       │
│   │                         │       │
│   └─────────────────────────┘       │
│                                     │
│   ┌─────────────────────────┐       │
│   │ 🎲 Sarah lance le dé... │  ← 60px Event log (1 ligne)
│   │ Elle fait 4              │       │
│   └─────────────────────────┘       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│      [   LANCER LE DÉ   ]           │  ← CTA fixe 88px bottom
│                                     │
└─────────────────────────────────────┘
```

### Les zones expliquées

**Header (top)** : navbar minimaliste. Bouton menu (settings, quit), titre, compteur d'inventaire (avec badge), bouton stats (drawer side).

**Players bar** : carrousel horizontal scrollable avec chip par joueur : avatar emoji + couleur de pion + nom court + position actuelle (ex: "🦊 Thibaud — case 23"). Le joueur actif est highlighté avec un anneau pulsant. Tu peux tap sur un joueur pour voir son détail (inventaire visible? non, mais effets actifs visibles).

**Plateau SVG** : centré, carré, max-width = largeur écran moins padding 16px. Le pion du joueur courant a un anneau pulsant pour le retrouver vite.

**Event log** : sticky band en bas du plateau, 1-2 lignes max, animation de scroll quand un nouvel event arrive. Tap pour ouvrir l'historique complet en drawer.

**CTA (bottom)** : bouton sticky "Lancer le dé" pendant ton tour. Quand c'est pas ton tour : devient un texte "En attente de Sarah..." avec un mini-spinner.

### Pourquoi cette architecture

- **Thumb zone** : le bouton principal est en bas (zone naturelle du pouce). Les boutons secondaires (menu, inventaire) sont en haut, accessibles par déplacement du pouce.
- **Hiérarchie de l'information** : le plateau est la star (60% de l'écran). Players + log + CTA encadrent.
- **Pas de scroll vertical** : tout tient sur un écran. Si le plateau ne rentre pas, on zoome dynamiquement.

---

## 4. Le plateau SVG : choix techniques

### Pourquoi SVG (et pas Canvas)

Avec **SVG** : chaque case est un élément du DOM, addressable par index, accessible (lecteur d'écran), CSS transitions natives, click/tap events sans calcul de coordonnées, debug trivial. Performance largement suffisante pour 63 cases statiques.

Avec **Canvas/Konva** : il aurait fallu reimplémenter le picking de case par calcul, gérer l'invalidation de rendu, perdre l'accessibilité.

### Géométrie du plateau (3 anneaux concentriques)

```typescript
// Constantes du plateau
const BOARD_RADIUS = 200;       // rayon viewBox
const RING_OUTER = { inner: 130, outer: 195 };   // anneau cases 1-27
const RING_MIDDLE = { inner: 90, outer: 130 };   // anneau cases 28-55
const RING_INNER = { inner: 55, outer: 90 };     // anneau cases 56-63
const ARRIVEE_RADIUS = 50;       // case 63 au centre

interface CaseGeometry {
  index: number;
  ringName: 'outer' | 'middle' | 'inner';
  startAngle: number;  // en radians
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  centerX: number;     // pour positionner le pion
  centerY: number;
}

function getBoardGeometry(): CaseGeometry[] {
  // 27 cases anneau extérieur, chacune fait 2π/27 rad
  // 28 cases anneau moyen, chacune fait 2π/28 rad
  // 8 cases anneau intérieur, chacune fait 2π/8 rad
  // ...
}
```

### Rendu d'une case

Chaque case est un `<path>` SVG en arc de cercle (forme trapézoïdale entre deux rayons et deux angles). Le contenu (numéro, icône) est centré dedans. La couleur de fond dépend du type de case.

```tsx
<g
  className="case"
  data-case-index={i}
  onClick={() => handleCaseClick(i)}
>
  <path
    d={arcPath(geom)}
    fill={caseColors[caseType]}
    stroke="#000"
    strokeWidth={1}
  />
  <text
    x={geom.centerX}
    y={geom.centerY}
    textAnchor="middle"
    fontSize={12}
  >
    {caseLabel}
  </text>
  {caseIcon && (
    <image
      href={caseIcon}
      x={geom.centerX - 12}
      y={geom.centerY - 12}
      width={24}
      height={24}
    />
  )}
</g>
```

### Code-couleur des cases (palette daltonisme-friendly)

| Type | Background | Texte | Notes |
|---|---|---|---|
| Neutre | `#F5F5F5` | `#1A1A1A` | Très sobre |
| Chiffre vert | `#06A77D` | `#FFF` | Vert sapin (pas pomme) |
| Chiffre rouge | `#E63946` | `#FFF` | Rouge corail |
| Chiffre rouge dans zone soif | `#E63946` + bordure 🔥 animée | `#FFF` | Indicateur visuel zone |
| Shop | `#F4A261` | `#1A1A1A` | Orange chaud + 🛒 |
| Prison | `#6F4E37` | `#FFF` | Marron café + 🔒 |
| Trou | `#2B2D42` | `#FFF` | Anthracite + 🕳️ |
| Vacances | `#00B4D8` | `#1A1A1A` | Cyan + 🌴 |
| Sorcière | `#7209B7` | `#FFF` | Violet profond + 🧙 |
| Bromance | `#FF006E` | `#FFF` | Rose néon + 💪 |
| Pilules | `#FB5607` | `#FFF` | Orange vif + 💊 |
| Rail de bus | `#1D3557` | `#FFF` | Bleu marine + 🎴 |
| Tunnel/Portail | `#4361EE` glow | `#FFF` | Effet glow + 🌀 |
| Carte ♠ | Noir | `#FFF` | + ♠ |
| Carte ♥ | `#E63946` | `#FFF` | + ♥ |
| Carte ♦ | `#E63946` | `#FFF` | + ♦ |
| Carte ♣ | Noir | `#FFF` | + ♣ |
| Formule 1 | `#FB5607` | `#FFF` | + 🏎️ |
| Usain Bolt | `#FFD60A` | `#1A1A1A` | + ⚡ |

> **Principe** : on n'utilise jamais la couleur seule pour communiquer. Toujours couleur + icône + (optionnel) texte.

### Zone de la soif : visualisation

Bandes rougeâtres sur les cases concernées avec un effet "flammes" subtil (CSS animation). Tooltip au tap : "Route de la soif — sur les chiffres rouges, tu bois !"

---

## 5. L'animation du pion (la plus critique)

### Principes

L'animation du pion est le **moment dramatique** de chaque tour. Elle doit être :
- **Lente** : 250-350ms par case parcourue (pas d'instant teleport)
- **Suspense-inducing** : effet de "cliquetis" à chaque case traversée
- **Non bloquante** : les autres joueurs voient l'anim en temps réel
- **Couplée au son** : petit "tac" à chaque case

### Implementation avec Motion (ex Framer Motion)

> Note importante : Framer Motion est devenu "Motion" en 2025 quand il est devenu un projet indépendant. Le package est passé de framer-motion à motion sur npm, et le path d'import est maintenant motion/react. Le composant et les hooks API sont identiques.

```tsx
import { motion, useAnimate } from "motion/react";

function Pawn({ player, board }) {
  const [scope, animate] = useAnimate();
  
  useEffect(() => {
    if (player.isMoving) {
      animateAlongPath(player.previousPosition, player.position);
    }
  }, [player.position]);
  
  async function animateAlongPath(from: number, to: number) {
    const path = computePath(from, to); // ex: [12, 13, 14, 15, 16]
    
    for (const caseIndex of path) {
      const { centerX, centerY } = getBoardGeometry()[caseIndex];
      await animate(
        scope.current,
        { cx: centerX, cy: centerY },
        { 
          duration: 0.25, 
          ease: "easeInOut",
          type: "spring",
          stiffness: 300,
          damping: 25,
        }
      );
      playSound('tac.mp3', 0.3);
    }
  }
  
  return (
    <motion.circle
      ref={scope}
      r={14}
      fill={player.color}
      stroke="white"
      strokeWidth={2}
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
    />
  );
}
```

### Spring physics pour l'effet "vivant"

Les animations basées sur la physique des ressorts paraissent naturelles. Motion simule la physique des ressorts par défaut pour les valeurs physiques (x, y) et pour la mise à l'échelle ou la rotation.

Configuration recommandée pour un pion :
- `stiffness: 300` (rigide, mouvement rapide)
- `damping: 25` (peu d'oscillation, on s'arrête net)
- `mass: 1` (default)

### Cas spéciaux

**Téléportation portail** : le pion fade-out à l'entrée, fade-in à la sortie avec un effet de scale ⚡

**Recul (rebond 63)** : le pion atteint 63 puis recule du surplus avec une animation différente (couleur différente, son différent).

**Échange position (trésor 5-6)** : les 2 pions s'échangent simultanément avec une trajectoire courbe.

**Multiple joueurs même case** : on offset les pions en mini-cluster (orbite autour du centre de la case) pour les rendre tous visibles.

---

## 6. Le dé : composant central

### Choix d'implémentation : 3 options

**Option A — CSS 3D Transform (le plus simple)**
- Cube CSS avec 6 faces, animation `rotateX/Y` en boucle.
- Léger (< 5kb), pas de dépendance.
- Limitation : pas de physique réaliste, pas de "shake" du téléphone.

**Option B — Library `@3d-dice/dice-box`**
- @3d-dice/dice-box est un module 3D dice roller haute performance fait avec BabylonJS, AmmoJS et implémenté avec web workers et offscreenCanvas.
- Très joli rendu 3D, physique réaliste.
- Lourd (~200kb), peut être overkill pour un MVP.

**Option C — `roll-a-die` (CSS animation)**
- Animation CSS3 simple, callback avec valeur.
- Compromis sympa entre simplicité et rendu.

### Recommandation : **Option A pour MVP, Option B en post-MVP polish**

Pour le MVP : un cube CSS 3D tout simple, animation 1.5s avec rotation random, atterrissage sur la face correspondant à la valeur déterminée par le serveur. Le serveur a déjà décidé du résultat — l'animation est cosmétique.

```tsx
function Dice({ value, isRolling }) {
  return (
    <div className={`dice-scene ${isRolling ? 'rolling' : ''}`}>
      <div className={`dice-cube show-face-${value}`}>
        <div className="face face-1">⚀</div>
        <div className="face face-2">⚁</div>
        <div className="face face-3">⚂</div>
        <div className="face face-4">⚃</div>
        <div className="face face-5">⚄</div>
        <div className="face face-6">⚅</div>
      </div>
    </div>
  );
}
```

```css
.dice-scene { perspective: 600px; width: 80px; height: 80px; }
.dice-cube { 
  position: relative; width: 100%; height: 100%; 
  transform-style: preserve-3d; 
  transition: transform 1.5s cubic-bezier(0.5, 1.5, 0.5, 1);
}
.dice-cube.rolling { animation: roll 1.5s ease-in-out; }
@keyframes roll {
  0% { transform: rotate3d(1, 1, 1, 0deg); }
  100% { transform: rotate3d(1, 1, 1, 1080deg); } /* 3 rotations */
}
.face { position: absolute; width: 80px; height: 80px; ... }
```

### Haptic feedback (mobile)

Les browsers modernes supportent `Navigator.vibrate()`. Pattern recommandé :
- **Pendant le roll** : `navigator.vibrate([100, 50, 100, 50, 100])` (cliquetis)
- **À l'arrivée** : `navigator.vibrate(200)` (un long buzz pour ponctuer)
- **Sur événement majeur (prison, victoire)** : `navigator.vibrate([200, 100, 200, 100, 400])`

### Sons

Pack minimal de sons à intégrer :
- `dice-shake.mp3` — pendant l'animation du dé
- `dice-land.mp3` — atterrissage
- `pawn-step.mp3` — chaque case parcourue
- `notify.mp3` — événements (boire, distribuer)
- `victory.mp3` — fin de partie
- `error.mp3` — action invalide

Library : `Howler.js` (3kb gzipped, gère le préchargement et les fallbacks).

---

## 7. Le système de modals

### Anatomie d'un modal

Tous les modals partagent la même structure :

```tsx
<Modal>
  <ModalHeader>
    <Icon /> {/* ex: 🛒 */}
    <Title>Bienvenue au Shop !</Title>
    <Subtitle>Sarah, qu'est-ce qui te tente ?</Subtitle>
  </ModalHeader>
  
  <ModalContent>
    {/* contenu spécifique */}
  </ModalContent>
  
  <ModalFooter>
    <Button variant="secondary" onClick={skip}>Passer</Button>
    {/* ou pas de skip selon le modal */}
  </ModalFooter>
</Modal>
```

### Important : modals visibles par tous

Quand Sarah est dans un modal Shop, **tous les autres joueurs voient** :
- Une version read-only du modal (animation slide-in subtile)
- Texte "Sarah est au shop..."
- Quand Sarah achète, ils voient l'animation et le résultat

C'est ce qui crée le sentiment de communauté + transparence (essentiel en soirée pour éviter "tu triches !").

### Modals spécifiques

**Modal Shop**
- 3 cards d'achat (Clé, Pied de biche, Pt malus) avec coût en gorgées affiché bien gros
- Animation : zoom-in subtle quand on tap une card
- Confirmation explicite : "Tu vas boire 5 gorgées. Confirme ?"
- Bouton "Passer"

**Modal Pilules**
- 2 grosses cards : 💊 ROUGE et 💊 BLEUE
- Sub-text : "Rouge = 6 gorgées sûres / Bleu = à toi de tester ta chance"
- Pas de skip — il faut choisir.

**Modal Rail de bus**
- Mini-jeu en 4 étapes successives.
- Étape 1 : 2 boutons "Rouge ❤️♦️" / "Noir ♠️♣️". Animation de carte qui se révèle.
- Étape 2 : Carte précédente affichée. 2 boutons "Plus haut ⬆️" / "Plus bas ⬇️".
- Étape 3 : 2 cartes affichées. 2 boutons "Inter" / "Exter".
- Étape 4 : 4 boutons (les signes). Suspense final.
- Affichage du compteur "X gorgées en jeu" qui augmente.
- Bouton "Stop" disponible à chaque étape pour s'arrêter et boire ce qui est en jeu.

**Modal Bromance**
- Liste des autres joueurs en cards.
- Tap sur un joueur → animation "💕 lien créé" + petit feu d'artifice.

**Modal Sorcière (offrir potion)**
- Liste des autres joueurs.
- Slider configurable au lobby (ou fixe à 5).
- Bouton "Empoisonner" (avec emoji 🧪).
- Côté receveur : modal qui pop "Sarah te donne une potion ! 5 gorgées. Tu as 10s pour dire merci..." + countdown + gros bouton "MERCI 🙏".

**Modal Trésor**
- Animation d'un coffre qui s'ouvre quand on a un pied de biche.
- Sinon : "Tu n'as pas de pied de biche, le coffre reste fermé."
- Lance dé d'effet avec animation.

### Animations modal

```tsx
<motion.div
  initial={{ opacity: 0, y: 20, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 20, scale: 0.95 }}
  transition={{ type: "spring", stiffness: 300, damping: 25 }}
>
  {/* modal content */}
</motion.div>
```

---

## 8. L'event log : le narrateur du jeu

### Pourquoi c'est critique

L'event log est l'équivalent du "host" Jackbox — c'est lui qui raconte l'histoire de la partie. C'est aussi ce qui permet aux joueurs distraits/saouls de rattraper ce qui s'est passé.

### Structure d'un event

```typescript
interface GameEvent {
  id: string;
  timestamp: number;
  playerId?: string;
  type: 'dice_roll' | 'move' | 'effect' | 'shop' | 'drink' | 'victory' | ...;
  text: string;          // texte stylé déjà formé côté serveur
  emoji?: string;
  importance: 'low' | 'normal' | 'high' | 'epic';
}
```

### Niveaux de mise en avant

- **low** : 1 ligne, gris, opacity 0.7. Ex : "Sarah passe son tour."
- **normal** : 1-2 lignes, noir. Ex : "🎲 Thibaud lance le dé : 4 !"
- **high** : Card avec emoji proéminent, animation slide-in. Ex : "🔒 Marc tombe en PRISON !"
- **epic** : Plein écran momentané avec effet (confettis, screen shake léger). Ex : "🏆 SARAH GAGNE LA PARTIE !!"

### Style et ton

Le ton doit être **théâtral, fun, irrévérencieux** (cohérent avec un jeu de soirée). Quelques exemples :

- "🎲 Sarah lance le dé... 4 ! Et la voici qui avance gaillardement." 
- "💀 OH NON ! Thibaud fonce direct sur la PRISON. Quelle malchance !"
- "🌀 Marc plonge dans le portail bleu et ressort à l'autre bout du plateau. Magique."
- "💪 Sarah et Thibaud sont maintenant BROMANCE. Quand l'un boit, l'autre boit. C'est beau l'amitié."
- "🍻 Marc distribue 3 gorgées. Qui sera l'heureux élu ?"

### Présentation visuelle

Sticky band en bas du plateau qui montre les 1-2 derniers events. Tap pour ouvrir un drawer plein écran avec l'historique complet (scrollable).

### Auto-scroll & sons

À chaque nouvel event, un son discret + petit highlight rouge qui fade. Les events epic font vibrer le téléphone et jouent un son distinct.

---

## 9. Le lobby (l'écran de pré-game)

### Importance

Le lobby est le **premier contact** avec le jeu. Il doit être :
- Rapide à comprendre (5 secondes)
- Engageant (donner envie de démarrer)
- Préparatoire (donner aux joueurs le sentiment qu'ils s'apprêtent à vivre quelque chose)

### Layout proposé

```
┌─────────────────────────────────────┐
│  JEU SOIRÉE              [☰]        │
├─────────────────────────────────────┤
│                                     │
│  Code de la partie :                │
│   ┌──────────────────┐              │
│   │   THIB-4F2K      │   [📋 Copier]│
│   └──────────────────┘              │
│   ┌────┐                            │
│   │ QR │  Scanne pour rejoindre     │
│   │code│                            │
│   └────┘                            │
│                                     │
│  Joueurs (3/10) :                   │
│  🦊 Thibaud  🟦 ♠     [HOST]        │
│  🐧 Sarah    🟪 ♥                   │
│  🐯 Marc     🟧 ♦                   │
│  +                                  │
│                                     │
│  Aperçu du plateau :                │
│  [petit aperçu du plateau généré]   │
│  Seed: THIB-4F2K  [🎲 Régénérer]    │
│                                     │
│  Configuration :                    │
│  Cartes ♠♥♦♣ : [3] gorgées          │
│  Potion sorcière : [5] gorgées      │
│  ...                                │
│                                     │
│  [   DÉMARRER (host)   ]            │
└─────────────────────────────────────┘
```

### Détails

- **Code partagé** : 4 lettres + 4 caractères (ex `THIB-4F2K`). Copiable en 1 tap. QR code généré dynamiquement.
- **Liste des joueurs** : visible en temps réel, mise à jour live. Chaque entrée : avatar emoji + nom + couleur + signe choisi.
- **Choix de signe ♠♥♦♣** : modal au join, choix grisé si déjà pris.
- **Aperçu plateau** : SVG non-interactif, juste pour donner un avant-goût. Bouton "Régénérer" génère un nouveau seed et re-render.
- **Configuration sliders** (host only) : ajuste les valeurs avant de démarrer.
- **Bouton Démarrer** : actif seulement si ≥2 joueurs et host clique.

### Onboarding zero-friction

Première fois sur le site :
1. URL → choix "Créer une partie" / "Rejoindre"
2. Si créer : pseudo + signe + couleur + avatar emoji → host de la nouvelle partie
3. Si rejoindre : code → pseudo + signe + couleur + avatar emoji → joueur de la partie
4. Pas de compte, pas de mot de passe, pas d'email. Le LocalStorage retient le pseudo/avatar pour la prochaine fois.

---

## 10. Les états de connexion (UX dégradée gracieuse)

Comme défini dans la section 10 résolutions, 3 niveaux :

**Niveau 1 — Reconnecting (0-30s)**
- Toast bandeau orange en haut : "Marc se reconnecte..."
- Pion grisé (opacity 0.4)
- Si c'est le tour du joueur déco : countdown visible, partie en pause

**Niveau 2 — AFK (30s-3min)**
- Toast rouge : "Marc est AFK. Tour skippé."
- Pion barré d'une croix légère
- Auto-skip de son tour

**Niveau 3 — Abandon (>3min)**
- Pion retiré du plateau avec animation fade-out
- Notification : "Marc a quitté la partie."

**Vote kick** : à partir d'1min, bouton "Voter le kick de Marc" disponible aux autres joueurs. Si majorité → kick immédiat.

**Mode pause** : si tous les joueurs sauf 1 sont déconnectés → écran "En attente de joueurs..." avec timer de 5min. Au bout, partie sauvegardée et terminée.

---

## 11. Détails de finition

### Animations à NE PAS oublier

- **Page transitions** : fade entre lobby/game/end
- **Loading state** au démarrage : skeleton du plateau, pas un spinner
- **Tour transition** : flash subtil de la couleur du joueur actif
- **Hover/tap states** : tous les boutons ont un état pressed (scale 0.95)
- **Empty states** : message friendly si 1 seul joueur dans le lobby

### Sons ambient

Petite musique de fond optionnelle (vinyle léger jazz/lo-fi). Bouton mute en permanence accessible. Volume bas par défaut.

### Performance

- Le plateau SVG ne se re-render que sur changement d'état : utiliser `React.memo` sur les composants Case
- Précharger les sons au lobby
- Lazy-load les modals (charger leur code seulement quand nécessaire)

### Accessibilité

- **Focus visible** sur tous les boutons (outline 2px)
- **Contraste WCAG AA minimum** (toutes les combos couleur/texte vérifiées)
- **`useReducedMotion`** : si l'OS a "Réduire les animations", on désactive les anims du pion et du dé. Motion exposes le hook `useReducedMotion` pour cela.
- **Texte alt** sur toutes les images/icônes
- **Tab order** logique sur le plateau (case 1 → 2 → 3...)

### Mode sombre

À implémenter dès le départ (toggle dans le header). Tailwind v4 supporte ça nativement avec la directive `@variant`. Palette dark : fond `#0F1419`, surfaces `#1A1F2E`, accent unchanged.

### Internationalisation

Pour le MVP : tout en français. Mais structurer le code avec des clés (`t('lobby.title')`) pour faciliter une trad anglaise post-MVP (i18next). Sarah étant américaine, ça pourrait t'être utile rapidement 😉.

---

## 12. Fin de partie : l'écran de victoire

### Importance

C'est le moment qui boucle l'expérience. Il doit être **célébratoire et social** (capture d'écran, partage).

### Layout

```
┌─────────────────────────────────────┐
│                                     │
│     🎉 VICTOIRE ! 🎉                │
│                                     │
│      [Avatar Sarah XXL]             │
│                                     │
│      Sarah a gagné !                │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━            │
│                                     │
│  Stats de la partie :               │
│  🍻 Gorgées bues le plus : Marc (47)│
│  🤝 Gorgées distribuées : Thib (32) │
│  🛒 Achats au shop : Sarah (3)      │
│  🎲 Lancers les plus chanceux : Marc│
│  🔒 Le plus puni en prison : Thib   │
│                                     │
│  Durée : 23 min                     │
│  Tours joués : 47                   │
│                                     │
│  [📷 Partager]  [🔄 Nouvelle partie]│
│                                     │
└─────────────────────────────────────┘
```

### Éléments

- **Confettis** : animation plein écran (lib `canvas-confetti`, 3kb)
- **Trophées humoristiques** : "Le plus saoul", "Le plus pingre", "Le bromance break-up", etc.
- **Partage** : bouton qui génère une image récap avec les stats (via Canvas → toBlob → `navigator.share()`)
- **Replay** : bouton qui relance la partie avec le même seed et les mêmes joueurs

---

## 13. Recap : checklist d'implémentation Phase 2 UI

Tous ces éléments sont à intégrer dans la Phase 2 (Lobby + connexion) et Phase 3 (Tour de jeu) du plan principal :

- [ ] Setup Tailwind v4 + design tokens (couleurs, espacements, typo)
- [ ] Setup Motion (`motion/react`) + Howler.js + canvas-confetti
- [ ] Composant `<Board />` SVG avec géométrie 3 anneaux
- [ ] Composant `<Case />` mémoïsé par index
- [ ] Composant `<Pawn />` avec animation case-par-case
- [ ] Composant `<Dice />` CSS 3D
- [ ] Composant `<EventLog />` avec niveaux d'importance
- [ ] Composant `<PlayersBar />` avec carrousel horizontal
- [ ] Composant `<Modal />` générique + variantes (Shop, Pills, RailDeBus, etc.)
- [ ] Page `/lobby/[code]` avec QR code et config
- [ ] Page `/game/[code]` avec layout principal
- [ ] Page `/end/[gameId]` avec stats et confettis
- [ ] Hooks `useColyseusRoom`, `useGameState`, `useReducedMotion`
- [ ] Sons préchargés + Vibration API
- [ ] Mode sombre (toggle header)
- [ ] Tests d'accessibilité (axe DevTools)

---

## Annexe — Stack UI finale recommandée

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "motion": "^12",         // ex framer-motion
    "tailwindcss": "^4",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-tooltip": "latest",
    "@radix-ui/react-toast": "latest",
    "howler": "^2.2",
    "canvas-confetti": "^1.9",
    "qrcode.react": "^4",
    "zustand": "^5",
    "lucide-react": "latest",
    "clsx": "latest",
    "class-variance-authority": "latest"
  }
}
```

shadcn/ui en prime pour les primitives Modal/Toast/Dropdown si on veut éviter de tout coder à la main. Tout cela fait moins de 200kb gzipped au total — très raisonnable pour une PWA.

---

*Document UI/UX prêt. Le design est cohérent, mobile-first, accessible, et calqué sur les meilleures pratiques de jeux multijoueurs sociaux modernes (Jackbox en référence absolue).*
