import { Schema, type } from '@colyseus/schema';

export class GameEvent extends Schema {
  @type('string') id: string = '';
  @type('number') timestamp: number = 0;
  @type('string') playerId: string = '';
  @type('string') kind: string = '';
  @type('string') text: string = '';
  @type('string') importance: string = 'normal';
}
