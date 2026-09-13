import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { randomUUID } from 'crypto';

export const voteChoiceEnum = pgEnum('vote_choice', ['over', 'under']);

export const prompts = pgTable('prompts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // Nullable + only-unique-when-present so legacy imports (which predate
  // this column) can coexist with live prompts.
  discordMessageId: text('discord_message_id').unique(),
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id').notNull(),
  playerSweaterNumber: integer('player_sweater_number'),
  playerName: text('player_name').notNull(),
  promptText: text('prompt_text').notNull(),
  gameId: text('game_id'),
  // NHL season id, e.g. 20252026 for the 2025-26 season.
  season: integer('season').notNull(),
  // 1 = preseason, 2 = regular season, 3 = postseason (NHL API convention).
  gameType: integer('game_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: text('created_by').notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
});

export const votes = pgTable(
  'votes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    promptId: text('prompt_id')
      .notNull()
      .references(() => prompts.id),
    userId: text('user_id').notNull(),
    choice: voteChoiceEnum('choice').notNull(),
    votedAt: timestamp('voted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('votes_prompt_user_unique').on(table.promptId, table.userId),
  ]
);

export const results = pgTable('results', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  promptId: text('prompt_id')
    .notNull()
    .unique()
    .references(() => prompts.id),
  actualValue: text('actual_value').notNull(),
  // Null represents a push (predicted value === actual value, no winners).
  winningChoice: voteChoiceEnum('winning_choice'),
  processedAt: timestamp('processed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const winners = pgTable(
  'winners',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    promptId: text('prompt_id')
      .notNull()
      .references(() => prompts.id),
    userId: text('user_id').notNull(),
    wonAt: timestamp('won_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('winners_prompt_user_unique').on(
      table.promptId,
      table.userId
    ),
  ]
);

export type Prompt = typeof prompts.$inferSelect;
