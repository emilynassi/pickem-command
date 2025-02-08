import { SlashCommandBuilder } from 'discord.js';
 import { voteMessages } from '../../utils/votedMessages';
 import { checkApiAndLockVotes } from '../../utils/lockVotes';


module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Vote on a prompt')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('The prompt to vote on')
        .setRequired(true)
    ),
  async execute(interaction: any) {
    const prompt = interaction.options.getString('prompt');
    await interaction.reply({
      content: `Vote: ${prompt}`,
    });

    // Fetch the reply message
    const message = await interaction.fetchReply();

    // Store the message ID
    voteMessages.set(interaction.channelId, message.id);

    // Add reaction emojis for voting
    await message.react('⬆️'); // Thumbs up emoji
    await message.react('⬇️'); // Thumbs down emoji

        setInterval(() => checkApiAndLockVotes(interaction.channel), 60000); // Check every 60 seconds

  },
};