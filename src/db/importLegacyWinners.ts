// One-time migration: winners.csv predates DB persistence (it was written by
// the old, reverted Prisma setup and never gets written to by current code -
// see project-refactor-db-roadmap memory). Its promptId column references
// Prompt rows that no longer exist anywhere, so we backfill placeholder
// "legacy import" prompts to satisfy the FK rather than dropping the wins.
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from './client';
import { prompts, winners } from './schema';
import logger from '../utils/logger';

const CSV_PATH = path.resolve(__dirname, '../../winners.csv');

interface LegacyRow {
  id: string;
  promptId: string;
  userId: string;
  wonAt: string;
}

function parseCsv(content: string): LegacyRow[] {
  const [, ...rows] = content.trim().split('\n');
  return rows
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, promptId, userId, wonAt] = line.split(',');
      return { id, promptId, userId, wonAt };
    });
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    logger.info('No winners.csv found, nothing to import.');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf-8'));
  if (rows.length === 0) {
    logger.info('winners.csv is empty, nothing to import.');
    return;
  }

  const legacyPromptIds = [...new Set(rows.map((row) => row.promptId))];

  for (const legacyPromptId of legacyPromptIds) {
    const [existing] = await db
      .select({ id: prompts.id })
      .from(prompts)
      .where(eq(prompts.id, legacyPromptId));
    if (existing) continue;

    const firstRow = rows.find((row) => row.promptId === legacyPromptId);
    const wonAt = new Date(firstRow!.wonAt);

    await db.insert(prompts).values({
      id: legacyPromptId,
      discordMessageId: null,
      channelId: 'legacy-import',
      guildId: 'legacy-import',
      playerSweaterNumber: null,
      playerName: 'Unknown (legacy import)',
      promptText: 'Legacy import from winners.csv',
      gameId: null,
      createdAt: wonAt,
      createdBy: 'legacy-import',
      lockedAt: wonAt,
    });
  }

  await db
    .insert(winners)
    .values(
      rows.map((row) => ({
        id: row.id,
        promptId: row.promptId,
        userId: row.userId,
        wonAt: new Date(row.wonAt),
      }))
    )
    .onConflictDoNothing();

  logger.info(
    `Imported ${rows.length} legacy winner rows across ${legacyPromptIds.length} legacy prompts.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Failed to import legacy winners', { error });
    process.exit(1);
  });
