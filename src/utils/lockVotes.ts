import {
  getLatestPromptForChannel,
  getVoteCounts,
  lockPrompt,
} from '../db/voteRepository';
import { GameBoxScore, RangersPlayerStats } from '../types/boxscore';
import { fetchCurrentGameId } from './findGame';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { EmbedBuilder } from 'discord.js';
import { resolveUsernames } from './discord';
import { findPlayerBySweater } from './helpers';
import logger from './logger';

// Load environment variables from .env file
dotenv.config();

// 'locked' - the vote was closed out. 'not-live' - checked, game isn't
// live/final yet, still polling. 'error' - couldn't check (no game found,
// fetch failed, etc.) - distinct from 'locked' so callers that report
// success/failure to a user (e.g. a manual lock command) don't tell someone
// "locked" when it actually failed.
export type LockCheckResult = 'locked' | 'not-live' | 'error';

export async function checkApiAndLockVotes(
  channel: any,
  options?: { force?: boolean }
): Promise<LockCheckResult> {
  try {
    // Fetch the current game ID
    const gameId = await fetchCurrentGameId();
    if (!gameId) {
      logger.error('No current game ID found.');
      return 'error';
    }

    let data: GameBoxScore;

    if (process.env.USE_MOCK_API === 'true') {
      const mockFilePath = path.resolve(__dirname, '../mocks/boxscore.json');
      data = JSON.parse(fs.readFileSync(mockFilePath, 'utf-8'));
    } else {
      const boxscoreUrl = `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`;
      logger.info(`Fetching box score from: ${boxscoreUrl}`);
      const response = await fetch(boxscoreUrl);
      data = (await response.json()) as GameBoxScore;
    }

    // Check the condition to lock votes (or bypass it if forced - e.g. a
    // manual /lockvote when the NHL API's gameState is lagging real life)
    if (
      options?.force ||
      data.gameState === 'LIVE' ||
      data.gameState === 'OFF' ||
      data.gameState === 'FINAL'
    ) {
      const prompt = await getLatestPromptForChannel(channel.id);
      if (prompt && prompt.discordMessageId) {
        const message = await channel.messages.fetch(prompt.discordMessageId);
        const voteCounts = await getVoteCounts(prompt.id);
        const upvoters =
          (
            await resolveUsernames(
              channel.client,
              Array.from(voteCounts.upvotes)
            )
          ).join(', ') || 'None';
        const downvoters =
          (
            await resolveUsernames(
              channel.client,
              Array.from(voteCounts.downvotes)
            )
          ).join(', ') || 'None';

        const promptTOI = prompt.promptText || 'N/A';
        const sweaterNumber = prompt.playerSweaterNumber ?? undefined;
        const playerName = prompt.playerName || 'Unknown Player';

        // The NHL API omits playerByGameStats entirely until a game's data
        // is actually populated (which can lag slightly behind gameState
        // itself, or behind a forced manual lock) - without it we can't
        // confirm lineup status either way, so treat "unknown" as "don't
        // cancel" rather than crashing or wrongly canceling real votes.
        const canConfirmLineup = data.playerByGameStats != null;
        const selectedPlayer =
          canConfirmLineup && sweaterNumber
            ? findPlayerBySweater(new RangersPlayerStats(data), sweaterNumber)
            : undefined;

        let embed: EmbedBuilder;

        // Only cancel when we could actually confirm the player isn't playing.
        if (canConfirmLineup && !selectedPlayer) {
          embed = new EmbedBuilder()
            .setTitle('Voting Canceled')
            .setDescription(`Vote for predicted TOI: **${promptTOI}** has been canceled because ${playerName} is not playing today.`)
            .setColor(0xFF0000)
            .addFields(
              { name: 'Over votes', value: upvoters, inline: true },
              { name: 'Under votes', value: downvoters, inline: true }
            )
            .setFooter({
              text: `Final Vote Count: ${voteCounts.upvotes.size} Over, ${voteCounts.downvotes.size} Under`,
            })
            .setTimestamp();

          // Update the original message
          await message.edit({
            content: 'Vote Canceled - Player Not in Lineup',
            embeds: [embed],
            components: [],
          });
        } else {
          // Player is in lineup, proceed with regular vote closing
          embed = new EmbedBuilder()
            .setTitle('Voting Closed')
            .setDescription(`Vote closed for predicted TOI: **${promptTOI}**`)
            .setColor(0x0038a8)
            .addFields(
              { name: 'Over', value: upvoters, inline: true },
              { name: 'Under', value: downvoters, inline: true }
            )
            .setFooter({
              text: `Final Vote Count: ${voteCounts.upvotes.size} Over, ${voteCounts.downvotes.size} Under`,
            })
            .setTimestamp();

          // Update the original message
          await message.edit({
            content: 'Voting Closed',
            embeds: [embed],
            components: [],
          });
        }

        // Send the embed as a new message in the channel
        await channel.send({ embeds: [embed] });
        await lockPrompt(prompt.id);
        return 'locked';
      }
    }
  } catch (error) {
    logger.error('Failed to check API and lock votes', { error });
    return 'error';
  }
  return 'not-live';
}