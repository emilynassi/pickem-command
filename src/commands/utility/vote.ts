import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ButtonInteraction,
  CommandInteractionOptionResolver,
  MessageFlags,
} from 'discord.js';
import { voteMessages } from '../../utils/votedMessages';
import { checkApiAndLockVotes } from '../../utils/lockVotes';

export const votes = new Map<
  string,
  { upvotes: Set<string>; downvotes: Set<string> }
>();

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote on a prompt')
  .addStringOption((option) =>
    option
      .setName('prompt')
      .setDescription('The prompt to vote on')
      .setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  const prompt = (
    interaction.options as CommandInteractionOptionResolver
  ).getString('prompt');
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('upvote')
      .setLabel('⬆️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('downvote')
      .setLabel('⬇️')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({
    content: `Vote: ${prompt}`,
    components: [row],
  });

  // Fetch the reply message
  const message = await interaction.fetchReply();

  // Store the message ID and initialize vote sets
  voteMessages.set(interaction.channelId, message.id);
  votes.set(message.id, { upvotes: new Set(), downvotes: new Set() });

  // Periodically check the API to lock votes if there
  const intervalId = setInterval(async () => {
    const locked = await checkApiAndLockVotes(interaction.channel);
    if (locked) {
      clearInterval(intervalId); // Stop polling once votes are locked
    }
  }, 600); // Check every 60 seconds
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const messageId = voteMessages.get(interaction.channelId);
  if (!messageId || interaction.message.id !== messageId) return;

  const userId = interaction.user.id;
  const voteData = votes.get(messageId);

  if (voteData) {
    if (interaction.customId === 'upvote') {
      voteData.upvotes.add(userId);
      voteData.downvotes.delete(userId);
    } else if (interaction.customId === 'downvote') {
      voteData.downvotes.add(userId);
      voteData.upvotes.delete(userId);
    }
  }

  await interaction.reply({
    content: 'Your vote has been recorded.',
    flags: MessageFlags.Ephemeral,
  });
}

export default {
  data,
  execute,
  handleButtonInteraction,
};
