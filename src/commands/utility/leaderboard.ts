import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { prisma } from '../../lib/prisma';
import { getCurrentEnvironment } from '../../utils/environment';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Show the current season leaderboard for regular season games')
  .addBooleanOption((option) =>
    option
      .setName('preseason')
      .setDescription('Include preseason games in leaderboard (default: regular season only)')
      .setRequired(false)
  );

// Helper function to get current season from the API
async function getCurrentSeason(): Promise<number | null> {
  try {
    const response = await fetch('https://api-web.nhle.com/v1/club-schedule-season/NYR/now');
    const data = await response.json();
    
    // The API returns current season info - extract the current season
    if (data.currentSeason) {
      return parseInt(data.currentSeason);
    }
    
    // Fallback - look for any recent season in the data
    if (data.games && data.games.length > 0) {
      return data.games[0].season;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching current season:', error);
    return null;
  }
}

export async function execute(interaction: CommandInteraction) {
  const environment = getCurrentEnvironment();
  const includePreseason = interaction.options.get('preseason')?.value as boolean ?? false;
  const gameTypeFilter = includePreseason ? undefined : 2; // 2 = regular season only
  
  try {
    // Get current season
    const currentSeason = await getCurrentSeason();
    if (!currentSeason) {
      await interaction.reply({
        content: 'Unable to determine current season.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Build the where clause
    const whereClause: any = {
      guildId: interaction.guildId || '',
      environment: environment,
      season: currentSeason,
      lockedAt: { not: null }, // Only count finished games
    };

    // Add game type filter if not including preseason
    if (gameTypeFilter) {
      whereClause.gameType = gameTypeFilter;
    }

    // Query the database for winners with their prompt details
    const winners = await prisma.winner.findMany({
      include: {
        prompt: true,
      },
      where: {
        prompt: whereClause,
      },
    });

    // Group by userId and count wins
    const leaderboard = new Map<string, number>();
    winners.forEach((winner) => {
      const currentWins = leaderboard.get(winner.userId) || 0;
      leaderboard.set(winner.userId, currentWins + 1);
    });

    // Sort by wins (descending)
    const sortedLeaderboard = Array.from(leaderboard.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10

    if (sortedLeaderboard.length === 0) {
      await interaction.reply({
        content: `No leaderboard data available for ${currentSeason} season${gameTypeFilter ? ' (regular season games only)' : ''}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Build the embed
    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${currentSeason} Season Leaderboard 🏆`)
      .setDescription(gameTypeFilter ? 'Regular season games only' : 'Including preseason games')
      .setColor(0x0099ff)
      .setTimestamp();

    // Get usernames for the top players
    let leaderboardText = '';
    for (let i = 0; i < sortedLeaderboard.length; i++) {
      const [userId, wins] = sortedLeaderboard[i];
      let username = userId;
      
      try {
        const user = await interaction.client.users.fetch(userId);
        username = user.username;
      } catch {
        // Keep the userId if we can't fetch the username
      }

      const rank = i + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      leaderboardText += `${medal} **${username}** - ${wins} win${wins === 1 ? '' : 's'}\n`;
    }

    embed.addFields({ name: 'Top Players', value: leaderboardText });

    // Add some stats
    const totalGames = await prisma.prompt.count({
      where: whereClause,
    });

    const totalVotes = await prisma.vote.count({
      where: {
        prompt: whereClause,
      },
    });

    embed.addFields(
      { name: 'Season Stats', value: `**${totalGames}** games completed\n**${totalVotes}** total votes cast`, inline: true }
    );

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error(`❌ [${environment.toUpperCase()}] Error fetching leaderboard:`, error);
    await interaction.reply({
      content: 'Sorry, there was an error fetching the leaderboard.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default {
  data,
  execute,
};