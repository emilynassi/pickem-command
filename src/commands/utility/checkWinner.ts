import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { voteMessages } from '../../utils/votedMessages';
import { votes } from './vote';
import { fetchCurrentGameId } from '../../utils/findGame';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GameBoxScore } from '../../types/boxscore';
import { RangersPlayerStats } from '../../types/boxscore';
import { parseTOI } from '../../utils/helpers';
import { votePrompts } from './vote';

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName('checkwinner')
  .setDescription('Announce winners for your over/under TOI prediction.');

export async function execute(interaction: CommandInteraction) {
  // Defer reply immediately since we'll be making API calls
  await interaction.deferReply();

  // Retrieve the active vote message.
  const channelId = interaction.channelId;
  const messageId = voteMessages.get(channelId);
  if (!messageId) {
    await interaction.editReply({
      content: 'No active vote found for this channel.',
    });
    return;
  }

  if (!interaction.channel) {
    await interaction.editReply({
      content: 'Channel not found.',
    });
    return;
  }

  // Extract the prompt TOI from the vote prompt.
  const votePrompt = votePrompts.get(channelId);
  if (!votePrompt) {
    await interaction.editReply({
      content: 'Original vote prompt not found.',
    });
    return;
  }

  // Now votePrompt is directly "9:48", so we can validate it with:
  const match = votePrompt.match(/^(\d{1,2}:\d{2})$/);
  if (!match) {
    await interaction.editReply({
      content: 'The stored TOI is not in the correct format.',
    });
    return;
  }
  const promptTOI = match[1];

  // Fetch final game data.
  const gameId = await fetchCurrentGameId();
  if (!gameId) {
    await interaction.editReply({
      content: 'Unable to fetch game data.',
    });
    return;
  }

  let boxData: GameBoxScore;
  if (process.env.USE_MOCK_API === 'true') {
    const mockFilePath = path.resolve(__dirname, '../../mocks/boxscore.json');
    boxData = JSON.parse(fs.readFileSync(mockFilePath, 'utf-8'));
  } else {
    const res = await fetch(
      `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`
    );
    boxData = (await res.json()) as GameBoxScore;
  }

  //if the game is still live, return
  if (boxData.gameState === 'LIVE') {
    await interaction.editReply({
      content: 'The game is still live. Please try again later.',
    });
    return;
  }

  //if the game state is in the future, return
  if (boxData.gameState === 'FUT') {
    await interaction.editReply({
      content: 'The game has not started yet. Please try again later.',
    });
    return;
  }

  // Create a RangersPlayerStats instance.
  const rangerStats = new RangersPlayerStats(boxData);

  // Search forwards, defense, and goalies arrays for player with sweater number 73.
  let player73 =
    rangerStats.forwards.find((p) => p.sweaterNumber === 73) ||
    rangerStats.defense.find((p) => p.sweaterNumber === 73) ||
    rangerStats.goalies.find((p) => p.sweaterNumber === 73);

  let actualTOI = '';
  if (player73 && player73.toi) {
    actualTOI = player73.toi;
  }

  if (!actualTOI) {
    await interaction.editReply({
      content: 'Could not find the actual TOI for sweater number 73.',
    });
    return;
  }

  // Parse times and determine winners.
  const promptSeconds = parseTOI(promptTOI);
  const actualSeconds = parseTOI(actualTOI);
  let winningSet: Set<string> | undefined;

  if (promptSeconds === actualSeconds) {
    winningSet = undefined;
  } else if (actualSeconds < promptSeconds) {
    // Under wins -> "downvotes" represent Under prediction.
    const voteData = votes.get(messageId);
    if (voteData) {
      winningSet = voteData.downvotes;
    }
  } else {
    // Over wins -> "upvotes" represent Over prediction.
    const voteData = votes.get(messageId);
    if (voteData) {
      winningSet = voteData.upvotes;
    }
  }

  let winnerNames: string[] = [];
  if (winningSet && winningSet.size > 0) {
    winnerNames = await Promise.all(
      Array.from(winningSet).map(async (userId) => {
        try {
          const user = await interaction.client.users.fetch(userId);
          return user.username;
        } catch {
          return userId;
        }
      })
    );
  }

  // Build embed with prompt TOI, actual TOI, and winners.
  const embed = new EmbedBuilder()
    .setTitle('🏒 Game Over/Under TOI Results 🏒')
    .setColor(0x00ff00)
    .addFields(
      { name: 'Prompt TOI', value: promptTOI, inline: true },
      { name: 'Actual TOI', value: actualTOI, inline: true },
      {
        name: 'Winners',
        value: winnerNames.length > 0 ? winnerNames.join(', ') : 'No winners',
      }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export default {
  data,
  execute,
};
