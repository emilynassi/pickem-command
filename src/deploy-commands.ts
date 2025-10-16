import { REST, Routes } from 'discord.js';
import { config } from './config';
import fs from 'node:fs';
import path from 'node:path';
import logger from './utils/logger';

const token = config.DISCORD_TOKEN;
const clientId = config.DISCORD_CLIENT_ID!;

const commands: any[] = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

const loadCommands = async () => {
  for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith('.ts'));

    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = await import(filePath); // This is now inside an async function
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        logger.warn(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }
};

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
  try {
    await loadCommands();
    logger.info('Commands to deploy:', { commands });
    logger.info(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data: any = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
    logger.info(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    logger.error(error);
  }
})();
