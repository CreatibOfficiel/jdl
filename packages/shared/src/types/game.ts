import type { BoardCase } from './case';

export interface ThirstZone {
  start: number;
  length: number;
}

export interface Board {
  seed: string;
  cases: BoardCase[];
  thirstZone: ThirstZone;
  treasureCases: number[];
}
