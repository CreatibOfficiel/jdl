'use client';

import {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  type DifficultyLevel,
  EQUIVALENCE_KINDS,
  EQUIVALENCE_TABLE,
  type EquivalenceKind,
} from '@jeu-soiree/shared';
import Link from 'next/link';
import { useState } from 'react';

interface CaseInfo {
  /** Stable id for keys + URL anchors. */
  id: string;
  emoji: string;
  name: string;
  /** Visual category — used to chunk the grid. */
  category: 'drink' | 'move' | 'social' | 'penalty' | 'reward' | 'neutral';
  /** Short pitch (1 line). */
  short: string;
  /** Full effect — supports {{sips:N}} which renders as the chosen difficulty/equivalence label. */
  effect: string;
}

const CASES: CaseInfo[] = [
  {
    id: 'red_number',
    emoji: '🔴',
    name: 'Carte rouge (1-5)',
    category: 'drink',
    short: 'Distribue N gorgées… ou bois-les en zone soif',
    effect:
      'Tu distribues N gorgées au joueur de ton choix. **Si la case est dans la zone soif, c\'est toi qui bois N gorgées.**',
  },
  {
    id: 'green_number',
    emoji: '🟢',
    name: 'Carte verte (1-5)',
    category: 'reward',
    short: 'Distribue toujours N gorgées',
    effect: 'Tu distribues N gorgées au joueur de ton choix. Pas de piège, pas de zone soif.',
  },
  {
    id: 'spades',
    emoji: '♠',
    name: 'Pique',
    category: 'drink',
    short: 'Match → distribue · mismatch → bois',
    effect:
      'Si ton signe est ♠, tu distribues {{sipsPerCard}} gorgées. Sinon, **tu bois {{sipsPerCard}} gorgées**.',
  },
  {
    id: 'hearts',
    emoji: '♥',
    name: 'Cœur',
    category: 'drink',
    short: 'Match → distribue · mismatch → bois',
    effect:
      'Si ton signe est ♥, tu distribues {{sipsPerCard}} gorgées. Sinon, **tu bois {{sipsPerCard}} gorgées**.',
  },
  {
    id: 'diamonds',
    emoji: '♦',
    name: 'Carreau',
    category: 'drink',
    short: 'Match → distribue · mismatch → bois',
    effect:
      'Si ton signe est ♦, tu distribues {{sipsPerCard}} gorgées. Sinon, **tu bois {{sipsPerCard}} gorgées**.',
  },
  {
    id: 'clubs',
    emoji: '♣',
    name: 'Trèfle',
    category: 'drink',
    short: 'Match → distribue · mismatch → bois',
    effect:
      'Si ton signe est ♣, tu distribues {{sipsPerCard}} gorgées. Sinon, **tu bois {{sipsPerCard}} gorgées**.',
  },
  {
    id: 'formule1',
    emoji: '🏎️',
    name: 'Formule 1',
    category: 'move',
    short: '+4 cases instantanément',
    effect:
      "Tu avances de 4 cases supplémentaires. **L'effet de la case d'arrivée s'applique normalement.**",
  },
  {
    id: 'usain',
    emoji: '⚡',
    name: 'Usain Bolt',
    category: 'move',
    short: '+2 cases instantanément',
    effect:
      "Tu avances de 2 cases supplémentaires. **L'effet de la case d'arrivée s'applique normalement.**",
  },
  {
    id: 'prison',
    emoji: '🔒',
    name: 'Prison',
    category: 'penalty',
    short: 'Bloqué jusqu\'à un 6 (max 4 tours)',
    effect:
      "Lance le dé chaque tour : 6 → libéré. Sinon → **bois 1 gorgée et reste**. Au 4ᵉ tour tu sors automatiquement. Une **clé de prison** te libère immédiatement.",
  },
  {
    id: 'hole',
    emoji: '🕳️',
    name: 'Trou',
    category: 'penalty',
    short: 'Avance d\'1 case par tour pendant N tours',
    effect:
      "Lance le dé : le résultat N est ton nombre de tours bloqués. Pendant ces tours, tu n'avances que d'**1 case par tour** (l'effet de chaque case s'applique).",
  },
  {
    id: 'vacances',
    emoji: '🌴',
    name: 'Vacances',
    category: 'neutral',
    short: 'Aucun effet, profite',
    effect: "Aucun effet. Profite, c'est ta pause.",
  },
  {
    id: 'shop',
    emoji: '🛒',
    name: 'Shop',
    category: 'reward',
    short: 'Achat optionnel : clé, pied de biche, Pt malus',
    effect:
      "Tu peux acheter (en gorgées que **tu bois**) : 🗝️ Clé prison (5G), 🪤 Pied de biche (8G), 💣 Pt malus ×{{ptMalus}} (6G). Ou skip.",
  },
  {
    id: 'witch',
    emoji: '🧙',
    name: 'Sorcière',
    category: 'social',
    short: 'Tu reçois une potion à offrir plus tard',
    effect:
      "Tu gagnes une **potion** dans ton inventaire. Quand tu l'utilises sur quelqu'un, il a 10s pour dire \"merci\" : **merci → sauvé**, **silence → il boit le double**.",
  },
  {
    id: 'bromance',
    emoji: '💪',
    name: 'Bromance',
    category: 'social',
    short: 'Lien réciproque : tu bois, ton bro boit',
    effect:
      "Choisis un joueur. **Vous êtes liés** : à chaque fois que l'un boit, l'autre boit aussi. Un nouveau lien écrase l'ancien (des deux côtés).",
  },
  {
    id: 'pills',
    emoji: '💊',
    name: 'Pilules',
    category: 'social',
    short: 'Choisis : rouge ou bleue ?',
    effect:
      "**Rouge** : tu bois 6 gorgées direct. **Bleue** : lance un dé. 1-2 → bois 8 · 3-4 → distribue 10 · 5-6 → tes prochaines gorgées comptent ×2.",
  },
  {
    id: 'rail_de_bus',
    emoji: '🎴',
    name: 'Rail de bus',
    category: 'drink',
    short: 'Mini-jeu 4 manches : rate = bois',
    effect:
      "4 manches : couleur, plus/moins, dedans/dehors, signe. Chaque erreur = **tu bois la valeur des cartes tirées jusqu'ici**. 4 réussites d'affilée = zéro.",
  },
  {
    id: 'portal',
    emoji: '🌀',
    name: 'Portail',
    category: 'move',
    short: 'Téléportation entre 2 portails',
    effect:
      "Bidirectionnel. **Tu téléportes uniquement si tu t'arrêtes pile dessus** (passer dessus n'a aucun effet). L'effet de la case d'arrivée ne se déclenche pas.",
  },
  {
    id: 'treasure',
    emoji: '💎',
    name: 'Trésor (caché)',
    category: 'reward',
    short: 'Si tu as un pied de biche, ouvre',
    effect:
      "2 cases trésor cachées par partie. Tu ne le sais que si tu tombes dessus avec un **pied de biche**. À l'ouverture, lance le dé : 1-2 → 3 gorgées à tous · 3-4 → tu gagnes un dé pipé · 5-6 → tu échanges ta position avec un autre joueur.",
  },
  {
    id: 'neutral',
    emoji: '·',
    name: 'Case neutre',
    category: 'neutral',
    short: 'Rien à faire',
    effect: "Aucun effet. Tu passes ton tour à qui suit.",
  },
];

