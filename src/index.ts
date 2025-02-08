import {
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  MessageFlags,
  CommandInteraction,
  ButtonInteraction,
} from 'discord.js';
import { config } from './config';
import fs from 'node:fs';
import path from 'node:path';
import { handleButtonInteraction } from './commands/utility/vote';

interface ExtendedClient extends Client {
  commands: Collection<
    string,
    { data: any; execute: (interaction: CommandInteraction) => Promise<void> }
  >;
}

const client: ExtendedClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as ExtendedClient;

const token = config.DISCORD_TOKEN;

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.ts'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

client.once(Events.ClientReady, (readyClient: { user: { tag: any } }) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  console.log(`Received interaction: ${interaction.type}`);

  if (interaction.isChatInputCommand()) {
    console.log(`Handling command: ${interaction.commandName}`);

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(
        `Error executing command: ${interaction.commandName}`,
        error
      );
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  } else if (interaction.isButton()) {
    console.log(`Handling button interaction: ${interaction.customId}`);
    try {
      await handleButtonInteraction(interaction);
    } catch (error) {
      console.error(
        `Error handling button interaction: ${interaction.customId}`,
        error
      );
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while handling this interaction!',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: 'There was an error while handling this interaction!',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
});

// Log in to Discord with your client's token
client.login(token);
