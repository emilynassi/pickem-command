import {
  SlashCommandBuilder,
  CommandInteraction,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import { voteMessages } from '../../utils/votedMessages';
import { votes } from './vote';
import { fetchCurrentGameId } from '../../utils/findGame';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GameBoxScore } from '../../types/boxscore';
import { RangersPlayerStats } from '../../types/boxscore'; // Import your class

dotenv.config();

export const data = new SlashCommandBuilder()
  .setName('checkwinner')
  .setDescription('Announce winners for your over/under TOI prediction.')
  .addStringOption((option) =>
    option
      .setName('toi')
      .setDescription('Enter your TOI prediction')
      .setRequired(true)
  );

function parseTOI(toi: string): number {
  const parts = toi.split(':');
  if (parts.length !== 2) return 0;
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  return minutes * 60 + seconds;
}

export async function execute(interaction: CommandInteraction) {
  // Retrieve the active vote message.
  const channelId = interaction.channelId;
  const messageId = voteMessages.get(channelId);
  if (!messageId) {
    await interaction.reply({
      content: 'No active vote found for this channel.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.channel) {
    await interaction.reply({
      content: 'Channel not found.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Extract the prompt TOI from the vote message.
  const voteMessage = await interaction.channel.messages.fetch(messageId);
  const firstLine = voteMessage.content.split('\n')[0].trim();
  const match = firstLine.match(/vote:\s*(\S+)/i);
  if (!match) {
    await interaction.reply({
      content: 'Could not extract the prompt TOI from the vote message.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const promptTOI = match[1]; // e.g. "9:48"

  // Fetch final game data.
  const gameId = await fetchCurrentGameId();
  if (!gameId) {
    await interaction.reply({
      content: 'Unable to fetch game data.',
      flags: MessageFlags.Ephemeral,
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

  // Create a RangersPlayerStats instance.
  const rangerStats = new RangersPlayerStats(boxData);

  // Search forwards, defense, and goalies arrays for player with sweater number 73.
  let player73 =
    rangerStats.forwards.find((p) => p.sweaterNumber === 73) ||
    rangerStats.defense.find((p) => p.sweaterNumber === 73) ||
    rangerStats.goalies.find((p) => p.sweaterNumber === 73);

  let actualTOI = '';
  if (player73 && player73.toi) {
    actualTOI = player73.toi; // e.g. "8:34"
  }

  if (!actualTOI) {
    await interaction.reply({
      content: 'Could not find the actual TOI for sweater number 73.',
      flags: MessageFlags.Ephemeral,
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
    .setTitle('Winners Announcement')
    .setColor(0x00ff00) // Green border.
    .addFields(
      { name: 'Prompt TOI', value: promptTOI, inline: true },
      { name: 'Actual TOI', value: actualTOI, inline: true },
      {
        name: 'Winners',
        value: winnerNames.length > 0 ? winnerNames.join(', ') : 'No winners',
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export default {
  data,
  execute,
};
