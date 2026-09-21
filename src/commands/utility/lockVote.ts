import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { checkApiAndLockVotes } from '../../utils/lockVotes';
import { getLatestPromptForChannel } from '../../db/voteRepository';
import { clearLockInterval } from '../../state/voteState';

export const data = new SlashCommandBuilder()
  .setName('lockvote')
  .setDescription(
    'Manually lock the active vote now, without waiting for the game to go live.'
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (!interaction.channel) {
    await interaction.editReply({ content: 'Channel not found.' });
    return;
  }

  const prompt = await getLatestPromptForChannel(interaction.channelId);
  if (!prompt) {
    await interaction.editReply({
      content: 'No active vote found for this channel.',
    });
    return;
  }
  if (prompt.lockedAt) {
    await interaction.editReply({ content: 'This vote is already locked.' });
    return;
  }

  const result = await checkApiAndLockVotes(interaction.channel, {
    force: true,
  });
  clearLockInterval(interaction.channelId);

  if (result === 'locked') {
    await interaction.editReply({ content: 'Vote locked.' });
  } else {
    await interaction.editReply({
      content:
        'Could not lock the vote - failed to fetch today\'s game data. Check the logs for details.',
    });
  }
}

export default {
  data,
  execute,
};
