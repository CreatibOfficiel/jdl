import { Schema, type } from '@colyseus/schema';

export class SipEvent extends Schema {
  @type('number') ts: number = 0;
  @type('string') fromId: string = '';
  @type('string') toId: string = '';
  @type('number') count: number = 0;
  @type('string') source: string = '';
  @type('string') equivalence: string = '';
}
