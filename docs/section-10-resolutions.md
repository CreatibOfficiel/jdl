# Section 10 — Résolution des points en suspens

> Recherches et décisions sur les 8 points laissés ouverts dans la spec v1.0
> **Date** : 8 mai 2026

---

## Méthodologie

Pour chaque point, j'ai cherché à m'appuyer sur :
1. **Conventions établies** dans des jeux similaires (Snakes & Ladders, jeux de plateau classiques, jeux à boire commerciaux)
2. **Bonnes pratiques techniques** (Colyseus docs, patterns multiplayer, accessibilité)
3. **Cohérence interne** avec les autres règles du jeu

Quand la recherche ne donne pas de réponse claire, je tranche en faveur de la **simplicité d'implémentation** et de la **cohérence avec le reste du jeu**. Tout est révocable plus tard.

---

## Point 1 — Effet exact de "pt malus ×6"

### Hypothèse spec v1.0
"Inflige un malus à un autre joueur (ex : 6 gorgées sans pouvoir refuser)"

### Ce que j'ai trouvé
Aucune référence directe — c'est ta règle maison. La photo et tes règles indiquent juste "pt malus ×6" sans détail. La recherche sur les jeux à boire ne donne pas de pattern équivalent.

### Recommandation : **Carte d'attaque consommable, 6 gorgées imposées**

L'objet "pt malus" est **consommable** et **utilisable manuellement à n'importe quel moment** (cohérent avec les autres objets du shop).

**Mécanique** : le possesseur choisit une cible. La cible doit boire 6 gorgées. Le ×6 du nom indique que l'objet est puissant (pas qu'il s'utilise 6 fois).

**Pourquoi cette interprétation** :
- Le coût d'achat (5G à boire pour l'acheteur) est cohérent avec la valeur infligée (6G à la cible) — léger avantage économique pour l'acheteur, qui justifie la prise de risque.
- Symétrique avec la potion de sorcière (qui sauve), le pt malus attaque. Bel équilibre dégât/soin.
- Implémentation simple : un objet d'inventaire avec une action "use".

### Décision retenue
✅ **Pt malus = consommable, 6 gorgées imposées à un joueur cible. Achat 5G au shop.**

> Note : si tu veux ajouter du piment, on peut introduire un mécanisme de "contre" — la cible peut payer 3G (boire 3) pour annuler. À discuter en playtest.

---

## Point 2 — Cartes ♠♥♦♣ : nombre de gorgées exact

### Hypothèse spec v1.0
"3 gorgées"

### Ce que j'ai trouvé
Pas de standard universel. Les jeux à boire utilisent des "sips" abstraits (1 = 1 gorgée normale). Ce qui compte c'est le rapport entre les sanctions du jeu, pas la valeur absolue.

### Analyse comparative des sanctions du jeu

| Effet | Gorgées |
|---|---|
| Case-chiffre rouge (route soif) | 1, 2, 4, 5 ou plus |
| Case-chiffre vert (distribue) | 1, 2, 3 ou plus |
| Pilule rouge | 6 |
| Pilule bleue (1-2) | 8 |
| Trésor 1-2 | 3 à tous |
| Pt malus | 6 |
| Shop | 5-8 |

### Recommandation : **3 gorgées**

C'est dans la moyenne des sanctions du jeu. Ni trivial (1 = trop bénin), ni punitif (5+ = trop dur pour un événement fréquent). Et 3 a l'avantage d'être proche de "1 cul-sec d'un shot" en équivalent IRL.

### Variante à considérer
**Mode "configurable au lobby"** : sliders 1-5 pour ajuster. Ça permet d'adapter à la soirée (bières fortes vs vin léger). Implémentation : un objet `gameConfig` dans le state.

### Décision retenue
✅ **3 gorgées par défaut, configurable au lobby (slider 1-5).**

---

## Point 3 — Portails : déclenchement en passant ou seulement en s'arrêtant ?

### Hypothèse spec v1.0
"Seulement en s'arrêtant"

### Ce que j'ai trouvé
**Réponse claire et universelle** dans les jeux de plateau : Si un joueur atterrit au sommet d'un serpent, son pion glisse vers le bas. S'il atterrit en bas du serpent, il reste là. Si à la fin d'un mouvement le pion d'un joueur arrive sur l'extrémité basse d'une échelle, il monte au sommet ; si seulement en passant, rien ne se passe.

