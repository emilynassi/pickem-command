import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  AutocompleteInteraction,
  EmbedBuilder,
} from 'discord.js';

import { fetchCurrentGameId, fetchBoxScore } from '../../utils/findGame';
import { RangersPlayerStats } from '../../types/boxscore';
import { fetchRangersRoster, formatPlayerLabel } from '../../utils/roster';
import { findPlayerBySweater } from '../../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('checkcurrenttoi')
  .setDescription('Check current TOI for a Rangers player.')
  .addStringOption((option) =>
    option.setName('player').setDescription('Player to check').setRequired(true).setAutocomplete(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();
  const roster = await fetchRangersRoster();

  const choices = roster
    .filter((player) =>
      formatPlayerLabel(player).toLowerCase().includes(focusedValue)
    )
    .slice(0, 25)
    .map((player) => ({
      name: formatPlayerLabel(player),
      value: `${player.sweaterNumber}:${player.firstName.default} ${player.lastName.default}`,
    }));

  await interaction.respond(choices);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  // Defer reply immediately since we'll be making API calls
  await interaction.deferReply();

  const options = interaction.options as CommandInteractionOptionResolver;
  const playerValue = options.getString('player') || '';
  const [sweaterStr, playerName] = playerValue.split(':');
  const sweaterNumber = parseInt(sweaterStr, 10);
  if (!sweaterNumber || !playerName) {
    await interaction.editReply({
      content: 'Invalid player selection. Please use the autocomplete dropdown.',
    });
    return;
  }

  //return if no game is found today (there will be no current game id)
  const gameId = await fetchCurrentGameId();
  if (!gameId) {
    await interaction.editReply({
      content: 'No game found today.',
    });
    return;
  }

  // Fetch the box score data
  const boxScore = await fetchBoxScore(gameId);
  if (!boxScore) {
    await interaction.editReply({
      content: 'No box score data found for this game.',
    });
    return;
  }

  const rangerStats = new RangersPlayerStats(boxScore);

  // Find the selected player's stats
  const player = findPlayerBySweater(rangerStats, sweaterNumber);

  if (!player) {
    await interaction.editReply({
      content: `${playerName} not found in the box score.`,
    });
    return;
  }

  // Create an embed message with the player's TOI
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Current TOI for ${playerName}`)
    .addFields([
      {
        name: 'Time on Ice',
        value: player.toi,
        inline: true,
      },
      {
        name: 'Shifts',
        value: 'shifts' in player ? player.shifts.toString() : 'N/A',
        inline: true,
      },
    ]);

  await interaction.editReply({ embeds: [embed] });
}
