import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ButtonInteraction,
  AutocompleteInteraction,
  CommandInteractionOptionResolver,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import { checkApiAndLockVotes } from '../../utils/lockVotes';
import { fetchCurrentGameId } from '../../utils/findGame';
import { fetchRangersRoster, formatPlayerLabel } from '../../utils/roster';
import { resolveUsernames } from '../../utils/discord';
import {
  createPrompt,
  getPromptByMessageId,
  getVoteCounts,
  setUserVote,
} from '../../db/voteRepository';
import { setLockInterval, clearLockInterval } from '../../state/voteState';
import logger from '../../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote on a TOI prediction.')
  .addStringOption((option) =>
    option.setName('player').setDescription('Player to predict TOI for').setRequired(true).setAutocomplete(true)
  )
  .addStringOption((option) =>
    option.setName('toi').setDescription('Time on Ice').setRequired(true)
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

  // Return if no game is found.
  const gameId = await fetchCurrentGameId();
  if (!gameId) {
    await interaction.editReply({
      content: 'No game found today.',
    });
    return;
  }

  const options = interaction.options as CommandInteractionOptionResolver;
  const playerValue = options.getString('player') || '';
  const prompt = options.getString('toi') || '';

  // Parse the player selection (format: "sweaterNumber:name")
  const [sweaterStr, playerName] = playerValue.split(':');
  const sweaterNumber = parseInt(sweaterStr, 10);
  if (!sweaterNumber || !playerName) {
    await interaction.editReply({
      content: 'Invalid player selection. Please use the autocomplete dropdown.',
    });
    return;
  }

  // Build an embed for the vote prompt.
  const voteEmbed = new EmbedBuilder()
    .setTitle('🔮 Vote on TOI Prediction 🔮')
    .setDescription(`**${playerName} - ${prompt}**`)
    .addFields(
      { name: '⬆️ Over', value: '0', inline: true },
      { name: '⬇️ Under', value: '0', inline: true }
    )
    .setColor(0x0099ff);

  // Build buttons.
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('upvote')
      .setLabel('⬆️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('downvote')
      .setLabel('⬇️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('showVotes')
      .setLabel('Show Votes')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({
    embeds: [voteEmbed],
    components: [row],
  });

  // Fetch the reply message after sending the reply.
  const message = await interaction.fetchReply();

  await createPrompt({
    discordMessageId: message.id,
    channelId: interaction.channelId,
    guildId: interaction.guildId!,
    playerSweaterNumber: sweaterNumber,
    playerName,
    promptText: prompt,
    gameId: String(gameId),
    createdBy: interaction.user.id,
  });
  logger.info(`Vote prompt set for channel ${interaction.channelId}: ${prompt}`);

  // Periodically check the API to lock votes. Clears any interval already
  // running for this channel so re-running /vote can't start a second one.
  const intervalId = setInterval(async () => {
    const locked = await checkApiAndLockVotes(interaction.channel);
    if (locked) {
      clearLockInterval(interaction.channelId);
    }
  }, 60000);
  setLockInterval(interaction.channelId, intervalId);
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const prompt = await getPromptByMessageId(interaction.message.id);
  if (!prompt) return;

  if (
    interaction.customId === 'upvote' ||
    interaction.customId === 'downvote'
  ) {
    const userId = interaction.user.id;
    const choice = interaction.customId === 'upvote' ? 'over' : 'under';
    const result = await setUserVote(prompt.id, userId, choice);

    // If the user clicked the same vote, inform them.
    if (result === 'unchanged') {
      await interaction.reply({
        content: 'Your vote remains unchanged.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.channel && 'messages' in interaction.channel) {
      const message = await interaction.channel.messages.fetch(
        interaction.message.id
      );
      const voteCounts = await getVoteCounts(prompt.id);

      // Rebuild the embed with updated vote counts.
      let updatedEmbed: EmbedBuilder;
      if (message.embeds.length > 0) {
        updatedEmbed = EmbedBuilder.from(message.embeds[0]);
      } else {
        updatedEmbed = new EmbedBuilder()
          .setTitle('🔮🎰 Vote on TOI Prediction')
          .setColor(0x0099ff);
      }
      updatedEmbed.setFields(
        { name: '⬆️ Over', value: `${voteCounts.upvotes.size}`, inline: true },
        {
          name: '⬇️ Under',
          value: `${voteCounts.downvotes.size}`,
          inline: true,
        }
      );

      // Update the message with the new embed.
      await message.edit({
        embeds: [updatedEmbed],
        components: message.components as any,
      });
    }

    await interaction.reply({
      content: 'Your vote has been recorded.',
      flags: MessageFlags.Ephemeral,
    });
  } else if (interaction.customId === 'showVotes') {
    const voteCounts = await getVoteCounts(prompt.id);

    const upvoterNames = await resolveUsernames(
      interaction.client,
      Array.from(voteCounts.upvotes)
    );
    const downvoterNames = await resolveUsernames(
      interaction.client,
      Array.from(voteCounts.downvotes)
    );

    const response = `**Current Votes**\n⬆️ Over: ${
      upvoterNames.join(', ') || 'None'
    }\n⬇️ Under: ${downvoterNames.join(', ') || 'None'}`;
    await interaction.reply({
      content: response,
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default {
  data,
  execute,
  autocomplete,
  handleButtonInteraction,
};
