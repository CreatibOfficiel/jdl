'use client';

import { isValidGameCode, normalizeGameCode } from '@jeu-soiree/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadAppearance } from '@/components/AppearanceToggle';
import { Board } from '@/components/board/Board';
import { EffectBanner } from '@/components/board/EffectBanner';
import { Dice3D } from '@/components/dice/Dice3D';
import { ConnectionStatus } from '@/components/game/ConnectionStatus';
import { EventLog } from '@/components/game/EventLog';
import { FinishedView } from '@/components/game/FinishedView';
import { Inventory } from '@/components/game/Inventory';
import { MuteToggle } from '@/components/game/MuteToggle';
import { PlayersBar } from '@/components/game/PlayersBar';
import { ReactionBar } from '@/components/game/ReactionBar';
import { StatsPanel } from '@/components/game/StatsPanel';
import { ModalEcho } from '@/components/master/ModalEcho';
import { ReactionFountain } from '@/components/master/ReactionFountain';
import { BromanceModal } from '@/components/modals/BromanceModal';
import { DistributeModal } from '@/components/modals/DistributeModal';
import { DrinkConfirmModal } from '@/components/modals/DrinkConfirmModal';
import { EquivalenceTaskModal } from '@/components/modals/EquivalenceTaskModal';
import { LoadedDieModal } from '@/components/modals/LoadedDieModal';
import { PilulesModal } from '@/components/modals/PilulesModal';
import { PlayerPickerModal } from '@/components/modals/PlayerPickerModal';
import { RailDeBusModal } from '@/components/modals/RailDeBusModal';
import { ShopModal } from '@/components/modals/ShopModal';
import { TreasureModal } from '@/components/modals/TreasureModal';
import { WitchOfferModal } from '@/components/modals/WitchOfferModal';
import { WitchReceiveModal } from '@/components/modals/WitchReceiveModal';
import { Spinner } from '@/components/ui/Spinner';
import { useColyseusRoom } from '@/hooks/useColyseusRoom';
import { useEquivalenceQueue } from '@/hooks/useEquivalenceQueue';
import { useModalEcho } from '@/hooks/useModalEcho';
import { useReactions } from '@/hooks/useReactions';
import { useSounds } from '@/hooks/useSounds';
import { colyseusStateToBoard } from '@/lib/colyseusToBoard';
import type { ClientGameState, ClientPlayer, ClientSipEvent } from '@/types/colyseus';

interface GameClientProps {
  code: string;
  initialProfile: {
    name?: string;
  };
}

