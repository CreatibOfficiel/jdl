'use client';

import { isValidGameCode, normalizeGameCode } from '@jeu-soiree/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Board } from '@/components/board/Board';
import { Dice3D } from '@/components/dice/Dice3D';
import { ConnectionStatus } from '@/components/game/ConnectionStatus';
import { EventLog } from '@/components/game/EventLog';
import { FinishedView } from '@/components/game/FinishedView';
import { GameSkeleton } from '@/components/game/GameSkeleton';
import { Inventory } from '@/components/game/Inventory';
import { MuteToggle } from '@/components/game/MuteToggle';
import { PlayersBar } from '@/components/game/PlayersBar';
import { StatsPanel } from '@/components/game/StatsPanel';
import { BromanceModal } from '@/components/modals/BromanceModal';
import { LoadedDieModal } from '@/components/modals/LoadedDieModal';
import { PilulesModal } from '@/components/modals/PilulesModal';
import { PlayerPickerModal } from '@/components/modals/PlayerPickerModal';
import { RailDeBusModal } from '@/components/modals/RailDeBusModal';
import { ShopModal } from '@/components/modals/ShopModal';
import { TreasureModal } from '@/components/modals/TreasureModal';
import { WitchOfferModal } from '@/components/modals/WitchOfferModal';
import { WitchReceiveModal } from '@/components/modals/WitchReceiveModal';
import { useColyseusRoom } from '@/hooks/useColyseusRoom';
import { colyseusStateToBoard } from '@/lib/colyseusToBoard';
import type { ClientGameState, ClientPlayer } from '@/types/colyseus';

interface GameClientProps {
  code: string;
  initialProfile: {
    name?: string;
    suit?: string;
    color?: string;
    emoji?: string;
  };
}

