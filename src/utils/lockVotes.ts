import { voteMessages } from '../utils/votedMessages';
import { votes } from '../commands/utility/vote';
import { GameBoxScore, RangersPlayerStats } from '../types/boxscore';
import { fetchCurrentGameId } from './findGame';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { EmbedBuilder } from 'discord.js';
import { votePrompts } from '../commands/utility/vote';
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
      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}: ${response.statusText}`
        );
      }
      data = (await response.json()) as GameBoxScore;
    }

    // Check the condition to lock votes
    if (
      data.gameState === 'LIVE' ||
      data.gameState === 'OFF' ||
      data.gameState === 'FINAL'
    ) {
      const messageId = voteMessages.get(channel.id);
      if (messageId) {
        const message = await channel.messages.fetch(messageId);
        const voteData = votes.get(messageId);
        let upvoters = 'None';
        let downvoters = 'None';
        if (voteData) {
          const upvoterNames = await Promise.all(
            Array.from(voteData.upvotes).map(async (id) => {
              try {
                const user = await channel.client.users.fetch(id);
                return user.username;
              } catch {
                return id;
              }
            })
          );
          const downvoterNames = await Promise.all(
            Array.from(voteData.downvotes).map(async (id) => {
              try {
                const user = await channel.client.users.fetch(id);
                return user.username;
              } catch {
                return id;
              }
            })
          );
          upvoters = upvoterNames.join(', ') || 'None';
          downvoters = downvoterNames.join(', ') || 'None';
        }

        const promptTOI = votePrompts.get(channel.id) || 'N/A';

        // Create Rangers player stats instance to check if player #73 is in the lineup
        const rangerStats = new RangersPlayerStats(data);

        // Look for player #73 across all position groups
        const player73 =
          rangerStats.forwards.find((p) => p.sweaterNumber === 73) ||
          rangerStats.defense.find((p) => p.sweaterNumber === 73) ||
          rangerStats.goalies.find((p) => p.sweaterNumber === 73);

        let embed: EmbedBuilder;

        // If player is not in lineup, create a cancellation embed
        if (!player73) {
          embed = new EmbedBuilder()
            .setTitle('Voting Canceled')
            .setDescription(
              `Vote for predicted TOI: **${promptTOI}** has been canceled because Matt Rempe is not playing today.`
            )
            .setColor(0xff0000)
            .addFields(
              { name: 'Over votes', value: upvoters, inline: true },
              { name: 'Under votes', value: downvoters, inline: true }
            )
            .setFooter({
              text: `Final Vote Count: ${
                voteData?.upvotes.size ?? 'N/A'
              } Over, ${voteData?.downvotes.size ?? 'N/A'} Under`,
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
              text: `Final Vote Count: ${
                voteData?.upvotes.size ?? 'N/A'
              } Over, ${voteData?.downvotes.size ?? 'N/A'} Under`,
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
        return true;
      }
    }
  } catch (error) {
    logger.error('Failed to check API and lock votes', { error });
    return false;
  }
  return false;
}
