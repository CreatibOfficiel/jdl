import type { Board, BoardCase, CaseType } from '@jeu-soiree/shared';
import type { ClientGameState } from '@/types/colyseus';

export function colyseusStateToBoard(state: ClientGameState): Board {
  const cases: BoardCase[] = [];
  state.board.forEach((c) => {
    const entry: BoardCase = {
      index: c.index,
      type: c.caseType as CaseType,
    };
    if (c.numberValue > 0) entry.numberValue = c.numberValue;
    if (c.portalPairId >= 0) entry.portalPairId = c.portalPairId;
    cases.push(entry);
  });
  cases.sort((a, b) => a.index - b.index);
  return {
    seed: state.boardSeed,
    cases,
    thirstZone: { start: state.thirstZoneStart, length: state.thirstZoneLength },
    treasureCases: [],
  };
}
