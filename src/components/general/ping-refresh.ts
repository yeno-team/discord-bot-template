import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ButtonInteraction } from 'discord.js';

import { createCustomId } from '../../handlers/custom-id';
import type { HealthService, HealthStatus } from '../../services';
import type { ComponentHandler, InteractionGuards } from '../../types';

export function formatPing(status: HealthStatus): string {
  return `Pong! Database: ${status.database}. Uptime: ${String(status.uptimeSeconds)}s.`;
}

/** The Refresh button under a /ping reply. It edits the message with fresh health data. */
export default class PingRefreshButton implements ComponentHandler<'button'> {
  public static readonly prefix = 'ping-refresh';

  public readonly kind = 'button';
  public readonly prefix = PingRefreshButton.prefix;
  public readonly metadata: InteractionGuards = { cooldownSeconds: 3 };

  public constructor(private readonly health: HealthService) {}

  public static row(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(createCustomId(PingRefreshButton.prefix))
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  public async execute(interaction: ButtonInteraction): Promise<void> {
    await interaction.update({ content: formatPing(this.health.getStatus()) });
  }
}
