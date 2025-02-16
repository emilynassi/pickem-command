import {
  SlashCommandBuilder,
  CommandInteraction,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';

import { fetchCurrentGameId, fetchBoxScore } from '../../utils/findGame';
import { RangersPlayerStats } from '../../types/boxscore';

//Check current TOI for Rempe (sweaterNumber 73)
export const data = new SlashCommandBuilder()
  .setName('checkcurrenttoi')
  .setDescription('Check current TOI for Rempe (sweaterNumber 73)');

export async function execute(interaction: CommandInteraction) {
  //return if no game is found today (there will be no current game id)
  const gameId = await fetchCurrentGameId();
  if (!gameId) {
    await interaction.reply({
      content: 'No game found today.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Fetch the box score data
  const boxScore = await fetchBoxScore(gameId);
  if (!boxScore) {
    await interaction.reply({
      content: 'No box score data found for this game.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const rangerStats = new RangersPlayerStats(boxScore);

  // Find Rempe's stats
  let player73 =
    rangerStats.forwards.find((p) => p.sweaterNumber === 73) ||
    rangerStats.defense.find((p) => p.sweaterNumber === 73);

  if (!player73) {
    await interaction.reply({
      content: 'Rempe not found in the box score.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Create an embed message with Rempe's TOI
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Current TOI for Rempe')
    .addFields([
      {
        name: 'Time on Ice',
        value: player73.toi,
        inline: true,
      },
      {
        name: 'Shifts',
        value: player73.shifts.toString(),
        inline: true,
      },
    ]);

  await interaction.reply({ embeds: [embed] });
}
