import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';

import PingRefreshButton, { formatPing } from '../../components/general/ping-refresh';
import type { HealthService } from '../../services';
import type { CommandExecutor, CommandMetadata } from '../../types';

export default class PingCommand implements CommandExecutor {
  public static readonly data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check whether the bot is healthy');

  public static readonly metadata: CommandMetadata = {
    category: 'general',
    cooldownSeconds: 5,
    enabled: true,
  };

  public constructor(private readonly health: HealthService) {}

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      content: formatPing(this.health.getStatus()),
      components: [PingRefreshButton.row()],
    });
  }
}
