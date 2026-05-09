import { Schema, type } from '@colyseus/schema';

export class BoardCaseSchema extends Schema {
  @type('number') index: number = 0;
  @type('string') caseType: string = 'neutral';
  @type('number') numberValue: number = 0;
  @type('number') portalPairId: number = -1;
}
