import { SlashCommandBuilder } from 'discord.js';
import type { User } from 'discord.js';
 import { voteMessages } from '../../utils/votedMessages';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tally')
    .setDescription('Tally the votes for the last vote'),
  async execute(interaction: any) {
    const messageId = voteMessages.get(interaction.channelId);
    if (!messageId) {
      return interaction.reply('No vote found in this channel.');
    }

    const message = await interaction.channel.messages.fetch(messageId);
    const reactions = message.reactions.cache;

    const upVotes = reactions.get('⬆️');
    const downVotes = reactions.get('⬇️');

    //find the users who reacted, and filter out the bot user
    const upVoters = upVotes ? await upVotes.users.fetch() : [];

    const downVoters = downVotes ? await downVotes.users.fetch() : [];

    /// Filter out the bot user from the upVoterNames
    const upVoterNames = upVoters
      .filter((user: User) => !user.bot)
      .map((user: User) => user.username)
      .join(', ');
    /// Filter out the bot user from the downVoterNames
    const downVoterNames = downVoters
      .filter((user: User) => !user.bot)
      .map((user: User) => user.username)
      .join(', ');


    await interaction.reply(`Upvotes: ${upVoters.size - 1} (${upVoterNames})\nDownvotes: ${downVoters.size - 1} (${downVoterNames})`);
  },
};