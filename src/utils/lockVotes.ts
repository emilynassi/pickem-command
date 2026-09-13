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

export async function checkApiAndLockVotes(channel: any): Promise<boolean> {
  try {
    // Fetch the current game ID
    const gameId = await fetchCurrentGameId();
    if (!gameId) {
      logger.error('No current game ID found.');
      return false;
    }

    let data: GameBoxScore;

    if (process.env.USE_MOCK_API === 'true') {
      const mockFilePath = path.resolve(__dirname, '../mocks/boxscore.json');
      data = JSON.parse(fs.readFileSync(mockFilePath, 'utf-8'));
    } else {
      const response = await fetch(
        `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`
      );
      data = (await response.json()) as GameBoxScore;
    }

    // Check the condition to lock votes
    if (
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

        // Create Rangers player stats instance to check if the selected player is in the lineup
        const rangerStats = new RangersPlayerStats(data);

        // Look for the selected player across all position groups
        const selectedPlayer = sweaterNumber
          ? findPlayerBySweater(rangerStats, sweaterNumber)
          : null;

        let embed: EmbedBuilder;

        // If player is not in lineup, create a cancellation embed
        if (!selectedPlayer) {
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
        return true;
      }
    }
  } catch (error) {
    logger.error('Failed to check API and lock votes', { error });
    return true;
  }
  return false;
}