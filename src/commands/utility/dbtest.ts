import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '../../lib/prisma';
import { getCurrentEnvironment } from '../../utils/environment';

export const data = new SlashCommandBuilder()
  .setName('dbtest')
  .setDescription('Test database connection and show environment stats');

export async function execute(interaction: CommandInteraction) {
  const environment = getCurrentEnvironment();
  
  try {
    // Test database connection and get stats
    const [promptCount, voteCount, winnerCount, envPromptCount] = await Promise.all([
      prisma.prompt.count(),
      prisma.vote.count(),
      prisma.winner.count(),
      prisma.prompt.count({ where: { environment } }),
    ]);

    // Get recent prompts in current environment
    const recentPrompts = await prisma.prompt.findMany({
      where: { environment },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        votes: true,
        winners: true,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle('🗄️ Database Test Results')
      .setColor(environment === 'test' ? 0xffff00 : environment === 'production' ? 0xff0000 : 0x00ff00)
      .addFields(
        { name: '🔧 Current Environment', value: environment.toUpperCase(), inline: true },
        { name: '📊 Total Prompts', value: promptCount.toString(), inline: true },
        { name: '🗳️ Total Votes', value: voteCount.toString(), inline: true },
        { name: '🏆 Total Winners', value: winnerCount.toString(), inline: true },
        { name: `📊 ${environment.toUpperCase()} Prompts`, value: envPromptCount.toString(), inline: true },
        { name: 'USE_MOCK_API', value: process.env.USE_MOCK_API || 'false', inline: true },
      );

    if (recentPrompts.length > 0) {
      const promptList = recentPrompts.map(p => 
        `• ${p.promptText} (${p.votes.length} votes, ${p.winners.length} winners)`
      ).join('\n');
      embed.addFields({ 
        name: `Recent ${environment.toUpperCase()} Prompts`, 
        value: promptList || 'None', 
        inline: false 
      });
    }

    embed.setFooter({ text: '✅ Database connection successful' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Database test error:', error);
    await interaction.reply({
      content: `❌ Database test failed in ${environment.toUpperCase()} environment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ephemeral: true,
    });
  }
}

export default {
  data,
  execute,
};