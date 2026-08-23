import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ComponentType,
} from 'discord.js';
import { resolveUsernames } from '../../utils/discord';
import { getWinCounts } from '../../db/voteRepository';

export const data = new SlashCommandBuilder()
  .setName('compileleaderboard')
  .setDescription('Compile the leaderboard for the current season');

export async function execute(interaction: ChatInputCommandInteraction) {
  // Defer reply since we'll be making API calls
  await interaction.deferReply();

  try {
    // Read wins data from the database, sorted by win count descending.
    const winCounts = await getWinCounts();
    const sortedUsers: [string, number][] = winCounts.map(
      ({ userId, wins }) => [userId, wins]
    );

    if (sortedUsers.length === 0) {
      await interaction.editReply({
        content: 'No wins recorded yet for this season.',
      });
      return;
    }

    // Fetch usernames from Discord
    const usernames = await resolveUsernames(
      interaction.client,
      sortedUsers.map(([userId]) => userId),
      (id) => `<@${id}>`
    );
    const leaderboardEntries = sortedUsers.map(([, wins], index) => {
      return `${index + 1}. ${usernames[index]} - **${wins}** ${
        wins === 1 ? 'win' : 'wins'
      }`;
    });

    // Pagination settings
    const ENTRIES_PER_PAGE = 10;
    const totalPages = Math.ceil(leaderboardEntries.length / ENTRIES_PER_PAGE);
    let currentPage = 0;

    const generateEmbed = (page: number) => {
      const start = page * ENTRIES_PER_PAGE;
      const end = start + ENTRIES_PER_PAGE;
      const pageEntries = leaderboardEntries.slice(start, end);

      return new EmbedBuilder()
        .setTitle('🏆 Season Leaderboard 🏆')
        .setDescription(pageEntries.join('\n'))
        .setColor(0xffd700)
        .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
        .setTimestamp();
    };

    const generateButtons = (page: number) => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('leaderboard_prev')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('leaderboard_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1)
      );
    };

    const embed = generateEmbed(currentPage);
    const buttons = totalPages > 1 ? generateButtons(currentPage) : null;

    const message = await interaction.editReply({
      embeds: [embed],
      components: buttons ? [buttons] : [],
    });

    // Only set up collector if there are multiple pages
    if (totalPages > 1) {
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minutes
      });

      collector.on('collect', async (i: ButtonInteraction) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content:
              'Only the person who ran the command can navigate the leaderboard.',
            ephemeral: true,
          });
          return;
        }

        if (i.customId === 'leaderboard_prev') {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === 'leaderboard_next') {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
        }

        const newEmbed = generateEmbed(currentPage);
        const newButtons = generateButtons(currentPage);

        await i.update({
          embeds: [newEmbed],
          components: [newButtons],
        });
      });

      collector.on('end', async () => {
        try {
          await interaction.editReply({ components: [] });
        } catch {
          // Message might be deleted, ignore error
        }
      });
    }
  } catch (error) {
    console.error('Error compiling leaderboard:', error);
    await interaction.editReply({
      content: 'An error occurred while compiling the leaderboard.',
    });
  }
}

export default {
  data,
  execute,
};
