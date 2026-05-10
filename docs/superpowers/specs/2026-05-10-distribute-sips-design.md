# Distribute Sips — Target Picker + Recipient Confirmation

## Summary

Replace the current social/off-board `applyDistribute` calls with a server-tracked flow where the distributing player picks specific recipients, splits sips across them, and each recipient confirms they drank via a blocking modal.

## Context

Currently, 4 board cases use `applyDistribute` (red_number outside thirst zone, green_number, card match, blue pill 3-4). This only logs "X distribue N gorgées" — no server tracking of who receives sips, no safety caps, no equivalence, no bromance.

## Decisions

- **Scope:** All 4 `applyDistribute` call sites replaced
- **Self-target:** Not allowed (distributor excluded from candidate list)
- **Min sips per target:** 1
- **Recipient tracking:** Full `applyDrink` pipeline (safety caps, equivalence preferences, bromance ricochet)
- **Recipient UI:** Blocking modal with "J'ai bu" confirmation
- **Auto-confirm:** 30s timeout per recipient to prevent stuck turns

## Flow

```
Distributor lands on distribute case
    → Server sets activeModal='distribute', activeModalPlayerId=distributor
    → Distributor sees player list, assigns sips (total must match expected)
    → Sends distribute_sips { assignments: [{ targetPlayerId, sips }] }
    → Server validates, calls applyDrink on each recipient (full pipeline)
    → Sets activeModal='distribute_wait', sets pendingDrinkConfirm on each recipient
    → Each recipient sees blocking "X t'assigné N gorgées" modal
    → Recipient clicks "J'ai bu" → sends confirm_drink
    → When ALL confirmations cleared → endTurn()
```

`applyDrink` runs immediately on `distribute_sips` (stats accurate, equivalence/bromance fire). Recipient modal is acknowledgment-only.

## Schema Changes

### Player.ts

Add one field:

```typescript
@type('number') pendingDrinkConfirm: number = 0;
```

`> 0` means this player has a "J'ai bu" modal to dismiss. Value = sips assigned (for display).

### GameState.ts

Add one field:
```typescript
@type('number') distributeExpectedSips: number = 0;
```
Set when opening the distribute modal, cleared when modal closes. Used by the frontend to know how many sips to assign.

Reuse existing `activeModal`:
- `'distribute'` — distributor is picking targets
- `'distribute_wait'` — waiting for recipient confirmations

## Server Changes

### New: `cases/distribute.ts`

**`handleDistributeSips(room, client, message)`**
- Receives `{ assignments: Array<{ targetPlayerId: string, sips: number }> }`
- Validates: `activeModal === 'distribute'`, sender is `activeModalPlayerId`
- Validates: each target exists, connected, not self, each sips >= 1, total matches `expectedSips`
- Calls `applyDrink` on each recipient
- Sets `activeModal = 'distribute_wait'` (turn stays blocked via handleRollDice guard)
- Sets `recipient.pendingDrinkConfirm = sips` on each recipient
- Starts 30s auto-confirm timer
- Always transitions to `distribute_wait` (even if soft-cap skips some drinks — the modal is acknowledgment)

**`handleConfirmDrink(room, client)`**
- Validates: `activeModal === 'distribute_wait'`, sender has `pendingDrinkConfirm > 0`
- Sets `sender.pendingDrinkConfirm = 0`
- If no player has `pendingDrinkConfirm > 0` → clear `activeModal`, cancel timer, `endTurn()`

**`startAutoConfirmTimer(room)`**
- `setTimeout(30000)` — clears all remaining `pendingDrinkConfirm`, clears modal, `endTurn()`
- Cancellable when all confirm manually

**Transient room state** (not in Colyseus schema, just JS fields on room instance):
- `distributeExpectedSips: number` — set when modal opens, for validation

### Modify: `effectsResolver.ts`

Replace 4 `applyDistribute` calls with:

