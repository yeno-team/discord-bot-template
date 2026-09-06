import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from '../../types';
import { UserFacingError } from '../../utils/errors';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('set-welcome')
    .setDescription('Set the welcome channel for this server')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel used for welcome messages')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),
  metadata: {
    category: 'admin',
    guildOnly: true,
    enabled: true,
    requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
    cooldownSeconds: 3,
  },
  async execute(interaction, context) {
    if (interaction.guildId === null) throw new UserFacingError('This command requires a server.');
    const channel = interaction.options.getChannel('channel', true);
    await context.services.welcomeSettings.setWelcomeChannel(interaction.guildId, channel.id);
    await interaction.reply({ content: `Welcome channel set to <#${channel.id}>.` });
  },
};

export default command;