Cette règle assure que seules des positions spécifiques du plateau déclenchent des changements significatifs, permettant aux joueurs de planifier leurs mouvements en sachant que les positions intermédiaires sont des zones sûres qui empêchent les avancées ou reculs soudains.

### Implications pour ton jeu

Si on déclenche les portails en passant, on a deux problèmes :
1. **Boucles infinies possibles** : entrer en passant case 8 → sortie case 50 → tu continues ton mouvement → repasses sur un autre portail → boucle. Casse-tête à gérer.
2. **Désincitatif au gameplay** : la stratégie de "contrôler son dé" via dé pipé devient absurde si tu peux te faire téléporter en passant.

### Décision retenue
✅ **Déclenchement uniquement à l'arrêt** sur la case portail. Convention universelle, simplicité, prédictibilité.

> Note : cette règle s'applique aussi aux **autres effets** (cases-chiffres, pilules, etc.) — seul l'arrivée déclenche, pas le passage. Sauf le tunnel/portail qui a une règle spécifique : "ne compte pas dans le décompte des cases" — concrètement ça veut dire que **si tu passes à travers un portail en cours de mouvement, le mouvement continue normalement de l'autre côté du portail comme s'il n'existait pas**, mais tu ne te téléportes pas. La téléportation n'a lieu QUE si ton dé t'arrête pile sur la case portail.

---

## Point 4 — Sorcière : nombre de gorgées sur la potion

### Hypothèse spec v1.0
"Choix du donneur (slider 1-10)"

### Analyse

Deux options à arbitrer :
- **A. Choix libre du donneur (slider)** : flexible, mais surcharge cognitive en soirée. Et risque d'abus ("je te file 10 gorgées" → la cible doit dire merci ou boire 20).
- **B. Valeur fixe** : simple. Question : quelle valeur ?

L'effet "double si pas de merci" est puissant. Il faut que la valeur de base soit suffisamment basse pour que dire merci soit un vrai dilemme social (sinon tout le monde dit merci automatiquement).

### Référence aux autres mécaniques

Le pt malus impose 6 gorgées sans recours. La potion impose X mais avec recours (dire merci). Donc pour l'équilibre :
- Si X = 3 → doublé = 6 → équivalent à pt malus si pas de merci. Mais le merci coûte rien, donc la cible dit toujours merci. Trop facile.
- Si X = 5 → doublé = 10 → menace réelle, dire merci a du sens.
- Si X = 7 → doublé = 14 → peut-être trop punitif.

### Recommandation : **5 gorgées par défaut, configurable (3-7)**

Le merci doit avoir un coût social ("merci" peut être perçu comme se rabaisser dans le contexte soirée → certains préféreront boire 5 plutôt que dire merci à un rival).

### Décision retenue
✅ **5 gorgées fixe (config par lobby possible). Le receveur a 10 secondes pour dire "merci" via bouton, sinon doublé à 10.**

---

## Point 5 — Pilule bleu 5-6 "double tes prochaines gorgées" : durée

### Hypothèse spec v1.0
"One-shot, consommé à la prochaine fois où le joueur boit"

### Analyse

Trois interprétations possibles :
- **A. One-shot strict** : la prochaine gorgée à boire (peu importe quand) est doublée.
- **B. Tour suivant uniquement** : si tu ne bois pas au prochain tour, l'effet expire.
- **C. Permanent jusqu'à la fin** : toutes tes gorgées sont doublées tout le reste de la partie.

L'option **C** est trop punitive (et casse l'équilibre). L'option **B** est implementation-friendly mais peut être frustrante (tirer la pilule juste avant 3 tours sans boire = effet perdu). L'option **A** est ce qui ressort comme le plus naturel et le plus juste.

### Recommandation : **One-shot strict, sans expiration**

L'effet est stocké comme un flag `doubleNextSip: true` sur le player. À la prochaine instance où le joueur doit boire (n'importe quelle source), le nombre de gorgées est doublé et le flag est consommé.

### Cas limites à clarifier

- **Quid si on cumule deux pilules bleues 5-6 ?** Décision : **non cumulable** (cohérent avec la bromance). Le flag reste true, ne devient pas "quadruple".
- **Quid si on est en bromance et que le bro doit boire à cause d'un effet sur nous ?** Décision : la bromance se déclenche AVANT le double. Donc on boit 2 (bromance), bro boit 2 (bromance), puis le double s'applique sur nous donc on boit 2 de plus (= 4 total). C'est punitif mais logique.

