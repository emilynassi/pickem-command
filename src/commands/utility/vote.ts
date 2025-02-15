import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ButtonInteraction,
  CommandInteractionOptionResolver,
  MessageFlags,
  TextChannel,
} from 'discord.js';
import { voteMessages } from '../../utils/votedMessages';
import { checkApiAndLockVotes } from '../../utils/lockVotes';

export const votes = new Map<
  string,
  { upvotes: Set<string>; downvotes: Set<string> }
>();

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote on a TOI')
  .addStringOption((option) =>
    option.setName('toi').setDescription('Time on Ice').setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  const options = interaction.options as CommandInteractionOptionResolver;
  const prompt = options.getString('toi') || '';
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

  await interaction.reply({
    content: `Vote: ${prompt}\n\n⬆️ Over: 0\n⬇️ Under: 0`,
    components: [row],
  });

  // Fetch the reply message and initialize vote tracking.
  const message = await interaction.fetchReply();
  voteMessages.set(interaction.channelId, message.id);
  votes.set(message.id, { upvotes: new Set(), downvotes: new Set() });

  // Periodically check the API to lock votes if needed.
  const intervalId = setInterval(async () => {
    const locked = await checkApiAndLockVotes(interaction.channel);
    if (locked) {
      clearInterval(intervalId);
    }
  }, 60000);
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const channelId = interaction.channelId;
  const messageId = voteMessages.get(channelId);
  if (!messageId || interaction.message.id !== messageId) return;

  const voteData = votes.get(messageId);

  if (
    interaction.customId === 'upvote' ||
    interaction.customId === 'downvote'
  ) {
    const userId = interaction.user.id;
    if (voteData) {
      if (interaction.customId === 'upvote') {
        voteData.upvotes.add(userId);
        voteData.downvotes.delete(userId);
      } else if (interaction.customId === 'downvote') {
        voteData.downvotes.add(userId);
        voteData.upvotes.delete(userId);
      }

      if (!interaction.channel || !(interaction.channel instanceof TextChannel))
        return;
      const message = await interaction.channel.messages.fetch(messageId);

      // Extract the prompt (first line)
      const [promptLine] = message.content.split('\n');
      await message.edit({
        content: `${promptLine}\n\n⬆️ Over: ${voteData.upvotes.size}\n⬇️ Under: ${voteData.downvotes.size}`,
        components: message.components as any,
      });
    }

    await interaction.reply({
      content: 'Your vote has been recorded.',
      flags: MessageFlags.Ephemeral,
    });
  } else if (interaction.customId === 'showVotes') {
    if (!voteData) return;

    const upvoterNames = await Promise.all(
      Array.from(voteData.upvotes).map(async (id) => {
        try {
          const user = await interaction.client.users.fetch(id);
          return user.username;
        } catch {
          return id;
        }
      })
    );
    const downvoterNames = await Promise.all(
      Array.from(voteData.downvotes).map(async (id) => {
        try {
          const user = await interaction.client.users.fetch(id);
          return user.username;
        } catch {
          return id;
        }
      })
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
  handleButtonInteraction,
};