export function GameClient({ code, initialProfile }: GameClientProps) {
  const router = useRouter();
  const normalized = normalizeGameCode(code);
  const validCode = isValidGameCode(normalized);
  const hasName = Boolean(initialProfile.name?.trim());

  const options = useMemo(
    () => ({
      code: normalized,
      name: initialProfile.name ?? '',
      suit: '',
      color: '',
      emoji: '',
    }),
    [normalized, initialProfile.name],
  );

  const { state, status, error, room } = useColyseusRoom<ClientGameState>(
    'game_room',
    options,
    validCode && hasName,
  );

  const [hasRolledOrder, setHasRolledOrder] = useState(false);
  const reactions = useReactions(room ?? null);
  const [pickItemType, setPickItemType] = useState<string | null>(null);
  const [witchOfferOpen, setWitchOfferOpen] = useState(false);
  const [loadedDieOpen, setLoadedDieOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const sounds = useSounds();
  const [echoesEnabled, setEchoesEnabled] = useState(false);
  useEffect(() => {
    setEchoesEnabled(loadAppearance().playerEchoes);
  }, []);

  useEffect(() => {
    if (state?.phase !== 'rolling_order') setHasRolledOrder(false);
    if (state?.phase === 'finished') sounds.play('victory', 0.6);
  }, [state?.phase, sounds]);

  const lastModalRef = useRef('');
  useEffect(() => {
    const cur = state?.activeModal ?? '';
    if (cur && cur !== lastModalRef.current) sounds.play('modal-open', 0.4);
    lastModalRef.current = cur;
  }, [state?.activeModal, sounds]);

  useEffect(() => {
    if (state?.phase === 'lobby') {
      const params = new URLSearchParams({ name: initialProfile.name ?? '' });
      router.replace(`/lobby/${normalized}?${params.toString()}`);
    }
  }, [state?.phase, normalized, initialProfile.name, router]);

  const sipEventsArr = useMemo(() => {
    if (!state?.sipEvents) return [];
    const arr: ClientSipEvent[] = [];
    state.sipEvents.forEach((e) => {
      arr.push(e);
    });
    return arr;
  }, [state?.sipEvents, state?.sipEventsTotalCount]);

  const eventLogArr = useMemo(() => {
    if (!state?.eventLog) return [];
    const out: Array<{
      id: string;
      text: string;
      importance: 'low' | 'normal' | 'high' | 'epic';
      playerId: string;
      kind: string;
      timestamp: number;
    }> = [];
    state.eventLog.forEach((e) => {
      out.push({
        id: e.id,
        text: e.text,
        importance: e.importance as 'low' | 'normal' | 'high' | 'epic',
        playerId: e.playerId,
        kind: e.kind,
        timestamp: e.timestamp,
      });
    });
    return out;
  }, [state?.eventLog]);
  const echo = useModalEcho(echoesEnabled ? eventLogArr : []);
  const equivQueue = useEquivalenceQueue(
    sipEventsArr,
    room?.sessionId ?? '',
    normalized,
    state?.phase,
  );

  const [highlightCase, setHighlightCase] = useState<{
    index: number;
    color: 'red' | 'blue' | 'green' | 'gold';
  } | null>(null);
  const [bannerEvents, setBannerEvents] = useState<Array<{ id: string; text: string }>>([]);

  const prevEventCountRef = useRef(0);
  useEffect(() => {
    if (!state || eventLogArr.length <= prevEventCountRef.current) {
      prevEventCountRef.current = eventLogArr.length;
      return;
    }
    const newEvents = eventLogArr.slice(prevEventCountRef.current);
    prevEventCountRef.current = eventLogArr.length;
    const actionKinds: Record<string, 'red' | 'blue' | 'green' | 'gold'> = {
      prison_caught: 'red',
      hole_caught: 'red',
      red_drink: 'red',
      teleport: 'blue',
      portal: 'blue',
      usain: 'green',
      formule1: 'green',
      card_match: 'gold',
      card_mismatch: 'gold',
      shop_open: 'gold',
      bromance_open: 'gold',
      pill_open: 'gold',
      witch_potion_get: 'gold',
    };
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    for (const ev of newEvents) {
      const color = actionKinds[ev.kind];
      if (!color) continue;
      const player = ev.playerId ? state.players.get(ev.playerId) : null;
      if (!player) continue;
      setHighlightCase({ index: player.position, color });
      setBannerEvents((prev) => [...prev.slice(-1), { id: ev.id, text: ev.text }]);
      timeoutId = setTimeout(() => setHighlightCase(null), 2400);
      break;
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [eventLogArr, state]);

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

  if (!hasName) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Pseudo manquant</h1>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  if (status === 'connecting' || status === 'idle') {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <Spinner />
          <span>Connexion à la partie {normalized}…</span>
        </div>
      </main>
    );
  }
  if (status === 'error') {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Erreur</h1>
        <p className="mt-2 text-red-700 dark:text-red-400">{error}</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }
  if (!state || !room || !state.players) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <Spinner />
          <span>Chargement du state…</span>
        </div>
      </main>
    );
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
  const activePlayerEmoji = activeId ? (state.players.get(activeId)?.emoji ?? '') : '';
  const isMyModal = state.activeModalPlayerId === room.sessionId;

  function handleRollOrder() {
    if (!room || hasRolledOrder) return;
    sounds.play('dice-roll', 0.5);
    room.send('roll_order_dice');
    setHasRolledOrder(true);
  }

  function handleRollDice() {
    if (!room || !isMyTurn) return;
    sounds.play('dice-roll', 0.5);
    room.send('roll_dice');
  }

  function handleLeave() {
    room?.leave(true);
    router.push('/');
  }

  function handleIamDone() {
    if (!room) return;
    if (!confirm('Te mettre en pause pour la fin de la partie ? Tu seras passé(e) à chaque tour.'))
      return;
    room.send('i_am_done');
  }
  const meExited = me?.exited ?? false;

  return (
    <main className="mx-auto max-w-5xl px-4 py-4">
      <ReactionFountain reactions={reactions} />
      <ConnectionStatus status={status} error={error} />
      <header className="mb-3 flex items-baseline justify-between gap-4">
        <h1 className="font-mono text-xl font-bold text-blue-600">{state.boardSeed}</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/rules"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            📖
          </Link>
          <button
            type="button"
            onClick={() => setStatsOpen(true)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            aria-label="Ouvrir les stats"
            title="Stats live"
          >
            📊
          </button>
          {!meExited && state.phase === 'playing' && (
            <button
              type="button"
              onClick={handleIamDone}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              title="Je passe pour la fin de la partie"
            >
              🪑 Je passe
            </button>
          )}
          {meExited && (
            <span
              className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs text-zinc-500 dark:text-zinc-400"
              title="Tu es en pause"
            >
              🪑 En pause
            </span>
          )}
          <MuteToggle />
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            Quitter
          </button>
        </div>
      </header>
      <StatsPanel state={state} open={statsOpen} onClose={() => setStatsOpen(false)} />
      <EquivalenceTaskModal
        task={equivQueue.current}
        onDone={equivQueue.pop}
        onSkip={equivQueue.pop}
      />
      {echoesEnabled && <ModalEcho echo={echo} />}

      <PlayersBar
        players={state.players}
        selfId={room.sessionId}
        activeId={activeId}
        turnOrder={turnOrderArray}
        difficultyLevel={state.difficultyLevel}
        sipEvents={sipEventsArr}
      />

      <div className="my-3 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="aspect-square w-full max-w-2xl relative">
          <EffectBanner events={bannerEvents} />
          <Board
            board={board}
            players={playersList}
            activeId={activeId}
            highlightCaseIndex={highlightCase?.index}
            highlightColor={highlightCase?.color}
          />
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
              state={state}
            />
          )}

          {me && me.inventory.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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

          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Event log
            </h2>
            <EventLog events={state.eventLog} />
          </section>

          <ReactionBar room={room} />
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

      {state.activeModal === 'distribute' && (
        <DistributeModal
          open
          isMyTurn={isMyModal}
          totalSips={state.distributeExpectedSips}
          meId={room.sessionId}
          candidates={playersList}
          onDistribute={(assignments) => {
            room.send('distribute_sips', { assignments });
          }}
        />
      )}

      {state.activeModal === 'distribute_wait' && isMyModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center dark:bg-zinc-800">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              En attente des confirmations...
            </p>
          </div>
        </div>
      )}

      {state.activeModal === 'distribute_wait' && me && me.pendingDrinkConfirm > 0 && (
        <DrinkConfirmModal
          open
          sips={me.pendingDrinkConfirm}
          fromName={activePlayerName}
          fromEmoji={activePlayerEmoji}
          onConfirm={() => room.send('confirm_drink')}
        />
      )}
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
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
      <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">Ordre de jeu</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Chacun lance le dé. Le plus grand commence.
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {rolls.map((r) => (
          <li key={r.id} className="flex items-center justify-between">
            <span className="text-zinc-700 dark:text-zinc-300">{r.name}</span>
            <span className="font-mono text-zinc-500 dark:text-zinc-400">
              {r.rolled ? `🎲 ${r.roll}` : '…en attente'}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onRoll}
        disabled={hasRolled}
        className="mt-4 w-full rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 dark:hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
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
    <div className="sticky bottom-0 z-20 lg:static lg:z-auto bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-700 lg:border-t-0 lg:border-0 lg:bg-transparent lg:dark:bg-transparent px-4 py-3">
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isMyTurn ? `${meName}, à toi !` : `Tour de ${activeName ?? '…'}`}
        </p>
        <div className="mt-3 flex items-center justify-center py-2">
          <Dice3D value={lastDice} rollKey={rollKey} size={96} />
        </div>
        <button
          type="button"
          onClick={onRoll}
          disabled={!isMyTurn}
          className="mt-2 w-full rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 dark:hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isMyTurn ? 'Lancer le dé' : 'Pas ton tour'}
        </button>
      </section>
    </div>
  );
}
