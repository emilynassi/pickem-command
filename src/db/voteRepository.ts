import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './client';
import { Prompt, prompts, results, votes, winners } from './schema';

export type VoteChoice = 'over' | 'under';

export interface CreatePromptParams {
  discordMessageId: string;
  channelId: string;
  guildId: string;
  playerSweaterNumber: number;
  playerName: string;
  promptText: string;
  gameId: string | null;
  createdBy: string;
}

export async function createPrompt(params: CreatePromptParams): Promise<Prompt> {
  const [prompt] = await db.insert(prompts).values(params).returning();
  return prompt;
}

export async function getPromptByMessageId(
  discordMessageId: string
): Promise<Prompt | undefined> {
  const [prompt] = await db
    .select()
    .from(prompts)
    .where(eq(prompts.discordMessageId, discordMessageId));
  return prompt;
}

// A channel has at most one vote in flight at a time (Phase 1 enforced this
// for the lock-polling interval), so "latest by channel" is unambiguous and
// stays correct through locking.
export async function getLatestPromptForChannel(
  channelId: string
): Promise<Prompt | undefined> {
  const [prompt] = await db
    .select()
    .from(prompts)
    .where(eq(prompts.channelId, channelId))
    .orderBy(desc(prompts.createdAt))
    .limit(1);
  return prompt;
}

export async function lockPrompt(promptId: string): Promise<void> {
  await db
    .update(prompts)
    .set({ lockedAt: new Date() })
    .where(eq(prompts.id, promptId));
}

// Upserts the user's vote and reports whether it actually changed, so
// callers can reproduce the old "your vote remains unchanged" behavior.
export async function setUserVote(
  promptId: string,
  userId: string,
  choice: VoteChoice
): Promise<'recorded' | 'unchanged'> {
  const [existing] = await db
    .select({ choice: votes.choice })
    .from(votes)
    .where(and(eq(votes.promptId, promptId), eq(votes.userId, userId)));

  if (existing?.choice === choice) {
    return 'unchanged';
  }

  await db
    .insert(votes)
    .values({ promptId, userId, choice })
    .onConflictDoUpdate({
      target: [votes.promptId, votes.userId],
      set: { choice },
    });

  return 'recorded';
}

export async function getVoteCounts(
  promptId: string
): Promise<{ upvotes: Set<string>; downvotes: Set<string> }> {
  const rows = await db
    .select({ userId: votes.userId, choice: votes.choice })
    .from(votes)
    .where(eq(votes.promptId, promptId));

  const upvotes = new Set<string>();
  const downvotes = new Set<string>();
  for (const row of rows) {
    (row.choice === 'over' ? upvotes : downvotes).add(row.userId);
  }
  return { upvotes, downvotes };
}

export async function recordResult(
  promptId: string,
  actualValue: string,
  winningChoice: VoteChoice | null
): Promise<void> {
  await db
    .insert(results)
    .values({ promptId, actualValue, winningChoice })
    .onConflictDoUpdate({
      target: results.promptId,
      set: { actualValue, winningChoice },
    });
}

// Safe to call more than once for the same prompt (e.g. re-running
// /checkwinner) since duplicate (promptId, userId) rows are dropped.
export async function recordWinners(
  promptId: string,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;
  await db
    .insert(winners)
    .values(userIds.map((userId) => ({ promptId, userId })))
    .onConflictDoNothing();
}

export async function getWinCounts(): Promise<
  { userId: string; wins: number }[]
> {
  return db
    .select({ userId: winners.userId, wins: sql<number>`count(*)::int` })
    .from(winners)
    .groupBy(winners.userId)
    .orderBy(desc(sql`count(*)`));
}
