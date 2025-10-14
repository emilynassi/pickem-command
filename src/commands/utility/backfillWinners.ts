import {
  SlashCommandBuilder,
  CommandInteraction,
  CommandInteractionOptionResolver,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '../../lib/prisma';
import { getCurrentEnvironment } from '../../utils/environment';
import { parseTOI } from '../../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('backfillwinners')
  .setDescription('Backfill winners for a specific date when the flow broke.')
  .addStringOption((option) =>
    option
      .setName('date')
      .setDescription('Date of the game (YYYY-MM-DD)')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('prompt_toi')
      .setDescription('The TOI from the original prompt (e.g., 9:48)')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('actual_toi')
      .setDescription('The actual TOI from the game (e.g., 10:15)')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('manual_winners')
      .setDescription(
        'Optional: Comma-separated usernames of winners (e.g., user1,user2). If omitted, calculates from database.'
      )
      .setRequired(false)
  );

export async function execute(interaction: CommandInteraction) {
  const options = interaction.options as CommandInteractionOptionResolver;
  const dateStr = options.getString('date') || '';
  const promptTOI = options.getString('prompt_toi') || '';
  const actualTOI = options.getString('actual_toi') || '';
  const manualWinners = options.getString('manual_winners');

  // Validate date format
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    await interaction.reply({
      content: 'Invalid date format. Please use YYYY-MM-DD (e.g., 2025-01-15)',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Validate TOI formats
  const promptMatch = promptTOI.match(/^(\d{1,2}:\d{2})$/);
  const actualMatch = actualTOI.match(/^(\d{1,2}:\d{2})$/);
  if (!promptMatch || !actualMatch) {
    await interaction.reply({
      content: 'Invalid TOI format. Please use MM:SS (e.g., 9:48)',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Parse the date
  const [year, month, day] = dateStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, day, 0, 0, 0);
  const endDate = new Date(year, month - 1, day, 23, 59, 59);

  const environment = getCurrentEnvironment();

  try {
    // Find prompts for that date and environment
    const prompts = await prisma.prompt.findMany({
      where: {
        gameDate: {
          gte: startDate,
          lte: endDate,
        },
        environment: environment,
        promptType: 'player_toi',
      },
      include: {
        votes: true,
        results: true,
        winners: true,
      },
    });

    if (prompts.length === 0) {
      await interaction.reply({
        content: `No prompts found for ${dateStr} in ${environment} environment.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Filter prompts that match the prompt TOI and don't have results yet
    const matchingPrompts = prompts.filter(
      (p: { promptText: string | string[]; results: any }) =>
        p.promptText.includes(promptTOI) && !p.results
    );

    if (matchingPrompts.length === 0) {
      await interaction.reply({
        content: `No matching prompts found for TOI "${promptTOI}" on ${dateStr} that need backfilling.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (matchingPrompts.length > 1) {
      await interaction.reply({
        content: `Found ${matchingPrompts.length} matching prompts. Please be more specific or contact an admin.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const prompt = matchingPrompts[0];

    // Parse TOI values to determine winners
    const promptSeconds = parseTOI(promptTOI);
    const actualSeconds = parseTOI(actualTOI);

    let winningChoice: string = '';
    let winningVoters: string[] = [];

    // Determine winning choice based on TOI comparison
    if (promptSeconds === actualSeconds) {
      winningChoice = 'push';
    } else if (actualSeconds < promptSeconds) {
      winningChoice = 'under';
    } else {
      winningChoice = 'over';
    }

    // Handle manual winners if provided
    if (manualWinners) {
      const winnerUsernames = manualWinners
        .split(',')
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      if (winnerUsernames.length > 0) {
        // Convert usernames to userIds
        const userIds: string[] = [];
        const notFoundUsernames: string[] = [];

        for (const username of winnerUsernames) {
          try {
            // Try to find the user in the guild members
            const guild = interaction.guild;
            if (guild) {
              const members = await guild.members.fetch();
              const member = members.find(
                (m) =>
                  m.user.username.toLowerCase() === username.toLowerCase() ||
                  m.user.tag.toLowerCase() === username.toLowerCase()
              );

              if (member) {
                userIds.push(member.user.id);
              } else {
                notFoundUsernames.push(username);
              }
            } else {
              notFoundUsernames.push(username);
            }
          } catch (error) {
            console.error(`Error finding user ${username}:`, error);
            notFoundUsernames.push(username);
          }
        }

        if (notFoundUsernames.length > 0) {
          await interaction.reply({
            content: `Could not find the following users: ${notFoundUsernames.join(
              ', '
            )}. Please check the usernames and try again.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        winningVoters = userIds;
        console.log(
          `✅ [${environment.toUpperCase()}] Using manual winners: ${winnerUsernames.join(
            ', '
          )}`
        );
      }
    } else {
      // Calculate winners from database votes (original behavior)
      if (winningChoice === 'under') {
        winningVoters = prompt.votes
          .filter((v: { voteChoice: string }) => v.voteChoice === 'under')
          .map((v: { userId: any }) => v.userId);
      } else if (winningChoice === 'over') {
        winningVoters = prompt.votes
          .filter((v: { voteChoice: string }) => v.voteChoice === 'over')
          .map((v: { userId: any }) => v.userId);
      }
    }

    // Save result to database
    await prisma.result.create({
      data: {
        promptId: prompt.id,
        resultData: {
          promptTOI: promptTOI,
          actualTOI: actualTOI,
          promptSeconds: promptSeconds,
          actualSeconds: actualSeconds,
          backfilled: true,
          backfilledAt: new Date().toISOString(),
          backfilledBy: interaction.user.id,
          manualWinners: manualWinners ? true : false,
        },
        winningChoice: winningChoice,
      },
    });
    console.log(
      `✅ [${environment.toUpperCase()}] Backfilled result: ${actualTOI} (${winningChoice} wins)`
    );

    // Save winners to database
    if (winningVoters.length > 0) {
      const winnerRecords = winningVoters.map((userId) => ({
        promptId: prompt.id,
        userId: userId,
      }));

      await prisma.winner.createMany({
        data: winnerRecords,
      });
      console.log(
        `✅ [${environment.toUpperCase()}] Backfilled ${
          winningVoters.length
        } winners`
      );
    }

    // Update prompt as locked
    await prisma.prompt.update({
      where: { id: prompt.id },
      data: { lockedAt: new Date() },
    });

    // Fetch winner usernames for display
    let winnerNames: string[] = [];
    if (winningVoters.length > 0) {
      winnerNames = await Promise.all(
        winningVoters.map(async (userId) => {
          try {
            const user = await interaction.client.users.fetch(userId);
            return user.username;
          } catch {
            return userId;
          }
        })
      );
    }

    // Build success embed
    const embedFields = [
      { name: 'Date', value: dateStr, inline: true },
      { name: 'Prompt TOI', value: promptTOI, inline: true },
      { name: 'Actual TOI', value: actualTOI, inline: true },
      { name: 'Result', value: winningChoice.toUpperCase(), inline: false },
      {
        name: 'Winners',
        value:
          winnerNames.length > 0 ? winnerNames.join(', ') : 'No winners (push)',
      },
    ];

    if (!manualWinners) {
      embedFields.push({
        name: 'Total Votes',
        value: `${prompt.votes.length} (${
          prompt.votes.filter(
            (v: { voteChoice: string }) => v.voteChoice === 'over'
          ).length
        } over, ${
          prompt.votes.filter(
            (v: { voteChoice: string }) => v.voteChoice === 'under'
          ).length
        } under)`,
      });
    } else {
      embedFields.push({
        name: 'Source',
        value: 'Manual winners (specified via command)',
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Winners Backfilled Successfully')
      .setColor(0x00ff00)
      .addFields(embedFields)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error(
      `❌ [${environment.toUpperCase()}] Error backfilling winners:`,
      error
    );
    await interaction.reply({
      content: `Error backfilling winners: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

export default {
  data,
  execute,
};
