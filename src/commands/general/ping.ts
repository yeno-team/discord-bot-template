import { SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from '../../types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check whether the bot is healthy'),
  metadata: {
    category: 'general',
    cooldownSeconds: 5,
    enabled: true,
  },
  async execute(interaction, context) {
    const status = context.services.health.getStatus();
    await interaction.reply({
      content: `Pong! Database: ${status.database}. Uptime: ${String(status.uptimeSeconds)}s.`,
    });
  },
};

export default command;
