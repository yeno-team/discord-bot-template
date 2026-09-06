import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { injectable } from 'tsyringe';

import { HealthService } from '../../services';
import type { CommandExecutor, CommandMetadata } from '../../types';

@injectable()
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
    const status = this.health.getStatus();
    await interaction.reply({
      content: `Pong! Database: ${status.database}. Uptime: ${String(status.uptimeSeconds)}s.`,
    });
  }
}
