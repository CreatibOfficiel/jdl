import type { Server } from 'colyseus';
import { GameRoom } from './rooms/GameRoom';

export const ROOM_NAME = 'game_room';

export function registerRooms(gameServer: Server): void {
  gameServer.define(ROOM_NAME, GameRoom).filterBy(['code']);
}
