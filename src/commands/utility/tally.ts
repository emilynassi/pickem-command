import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { voteMessages } from '../../utils/votedMessages';
import { votes } from './vote';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tally')
    .setDescription('Tally the votes for the last vote'),
  async execute(interaction: CommandInteraction) {
    const messageId = voteMessages.get(interaction.channelId);
    if (!messageId) {
      return interaction.reply('No vote found in this channel.');
    }

    const voteData = votes.get(messageId);
    if (!voteData) {
      return interaction.reply('No vote data found for the message.');
    }

    // Fetch user objects for upvotes
    const upVoters = await Promise.all(
      Array.from(voteData.upvotes).map(async (userId) => {
        const user = await interaction.client.users.fetch(userId);
        return user.username;
      })
    );

    // Fetch user objects for downvotes
    const downVoters = await Promise.all(
      Array.from(voteData.downvotes).map(async (userId) => {
        const user = await interaction.client.users.fetch(userId);
        return user.username;
      })
    );

    const upVoterNames = upVoters.join(', ');
    const downVoterNames = downVoters.join(', ');

    await interaction.reply(
      `Over: ${voteData.upvotes.size} (${upVoterNames})\Under: ${voteData.downvotes.size} (${downVoterNames})`
    );
  },
};