export function GameClient({ code, initialProfile }: GameClientProps) {
  const router = useRouter();
  const normalized = normalizeGameCode(code);
  const validCode = isValidGameCode(normalized);
  const profileComplete = Boolean(
    initialProfile.name && initialProfile.suit && initialProfile.color && initialProfile.emoji,
  );

  const options = useMemo(
    () => ({
      code: normalized,
      name: initialProfile.name ?? '',
      suit: initialProfile.suit ?? '',
      color: initialProfile.color ?? '',
      emoji: initialProfile.emoji ?? '',
    }),
    [
      normalized,
      initialProfile.name,
      initialProfile.suit,
      initialProfile.color,
      initialProfile.emoji,
    ],
  );

  const { state, status, error, room } = useColyseusRoom<ClientGameState>(
    'game_room',
    options,
    validCode && profileComplete,
  );

  const [hasRolledOrder, setHasRolledOrder] = useState(false);
  const [pickItemType, setPickItemType] = useState<string | null>(null);
  const [witchOfferOpen, setWitchOfferOpen] = useState(false);
  const [loadedDieOpen, setLoadedDieOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // Reset hasRolledOrder when phase moves on
  useEffect(() => {
    if (state?.phase !== 'rolling_order') setHasRolledOrder(false);
  }, [state?.phase]);

  // Redirect back to lobby if phase reverts
  useEffect(() => {
    if (state?.phase === 'lobby') {
      const params = new URLSearchParams({
        name: initialProfile.name ?? '',
        suit: initialProfile.suit ?? '',
        color: initialProfile.color ?? '',
        emoji: initialProfile.emoji ?? '',
      });
      router.replace(`/lobby/${normalized}?${params.toString()}`);
    }
  }, [state?.phase, normalized, initialProfile, router]);

  if (!validCode) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Code invalide</h1>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }
  if (!profileComplete) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Profil manquant</h1>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  if (status === 'connecting' || status === 'idle') {
    return <GameSkeleton message={`Connexion à la partie ${normalized}…`} />;
  }
  if (status === 'error') {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Erreur</h1>
        <p className="mt-2 text-red-700">{error}</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }
  if (!state || !room) {
    return <GameSkeleton message="Chargement du state…" />;
  }

  const me = state.players.get(room.sessionId);
  const board = colyseusStateToBoard(state);
  const turnOrderArray: string[] = [];
  state.turnOrder.forEach((id) => {
    turnOrderArray.push(id);
  });
  const activeId = turnOrderArray[state.currentTurnIndex];
  const isMyTurn = activeId === room.sessionId;
  const playersList: ClientPlayer[] = [];
  state.players.forEach((p) => {
    playersList.push(p);
  });
  const activePlayerName = activeId ? (state.players.get(activeId)?.name ?? '?') : '?';
  const isMyModal = state.activeModalPlayerId === room.sessionId;

  function handleRollOrder() {
    if (!room || hasRolledOrder) return;
    room.send('roll_order_dice');
    setHasRolledOrder(true);
  }

  function handleRollDice() {
    if (!room || !isMyTurn) return;
    room.send('roll_dice');
  }

  function handleLeave() {
    room?.leave(true);
    router.push('/');
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-4">
      <ConnectionStatus status={status} error={error} />
      <header className="mb-3 flex items-baseline justify-between gap-4">
        <h1 className="font-mono text-xl font-bold text-blue-600">{state.boardSeed}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatsOpen(true)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
            aria-label="Ouvrir les stats"
            title="Stats live"
          >
            📊
          </button>
          <MuteToggle />
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Quitter
          </button>
        </div>
      </header>
      <StatsPanel state={state} open={statsOpen} onClose={() => setStatsOpen(false)} />

      <PlayersBar
        players={state.players}
        selfId={room.sessionId}
        activeId={activeId}
        turnOrder={turnOrderArray}
      />

      <div className="my-3 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="aspect-square w-full max-w-2xl">
          <Board board={board} players={playersList} activeId={activeId} />
        </div>

        <aside className="space-y-3">
          {state.phase === 'rolling_order' && (
            <RollingOrderPanel
              state={state}
              hasRolled={hasRolledOrder || state.rollOrderRolls.has(room.sessionId)}
              onRoll={handleRollOrder}
            />
          )}

          {state.phase === 'playing' && (
            <PlayingPanel
              meName={me?.name ?? '?'}
              activeName={activeId ? state.players.get(activeId)?.name : undefined}
              isMyTurn={isMyTurn}
              lastDice={state.lastDiceRoll}
              rollKey={state.eventLog.length}
              onRoll={handleRollDice}
            />
          )}

          {state.phase === 'finished' && (
            <FinishedView
              winnerName={state.players.get(state.winnerId)?.name ?? '?'}
              isMe={state.winnerId === room.sessionId}
              players={playersList}
            />
          )}

          {me && me.inventory.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-3">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Inventaire
              </h2>
              <Inventory
                inventory={me.inventory}
                onUse={(itemType) => {
                  if (itemType === 'malus_point') {
                    setPickItemType('malus_point');
                  } else if (itemType === 'potion') {
                    setWitchOfferOpen(true);
                  } else if (itemType === 'loaded_die') {
                    setLoadedDieOpen(true);
                  } else {
                    room.send('use_item', { itemType });
                  }
                }}
              />
            </section>
          )}

          <section className="rounded-2xl border border-zinc-200 bg-white p-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Event log
            </h2>
            <EventLog events={state.eventLog} />
          </section>
        </aside>
      </div>

      <BromanceModal
        open={state.activeModal === 'bromance'}
        isMyTurn={isMyModal}
        meId={room.sessionId}
        candidates={playersList}
        activePlayerName={activePlayerName}
        onChoose={(targetId) => room.send('choose_bromance', { targetPlayerId: targetId })}
      />

      <ShopModal
        open={state.activeModal === 'shop'}
        isMyTurn={isMyModal}
        activePlayerName={activePlayerName}
        onBuy={(itemType) => room.send('buy_item', { itemType })}
        onSkip={() => room.send('skip_shop')}
      />

      <PilulesModal
        open={state.activeModal === 'pills'}
        isMyTurn={isMyModal}
        activePlayerName={activePlayerName}
        onChoose={(color) => room.send('choose_pill', { color })}
      />

      <PlayerPickerModal
        open={pickItemType === 'malus_point'}
        title="💣 Pt malus — qui ?"
        description="Choisis qui doit boire 6 gorgées."
        candidates={playersList}
        excludeIds={[room.sessionId]}
        onPick={(targetId) => {
          room.send('use_item', { itemType: 'malus_point', targetPlayerId: targetId });
          setPickItemType(null);
        }}
        onCancel={() => setPickItemType(null)}
      />

      <WitchOfferModal
        open={witchOfferOpen}
        meId={room.sessionId}
        candidates={playersList}
        onOffer={(targetId, sips) => {
          room.send('give_potion', { targetPlayerId: targetId, sips });
          setWitchOfferOpen(false);
        }}
        onCancel={() => setWitchOfferOpen(false)}
      />

      <WitchReceiveModal
        open={state.activeModal === 'witch_potion'}
        isMe={state.activeModalPlayerId === room.sessionId}
        offererName={state.players.get(state.witchOffererId)?.name ?? '?'}
        targetName={state.players.get(state.activeModalPlayerId)?.name ?? '?'}
        sips={state.witchSips}
        deadline={state.witchDeadline}
        onSayThanks={() => room.send('say_thanks')}
      />

      <TreasureModal
        open={state.activeModal === 'treasure'}
        isMyTurn={isMyModal}
        activePlayerName={activePlayerName}
        hasCrowbar={Boolean(me?.inventory && Array.from(me.inventory).includes('crowbar'))}
        onOpen={() => room.send('open_treasure')}
        onSkip={() => room.send('skip_treasure')}
      />

      <PlayerPickerModal
        open={state.activeModal === 'treasure_swap' && isMyModal}
        title="🔀 Échange de position"
        description="Choisis avec qui échanger ta position."
        candidates={playersList}
        excludeIds={[room.sessionId]}
        onPick={(targetId) => room.send('swap_position', { targetPlayerId: targetId })}
        onCancel={() => {
          /* Server-driven, can't cancel client-side */
        }}
      />

      <LoadedDieModal
        open={loadedDieOpen}
        onPlace={(value) => {
          room.send('use_item', { itemType: 'loaded_die', diceValue: value });
          setLoadedDieOpen(false);
        }}
        onCancel={() => setLoadedDieOpen(false)}
      />

      <RailDeBusModal
        open={state.activeModal === 'rail_de_bus'}
        isMyTurn={isMyModal}
        activePlayerName={activePlayerName}
        cards={state.railCards}
        round={state.railRound}
        onAnswer={(answer) => room.send('rail_de_bus_answer', { round: state.railRound, answer })}
      />
    </main>
  );
}

