import { SlashCommandBuilder, type CommandInteraction } from 'discord.js';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute(interaction: CommandInteraction) {
    console.log('Ping command executed');
    await interaction.reply('Pong!');
  },
};
