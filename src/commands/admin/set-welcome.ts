import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { injectable } from 'tsyringe';

import { WelcomeSettingsService } from '../../services';
import type { CommandExecutor, CommandMetadata } from '../../types';
import { UserFacingError } from '../../utils/errors';

@injectable()
export default class SetWelcomeCommand implements CommandExecutor {
  public static readonly data = new SlashCommandBuilder()
    .setName('set-welcome')
    .setDescription('Set the welcome channel for this server')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel used for welcome messages')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    );

  public static readonly metadata: CommandMetadata = {
    category: 'admin',
    guildOnly: true,
    enabled: true,
    requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
    cooldownSeconds: 3,
  };

  public constructor(private readonly welcomeSettings: WelcomeSettingsService) {}

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) throw new UserFacingError('This command requires a server.');
    const channel = interaction.options.getChannel('channel', true);
    await this.welcomeSettings.setWelcomeChannel(interaction.guildId, channel.id);
    await interaction.reply({ content: `Welcome channel set to <#${channel.id}>.` });
  }
}
