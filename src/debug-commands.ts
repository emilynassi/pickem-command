// One-off diagnostic: lists what Discord currently has registered for this
// bot, both globally and (if GUILD_ID is set) for that guild specifically.
// Guild-scoped commands take precedence over global ones with the same
// name in that guild, so a stale guild command can silently shadow a
// freshly-deployed global one - this makes that visible instead of guessed.
import { REST, Routes } from 'discord.js';
import { config } from './config';

const rest = new REST().setToken(config.DISCORD_TOKEN);

function summarize(commands: any[]): string {
  if (commands.length === 0) return '  (none)';
  return commands
    .map((cmd) => {
      const options = (cmd.options ?? [])
        .map((opt: any) => `${opt.name}${opt.autocomplete ? ' [autocomplete]' : ''}`)
        .join(', ');
      return `  /${cmd.name} - options: [${options || 'none'}] (id: ${cmd.id})`;
    })
    .join('\n');
}

(async () => {
  try {
    const globalCommands = (await rest.get(
      Routes.applicationCommands(config.DISCORD_CLIENT_ID)
    )) as any[];
    console.log(`\nGlobal commands (${globalCommands.length}):`);
    console.log(summarize(globalCommands));

    if (config.GUILD_ID) {
      const guildCommands = (await rest.get(
        Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.GUILD_ID)
      )) as any[];
      console.log(`\nGuild commands for GUILD_ID=${config.GUILD_ID} (${guildCommands.length}):`);
      console.log(summarize(guildCommands));
    } else {
      console.log('\nGUILD_ID is not set in this environment - only global commands apply.');
    }

    console.log('\nDone.');
  } catch (error) {
    console.error('Failed to fetch registered commands', error);
    process.exit(1);
  }
})();
