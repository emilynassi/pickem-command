import { REST, Routes } from 'discord.js';
import { config } from './config';
import fs from 'node:fs';
import path from 'node:path';

const token = config.DISCORD_TOKEN;
const clientId = config.DISCORD_CLIENT_ID!;
const guildId = config.GUILD_ID;

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
        console.log(
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
    await loadCommands(); // Ensure that the async function is called here
    console.log(commands);
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    let data: any;
    // Use guild commands in development for instant updates, global commands in production
    if (guildId) {
      console.log(`Deploying to guild: ${guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        {
          body: commands,
        }
      );
    } else {
      console.log('Deploying globally (may take up to 1 hour)');
      data = await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
    }
    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
