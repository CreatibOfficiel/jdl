export type ClientToServerMessage =
  | { type: 'start_game' }
  | { type: 'roll_order_dice' }
  | { type: 'roll_dice' };

export type ServerToClientMessage =
  | { type: 'error'; payload: { code: number; message: string } }
  | { type: 'event'; payload: { kind: string; data: unknown } };
