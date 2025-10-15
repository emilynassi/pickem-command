import {
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  MessageFlags,
  CommandInteraction,
} from 'discord.js';
import { config } from './config';
import fs from 'node:fs';
import path from 'node:path';
import voteCommand from './commands/utility/vote';
import logger from './utils/logger';
import { logEnvironment } from './utils/environment';
import { tracer } from './tracer';
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from '@prisma/instrumentation';

interface ExtendedClient extends Client {
  commands: Collection<
    string,
    { data: any; execute: (interaction: CommandInteraction) => Promise<void> }
  >;
}

const provider = new tracer.TracerProvider();

registerInstrumentations({
  instrumentations: [new PrismaInstrumentation()],
  tracerProvider: provider,
});

provider.register();

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.info(`Loaded command: ${command.data.name}`);
    } else {
      logger.warn(
        `The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

client.once(Events.ClientReady, (readyClient: { user: { tag: any } }) => {
  logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
  logEnvironment();
});

client.on(Events.InteractionCreate, async (interaction) => {
  logger.info(`Received interaction: ${interaction.type}`);

  if (interaction.isChatInputCommand()) {
    logger.info(`Handling command: ${interaction.commandName}`);

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command: ${interaction.commandName}`, {
        error,
      });
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
    logger.info(`Handling button interaction: ${interaction.customId}`);
    try {
      await voteCommand.handleButtonInteraction(interaction);
    } catch (error) {
      logger.error('Error handling button interaction', { error });
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
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'showVotesModal') {
      await interaction.reply({
        content: 'Vote details shown above.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// Log in to Discord with your client's token
client.login(token);
