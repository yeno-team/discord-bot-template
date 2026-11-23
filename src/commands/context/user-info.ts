import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageFlags,
  time,
  TimestampStyles,
} from 'discord.js';

import type { CommandMetadata, ContextMenuExecutor, ContextMenuInteraction } from '../../types';

/** Right-click a user → Apps → User Info. */
export default class UserInfoMenu implements ContextMenuExecutor {
  public static readonly data = new ContextMenuCommandBuilder()
    .setName('User Info')
    .setType(ApplicationCommandType.User);

  public static readonly metadata: CommandMetadata = {
    category: 'general',
    cooldownSeconds: 3,
    enabled: true,
  };

  public async execute(interaction: ContextMenuInteraction): Promise<void> {
    if (!interaction.isUserContextMenuCommand()) return;
    const user = interaction.targetUser;
    await interaction.reply({
      content: [
        `**${user.tag}**`,
        `ID: \`${user.id}\``,
        `Account created ${time(user.createdAt, TimestampStyles.RelativeTime)}`,
      ].join('\n'),
      flags: MessageFlags.Ephemeral,
    });
  }
}