const CATEGORY_META: Record<CaseInfo['category'], { label: string; bg: string; ring: string }> = {
  drink: { label: '🍻 Boisson', bg: 'bg-rose-50', ring: 'ring-rose-200' },
  move: { label: '🏃 Mouvement', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  social: { label: '🤝 Social', bg: 'bg-purple-50', ring: 'ring-purple-200' },
  penalty: { label: '⚠️ Pénalité', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  reward: { label: '🎁 Récompense', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  neutral: { label: '· Neutre', bg: 'bg-zinc-50', ring: 'ring-zinc-200' },
};

export function RulesClient() {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [equivalence, setEquivalence] = useState<EquivalenceKind>('drinks');
  const [search, setSearch] = useState('');
  const [openCase, setOpenCase] = useState<CaseInfo | null>(null);
  const searchLower = search.trim().toLowerCase();
  const matchedCases = !searchLower
    ? CASES
    : CASES.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.short.toLowerCase().includes(searchLower) ||
          c.effect.toLowerCase().includes(searchLower) ||
          c.id.includes(searchLower),
      );

  const cfg = DIFFICULTY_PRESETS[difficulty].config;
  const equivRule = EQUIVALENCE_TABLE[equivalence];

  /** Replace tokens like {{sipsPerCard}} or {{ptMalus}} with the right number, formatted
   *  as either "N gorgée(s)" or the equivalence ("10 pompes / gorgée") */
  const renderSips = (sips: number): string => {
    if (equivalence === 'drinks') return `${sips} gorgée${sips > 1 ? 's' : ''}`;
    if (equivalence === 'sit_out') return `tour passé (au lieu de ${sips} gorgée${sips > 1 ? 's' : ''})`;
    const units = sips * equivRule.perSip;
    return `${units} ${equivRule.unit} (${sips} gorgée${sips > 1 ? 's' : ''})`;
  };

  const fillTokens = (text: string): string =>
    text
      .replaceAll('{{sipsPerCard}}', renderSips(cfg.sipsPerCard))
      .replaceAll('{{ptMalus}}', String(cfg.ptMalusSips));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <Link href="/" className="text-sm text-blue-600 underline">
          ← Retour à l'accueil
        </Link>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Règles du jeu</h1>
        <p className="mt-1 text-zinc-600">
          Tout ce qu'il faut savoir avant de lancer une partie. Bonne soirée 🍻
        </p>
      </header>

      {/* Sticky session settings — re-rendered numbers throughout the page reflect these */}
      <section className="sticky top-0 z-10 -mx-4 mb-8 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-zinc-700">Pour cette page :</span>
          <div className="inline-flex rounded-full border border-zinc-200 bg-white">
            {DIFFICULTY_LEVELS.map((lvl) => {
              const m = DIFFICULTY_PRESETS[lvl];
              const active = difficulty === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`rounded-full px-3 py-1 transition ${
                    active ? 'bg-blue-600 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              );
            })}
          </div>
          <div className="inline-flex flex-wrap rounded-full border border-zinc-200 bg-white">
            {EQUIVALENCE_KINDS.map((k) => {
              const r = EQUIVALENCE_TABLE[k];
              const active = equivalence === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setEquivalence(k)}
                  className={`rounded-full px-3 py-1 transition ${
                    active ? 'bg-amber-500 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                  title={r.label}
                >
                  {r.emoji}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500">
            Tous les chiffres ci-dessous se mettent à jour en temps réel.
          </p>
        </div>
      </section>

      <Section title="🚀 60 secondes pour comprendre" anchor="quickstart">
        <ul className="space-y-2 text-zinc-800">
          <li>
            <strong>Le but :</strong> arriver <em>exactement</em> sur la case 63.
          </li>
          <li>
            <strong>Chaque tour :</strong> lance un dé, avance, fais ce que dit la case.
          </li>
          <li>
            <strong>Les cases :</strong> il y en a 19 types — la plupart te font boire, distribuer,
            ou bouger. Quelques-unes (sorcière, bromance) tissent du social.
          </li>
          <li>
            <strong>Les variantes :</strong> le host choisit la difficulté ({DIFFICULTY_PRESETS[difficulty].label}{' '}
            ici → cartes valent {cfg.sipsPerCard} gorgée{cfg.sipsPerCard > 1 ? 's' : ''}). Chaque
            joueur peut remplacer ses gorgées par une équivalence ({equivRule.label}).
          </li>
        </ul>
      </Section>

      <Section title="🎯 Le plateau" anchor="board">
        <p>
          63 cases en spirale (3 anneaux). Sur chaque case, un effet précis (voir plus bas). Au
          début de la partie, <strong>2 cases trésor</strong> sont cachées au hasard sur le plateau.
        </p>
        <p className="mt-2">
          Aussi : une <strong>zone soif</strong> de 5 à 7 cases consécutives où les cartes rouges
          changent de comportement (au lieu de distribuer, tu bois).
        </p>
        <p className="mt-3">
          <Link href="/preview?seed=hello" className="text-blue-600 underline">
            Voir un plateau d'exemple →
          </Link>
        </p>
      </Section>

      <Section title="🔁 Un tour, étape par étape" anchor="turn">
        <ol className="ml-6 list-decimal space-y-1">
          <li>Le joueur courant lance le dé.</li>
          <li>Son pion avance case par case.</li>
          <li>L'effet de la case d'arrivée s'applique.</li>
          <li>Si une modal s'ouvre (shop, bromance, pilule…), il choisit.</li>
          <li>Tour suivant.</li>
        </ol>
        <p className="mt-3 text-sm text-zinc-600">
          Cas spéciaux : en <strong>prison</strong>, tu lances pour t'échapper (6 = libéré). En{' '}
          <strong>trou</strong>, tu n'avances que d'une case par tour pendant N tours.
        </p>
      </Section>

      <Section title="🃏 Les 19 cases" anchor="cases">
        <p className="text-sm text-zinc-600">
          Cliquez (mentalement) sur celles qui vous intriguent — chaque carte a son effet complet.
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher une case (ex: prison, rouge, sorcière…)"
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          aria-label="Chercher une case"
        />
        {searchLower && (
          <p className="mt-2 text-xs text-zinc-500">
            {matchedCases.length} résultat{matchedCases.length > 1 ? 's' : ''}
          </p>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matchedCases.map((c) => {
            const meta = CATEGORY_META[c.category];
            return (
              <button
                type="button"
                key={c.id}
                id={c.id}
                onClick={() => setOpenCase(c)}
                className={`rounded-2xl ${meta.bg} p-4 ring-1 ${meta.ring} text-left transition hover:ring-2 hover:ring-blue-300`}
              >
                <header className="flex items-baseline justify-between">
                  <h3 className="text-base font-semibold text-zinc-900">
                    <span className="mr-1 text-2xl">{c.emoji}</span> {c.name}
                  </h3>
                  <span className="text-xs text-zinc-500">{meta.label}</span>
                </header>
                <p className="mt-1 text-sm font-medium text-zinc-700">{c.short}</p>
                <p
                  className="mt-2 text-sm text-zinc-700"
                  dangerouslySetInnerHTML={{ __html: bold(fillTokens(c.effect)) }}
                />
              </button>
            );
          })}
        </div>
      </Section>

      <CaseDetailModal
        info={openCase}
        onClose={() => setOpenCase(null)}
        difficultyLabel={DIFFICULTY_PRESETS[difficulty].label}
        equivalenceLabel={equivRule.label}
        renderEffect={(text) => bold(fillTokens(text))}
      />

      <Section title="⚙️ Difficulté" anchor="difficulty">
        <p>
          Le host choisit un niveau au moment de créer la partie. Cela module les sips de plusieurs
          mécaniques :
        </p>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="py-1">Niveau</th>
              <th className="py-1">Cartes ♠♥♦♣</th>
              <th className="py-1">Pt malus</th>
              <th className="py-1">Potion sorcière (défaut)</th>
            </tr>
          </thead>
          <tbody>
            {DIFFICULTY_LEVELS.map((lvl) => {
              const m = DIFFICULTY_PRESETS[lvl];
              const active = difficulty === lvl;
              return (
                <tr
                  key={lvl}
                  className={active ? 'border-t border-blue-200 bg-blue-50' : 'border-t border-zinc-100'}
                >
                  <td className="py-2 font-semibold">
                    {m.emoji} {m.label} {active && <span className="ml-1 text-xs text-blue-600">(actif)</span>}
                  </td>
                  <td className="py-2 font-mono">{m.config.sipsPerCard} gorgée(s)</td>
                  <td className="py-2 font-mono">{m.config.ptMalusSips}</td>
                  <td className="py-2 font-mono">{m.config.witchPotionSips}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-zinc-600">
          Le générateur de plateau lui-même reste identique pour l'instant (à venir : board "punitif"
          en hardcore avec plus de prisons et de zones soif).
        </p>
      </Section>

      <Section title="💪 Équivalences (pas de gorgées ?)" anchor="equivalences">
        <p>
          Chaque joueur choisit son équivalence en lobby. Tes gorgées sont automatiquement converties
          dans tes propres unités, et le ricochet bromance honore l'équivalence de chaque partenaire.
        </p>
        <ul className="mt-3 space-y-2">
          {EQUIVALENCE_KINDS.map((k) => {
            const r = EQUIVALENCE_TABLE[k];
            const active = equivalence === k;
            return (
              <li
                key={k}
                className={`flex items-baseline gap-3 rounded-lg border px-3 py-2 ${
                  active ? 'border-amber-400 bg-amber-50' : 'border-zinc-200 bg-white'
                }`}
              >
                <span className="text-2xl">{r.emoji}</span>
                <div>
                  <div className="font-semibold text-zinc-900">{r.label}</div>
                  <div className="text-sm text-zinc-600">
                    {k === 'drinks' && 'Comportement par défaut.'}
                    {k === 'sit_out' && 'Le tour est juste passé — pas de boisson, pas d\'unité comptée.'}
                    {k !== 'drinks' && k !== 'sit_out' && (
                      <>
                        1 gorgée = <strong>{r.perSip} {r.unit}</strong>. Une carte rouge à{' '}
                        {cfg.sipsPerCard} gorgée(s) devient {cfg.sipsPerCard * r.perSip} {r.unit}.
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-zinc-600">
          Note : le host peut choisir si les équivalences comptent ou non dans le leaderboard
          général (option <code className="rounded bg-zinc-100 px-1">countEquivalenceAsSips</code>).
        </p>
      </Section>

      <Section title="🤔 FAQ et cas limites" anchor="faq">
        <Faq q="Si j'arrive sur prison via un portail, je vais en prison ?">
          Non. <strong>Arriver via un portail ne déclenche pas l'effet de la case</strong>. Le portail
          te dépose sur la case puis le tour s'arrête.
        </Faq>
        <Faq q="Si je rate la potion en disant rien, je bois combien ?">
          Tu bois <strong>le double</strong> de l'offre. La sorcière propose {cfg.witchPotionSips}{' '}
          gorgées par défaut → silence = {cfg.witchPotionSips * 2}.
        </Faq>
        <Faq q="Bromance : si mon bro fait bromance avec quelqu'un d'autre ?">
          L'ancien lien casse <strong>des deux côtés</strong>. Pas de chaîne possible : seules les
          paires (1↔1) existent. Plusieurs paires distinctes peuvent coexister.
        </Faq>
        <Faq q="J'arrive sur la finish (63) avec un dé qui dépasse ?">
          Tu rebondis : tu fais le surplus en arrière. Il faut atterrir <strong>exactement</strong>{' '}
          sur 63.
        </Faq>
        <Faq q="Le rail de bus, je peux abandonner en cours ?">
          Non. Une erreur termine la séquence et tu bois la valeur des cartes tirées jusque-là.
          Quatre réussites d'affilée = zéro gorgée.
        </Faq>
      </Section>

      <footer className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
        <Link href="/" className="text-blue-600 underline">
          ← Créer ou rejoindre une partie
        </Link>
      </footer>
    </main>
  );
}

function CaseDetailModal({
  info,
  onClose,
  difficultyLabel,
  equivalenceLabel,
  renderEffect,
}: {
  info: CaseInfo | null;
  onClose: () => void;
  difficultyLabel: string;
  equivalenceLabel: string;
  renderEffect: (text: string) => string;
}) {
  if (!info) return null;
  const meta = CATEGORY_META[info.category];
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl ${meta.bg} p-5 shadow-xl ring-1 ${meta.ring}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-zinc-900">
            <span className="mr-1 text-3xl">{info.emoji}</span> {info.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-zinc-500 hover:text-zinc-900"
            aria-label="Fermer"
          >
            ×
          </button>
        </header>
        <p className="mt-2 text-sm font-medium text-zinc-700">{info.short}</p>
        <p
          className="mt-3 text-base text-zinc-800"
          dangerouslySetInnerHTML={{ __html: renderEffect(info.effect) }}
        />
        <p className="mt-4 text-xs text-zinc-500">
          {meta.label} · valeurs pour <strong>{difficultyLabel}</strong> ·{' '}
          <strong>{equivalenceLabel}</strong>
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  anchor,
  children,
}: {
  title: string;
  anchor: string;
  children: React.ReactNode;
}) {
  return (
    <section id={anchor} className="mb-10 scroll-mt-24">
      <h2 className="mb-3 text-2xl font-bold text-zinc-900">{title}</h2>
      <div className="space-y-2 text-zinc-800">{children}</div>
    </section>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="mb-2 rounded-lg border border-zinc-200 bg-white p-3">
      <summary className="cursor-pointer font-semibold text-zinc-800">{q}</summary>
      <div className="mt-2 text-sm text-zinc-700">{children}</div>
    </details>
  );
}

/** Tiny markdown-bold replacement so the rule strings can highlight key bits without a full parser. */
function bold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