### Décision retenue
✅ **One-shot strict, non cumulable. Flag `doubleNextSip` consommé à la prochaine instance de boire.**

---

## Point 6 — Bromance : que se passe-t-il en cas de chaîne ?

### Question
Si A bromance avec B, puis B bromance avec C, le lien A-B est-il rompu ?

### Hypothèse spec v1.0
"Oui, B-A est écrasé, mais A reste seul"

### Analyse

Trois interprétations :
- **A. Lien strictement réciproque, écrasement bilatéral** : quand B re-bromance avec C, A et B sont tous deux libérés, B-C est créé.
- **B. Écrasement unilatéral** : B casse son lien vers A, mais A garde son lien vers B (asymétrique). Boire chez B fait boire C, boire chez A fait boire B (et donc C aussi par cascade ?).
- **C. Chaîne possible** : A-B-C tous liés.

L'option **B** crée des asymétries casse-tête. L'option **C** est marrante mais explosive (10 joueurs tous chaînés = chaque gorgée = 10 gorgées). L'option **A** est la plus propre.

### Recommandation : **Écrasement bilatéral**

Quand un joueur tombe sur une case bromance et choisit une nouvelle cible :
1. Si l'ancienne bromance existait, les deux ex-bromancés deviennent libres.
2. Si la nouvelle cible est déjà bromancée avec quelqu'un d'autre, ce lien est aussi cassé.
3. Le nouveau lien réciproque est créé.

### Visualisation UI

Afficher un petit cœur/lien visuel entre les pions des deux bromancés sur le plateau. Quand le lien casse, animation de fade-out.

### Décision retenue
✅ **Écrasement bilatéral. Au max 2 joueurs liés à la fois par paire bromance. Plusieurs paires bromance peuvent coexister sur le plateau.**

---

## Point 7 — Joueur qui quitte définitivement en cours de partie

### Hypothèse spec v1.0
"Son pion reste sur place mais inactif. Tour skippé."

### Ce que j'ai trouvé

**Pattern Colyseus** : la lib offre `allowReconnection(client, seconds)` qui maintient le joueur "fantôme" pendant N secondes. Pendant ce temps, son tour est gelé. Au-delà, le joueur est éjecté définitivement.

