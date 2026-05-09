import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  seed: text('seed').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  winnerId: text('winner_id'),
  playerCount: integer('player_count').notNull(),
});

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  totalGames: integer('total_games').notNull().default(0),
  totalWins: integer('total_wins').notNull().default(0),
  totalSipsTaken: integer('total_sips_taken').notNull().default(0),
  totalSipsGiven: integer('total_sips_given').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const gamePlayerStats = sqliteTable(
  'game_player_stats',
  {
    gameId: text('game_id').notNull(),
    playerId: text('player_id').notNull(),
    name: text('name').notNull(),
    sipsTaken: integer('sips_taken').notNull().default(0),
    sipsGiven: integer('sips_given').notNull().default(0),
    shopPurchases: integer('shop_purchases').notNull().default(0),
    diceRolls: integer('dice_rolls').notNull().default(0),
    finishedPosition: integer('finished_position'),
    won: integer('won').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.gameId, t.playerId] }),
  }),
);

export type DbGame = typeof games.$inferSelect;
export type DbPlayer = typeof players.$inferSelect;
export type DbGamePlayerStats = typeof gamePlayerStats.$inferSelect;
