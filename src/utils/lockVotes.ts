import { voteMessages } from '../utils/votedMessages';
import { votes } from '../commands/utility/vote';
import { GameBoxScore } from '../types/boxscore';
import { fetchCurrentGameId } from './findGame';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { EmbedBuilder } from 'discord.js';

// Load environment variables from .env file
dotenv.config();

export async function checkApiAndLockVotes(channel: any): Promise<boolean> {
  try {
    // Fetch the current game ID
    const gameId = await fetchCurrentGameId();
    if (!gameId) {
      console.error('No current game ID found.');
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

        // Build a formatted embed with a border color.
        const embed = new EmbedBuilder()
          .setTitle('Voting Closed')
          .setDescription('Voting is now closed because the game is live.')
          .setColor(0x0038a8)
          .addFields(
            { name: 'Over', value: upvoters, inline: true },
            { name: 'Under', value: downvoters, inline: true }
          )
          .setFooter({
            text: `Final Vote Count: ${voteData?.upvotes.size ?? 'N/A'} Over, ${
              voteData?.downvotes.size ?? 'N/A'
            } Under`,
          })
          .setTimestamp();

        // Update the original message with the embed and remove buttons.
        await message.edit({
          content: 'Voting Closed',
          embeds: [embed],
          components: [],
        });

        // Optionally, send the embed as a new message in the channel.
        await channel.send({ embeds: [embed] });
        return true;
      }
    }
  } catch (error) {
    console.error('Failed to check API and lock votes:', error);
    return true;
  }
  return false;
}