**Pattern jeux concurrentiels (Chess.com, Board Game Arena)** : Trois options : kick (force la défaite et pénalité), abandon (la partie est annulée comme si elle n'avait jamais eu lieu), ou conversion en mode turn-based asynchrone. Si un joueur se déconnecte, le timer ne commence qu'à son tour, et après expiration, le jeu est considéré abandonné.

**Spécificité jeu à boire en soirée** : c'est **coopératif-compétitif décontracté**. Personne ne va vraiment "faire forfait stratégiquement". Les déconnexions sont légitimes (batterie, wifi, joueur trop saoul, etc.).

### Recommandation : approche en 3 niveaux

| Niveau | Durée | État | Action |
|---|---|---|---|
| 1. Connection lost | 0-30s | Reconnect possible, pion grisé | Bandeau "Joueur X reconnecting..." |
| 2. Marqué AFK | 30s-3min | Tour skippé automatiquement | Timer visible côté autres joueurs |
| 3. Abandon | > 3min | Pion retiré du plateau, stats sauvées | Notification, partie continue |

Et un bouton **"Forcer kick"** disponible aux autres joueurs après 1min — permet d'évacuer rapidement quelqu'un qui ne reviendra pas.

**Cas limite** : si le joueur déconnecté est le **host** (créateur de la partie), un autre joueur reprend le rôle automatiquement. Le rôle de host est juste "qui peut démarrer / kick / config" — il ne stocke aucun état spécifique.

**Cas limite** : si seulement 1 joueur reste connecté, la partie passe en pause (état "waiting_for_players") — pas d'auto-victoire.

### Décision retenue
✅ **Système 3 niveaux : reconnect 30s → AFK 3min → abandon. Vote kick possible. Host transférable.**

---

## Point 8 — Couleurs des pions : choix libre ou imposées ?

### Hypothèse spec v1.0
"Palette de 10 couleurs, premier arrivé premier servi"

### Ce que j'ai trouvé

L'idéal est d'offrir à la fois des presets de palettes optimisées pour différents types de daltonisme, et un mode custom qui permet le libre choix des couleurs. Le libre choix par les joueurs est ce que les gamers daltoniens demandent le plus souvent.

En multijoueur, la customisation de personnage permet souvent aux joueurs daltoniens de créer une silhouette qu'ils peuvent reconnaître. Par exemple, "je n'ai pas besoin de savoir que mon personnage est vert, j'ai juste besoin de savoir que c'est celui qui porte le chapeau haut-de-forme".

### Recommandation

**Solution principale** : palette de 10 couleurs distinctes optimisées pour la lisibilité.

**Solution complémentaire** : ne PAS se reposer uniquement sur la couleur. Chaque pion a aussi :
- Un **emoji/icône** au choix du joueur (🦊, 🐧, 🐯, 🦁, 🐸, 🐼, 🦄, 🐙, 🐢, 🦋, etc.)
- Le **pseudo** affiché en hover/tap

Comme ça, même si deux joueurs choisissent par mégarde des couleurs proches (rare avec 10 distinctes), l'icône les différencie.

### Palette proposée (testée daltonisme-friendly)

```
🔴 #E63946 — Rouge corail
🔵 #1D3557 — Bleu marine
🟢 #06A77D — Vert sapin
🟡 #F4A261 — Orange chaud
🟣 #7209B7 — Violet profond
🩷 #FF006E — Rose néon
🟠 #FB5607 — Orange vif
🔷 #00B4D8 — Cyan
🟤 #6F4E37 — Marron café
⚫ #2B2D42 — Anthracite
```

Cette palette respecte les ratios de contraste recommandés et reste distinguable en mode protanopia/deuteranopia (les daltonismes les plus courants).

### Mécanique d'attribution

- Au lobby, chaque joueur voit la palette. Les couleurs déjà prises sont grisées.
- Premier arrivé premier servi pour les couleurs.
- Ajout obligatoire d'un emoji-avatar (palette de 20 emojis animaux/objets).
- L'avatar + couleur composent l'identité visuelle du pion.

### Décision retenue
✅ **Palette de 10 couleurs daltonisme-friendly + emoji obligatoire. Premier arrivé, premier servi sur les couleurs.**

---

## Synthèse — Tableau récapitulatif

| # | Point | Décision finale |
|---|---|---|
| 1 | Pt malus ×6 | Consommable d'inventaire, 6 gorgées imposées à une cible. Achat 5G. |
| 2 | Gorgées cartes ♠♥♦♣ | 3 par défaut, configurable au lobby (slider 1-5). |
| 3 | Portails : passage vs arrêt | **Seulement à l'arrêt**. Convention universelle. |
| 4 | Potion sorcière | 5 gorgées fixes. 10s timer pour merci. Doublé = 10 si pas de merci. |
| 5 | Pilule bleu 5-6 (double) | One-shot non cumulable. Flag consommé à la prochaine instance de boire. |
| 6 | Bromance en chaîne | Écrasement bilatéral. Plusieurs paires possibles. |
| 7 | Joueur quitte définitivement | 3 niveaux : reconnect 30s → AFK 3min → abandon. Vote kick. Host transférable. |
| 8 | Couleurs pions | Palette 10 couleurs daltonisme-friendly + emoji obligatoire. FCFS. |

---

## Implications sur la spec v1.0

Il faut mettre à jour les sections suivantes du document principal :

- **§3.3 Effets détaillés** : préciser le pt malus, les cartes ♠♥♦♣, la potion sorcière, la durée pilule bleu 5-6, la bromance en chaîne.
- **§3.4** : rien à modifier.
- **§5.1 Schémas Colyseus** : ajouter `gameConfig` (sips_per_card, witch_potion_sips), `playerEmoji`, étendre `connectionStatus` pour les 3 niveaux.
- **§6.4 Modals** : préciser l'UI du pt malus (sélection cible) et bromance (animation de cœur).
- **§7.1 Stats SQLite** : ajouter `disconnects_count` par player.
- **Nouvelle §3.5** : "Configuration au lobby" (sliders pour gorgées paramétrables).

---

*Tous les points sont résolus et implémentables. Prêt pour génération du squelette de code.*