interface RollingOrderPanelProps {
  state: ClientGameState;
  hasRolled: boolean;
  onRoll: () => void;
}

function RollingOrderPanel({ state, hasRolled, onRoll }: RollingOrderPanelProps) {
  const rolls: { id: string; name: string; roll: number | undefined; rolled: boolean }[] = [];
  state.players.forEach((p) => {
    rolls.push({
      id: p.id,
      name: p.name,
      roll: state.rollOrderRolls.get(p.id),
      rolled: state.rollOrderRolls.has(p.id),
    });
  });

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <h2 className="text-base font-semibold text-zinc-700">Ordre de jeu</h2>
      <p className="mt-1 text-sm text-zinc-500">Chacun lance le dé. Le plus grand commence.</p>
      <ul className="mt-3 space-y-1 text-sm">
        {rolls.map((r) => (
          <li key={r.id} className="flex items-center justify-between">
            <span className="text-zinc-700">{r.name}</span>
            <span className="font-mono text-zinc-500">
              {r.rolled ? `🎲 ${r.roll}` : '…en attente'}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onRoll}
        disabled={hasRolled}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {hasRolled ? 'Dé lancé — en attente des autres' : '🎲 Lancer mon dé'}
      </button>
    </section>
  );
}

interface PlayingPanelProps {
  meName: string;
  activeName: string | undefined;
  isMyTurn: boolean;
  lastDice: number;
  rollKey: number;
  onRoll: () => void;
}

function PlayingPanel({
  meName,
  activeName,
  isMyTurn,
  lastDice,
  rollKey,
  onRoll,
}: PlayingPanelProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">
        {isMyTurn ? `${meName}, à toi !` : `Tour de ${activeName ?? '…'}`}
      </p>
      <div className="mt-3 flex items-center justify-center py-2">
        <Dice3D value={lastDice} rollKey={rollKey} size={96} />
      </div>
      <button
        type="button"
        onClick={onRoll}
        disabled={!isMyTurn}
        className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {isMyTurn ? 'Lancer le dé' : 'Pas ton tour'}
      </button>
    </section>
  );
}