```typescript
room.state.activeModal = 'distribute';
room.state.activeModalPlayerId = player.id;
room.distributeExpectedSips = sips;
pushEvent(room.state, {
  playerId: player.id, kind: 'distribute_start',
  text: `🎁 ${player.name} doit distribuer ${sips} gorgée(s)`,
  importance: 'normal',
});
```

Affected lines:
- Line 60: `red_distribute` (red_number outside thirst zone)
- Line 65: `green_distribute` (green_number)
- Line 95: `card_match` (suit card match)
- `pills.ts` line 51: `pill_blue_distribute` (blue pill 3-4)

### Modify: `removePlayer` (in GameRoom.ts)

Add cleanup:
- If leaving player has `pendingDrinkConfirm > 0`, clear it and check if all confirmations done
- If `activeModal === 'distribute_wait'` and no pending confirmations remain → `endTurn()`

### Cleanup

`applyDistribute` function can be removed from `sipsHelper.ts` (no longer called).

## Frontend Changes

### New: `DistributeModal.tsx`

Props:
```typescript
interface DistributeModalProps {
  players: ReadonlyArray<ClientPlayer>;
  totalSips: number; // from transient state or event log parsing
  onDistribute: (assignments: Array<{ targetPlayerId: string; sips: number }>) => void;
}
```

- Shows total sips to assign, remaining counter "Reste: N gorgées"
- List of connected players (excl. self, filtered by `p.connected`)
- Each row: avatar/emoji, name, `-` / count / `+` buttons (count starts at 0, min 1 when > 0)
- "Confirmer" button: enabled only when remaining = 0 and at least 1 target selected
- Sends `room.send('distribute_sips', { assignments })`

### New: `DrinkConfirmModal.tsx`

Props:
```typescript
interface DrinkConfirmModalProps {
  sips: number;
  fromName: string;
  fromEmoji: string;
  onConfirm: () => void;
}
```

- Shows: "{emoji} {name} t'assigné {sips} gorgées"
- Equivalence info if applicable (parsed from sipEvents or pendingDrinkConfirm context)
- Single "J'ai bu" button → sends `room.send('confirm_drink')`
- Subtle text: "Auto-confirmé dans 30s"

### Modify: `GameClient.tsx`

Add to modal switch:

| activeModal | isMyModal | myPlayer.pendingDrinkConfirm > 0 | Otherwise |
|-------------|-----------|----------------------------------|-----------|
| `'distribute'` | `<DistributeModal>` | — | "{name} distribue ses gorgées..." |
| `'distribute_wait'` | "En attente des confirmations..." | `<DrinkConfirmModal>` | (nothing) |

Register handlers in `onJoin`:
- `'distribute_sips'` → handled by DistributeModal internally
- `'confirm_drink'` → `room.send('confirm_drink')`

### Passing `totalSips` to frontend

Read from `GameState.distributeExpectedSips` (added to schema above).

## Edge Cases

| Case | Handling |
|------|----------|
| Only 1 other player | Must receive all sips (auto-selected, still shows modal) |
| Recipient disconnects | `removePlayer` clears their `pendingDrinkConfirm`, checks if all done |
| Distributor disconnects during pick | `removePlayer` clears `activeModal = 'distribute'`, advances turn |
| All recipients soft-capped to 0 | Modal still shown (acknowledgment-only), drinks recorded as skipped by safety system |
| Bromance partner of recipient | Gets `applyDrink` as side effect (bromance ricochet), no separate confirm needed |
| Game ends during distribute_wait | Phase guard in `handleConfirmDrink` and auto-confirm timer |

## Message Types

### Client → Server

| Message | Payload | Handler |
|---------|---------|---------|
| `distribute_sips` | `{ assignments: Array<{ targetPlayerId: string, sips: number }> }` | `handleDistributeSips` |
| `confirm_drink` | `{}` | `handleConfirmDrink` |

### Server → Client

No new server-initiated messages. State changes via Colyseus schema sync:
- `activeModal` changes (`'distribute'` → `'distribute_wait'` → `''`)
- `distributeExpectedSips` (set/cleared)
- `player.pendingDrinkConfirm` (set/cleared per recipient)
