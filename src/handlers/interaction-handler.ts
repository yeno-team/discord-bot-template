import type { Collection } from 'discord.js';
import { MessageFlags, type Interaction, type PermissionsBitField } from 'discord.js';

import type { CooldownService } from '../services';
import type { SlashCommand } from '../types';
import type { AppLogger } from '../utils/logger';
import { handleInteractionError } from './error-handler';

function hasPermissions(
  actual: Readonly<PermissionsBitField> | null,
  required: SlashCommand['metadata']['requiredUserPermissions'],
): boolean {
  return required === undefined || actual?.has(required) === true;
}

export class InteractionHandler {
  public constructor(
    private readonly commands: Collection<string, SlashCommand>,
    private readonly cooldowns: CooldownService,
    private readonly logger: AppLogger,
  ) {}

  public async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);
    if (command === undefined || command.metadata.enabled === false) {
      await interaction.reply({
        content: 'This command is unavailable.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      if (command.metadata.guildOnly === true && interaction.guildId === null) {
        await interaction.reply({
          content: 'This command can only be used in a server.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (
        !hasPermissions(interaction.memberPermissions, command.metadata.requiredUserPermissions)
      ) {
        await interaction.reply({
          content: 'You do not have permission to use this command.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const botPermissions =
        interaction.guild?.members.me?.permissionsIn(interaction.channelId) ?? null;
      if (!hasPermissions(botPermissions, command.metadata.requiredBotPermissions)) {
        await interaction.reply({
          content: 'I do not have the permissions required to run this command here.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const cooldown = command.metadata.cooldownSeconds ?? 0;
      const remaining = await this.cooldowns.consume(
        `${interaction.commandName}:${interaction.user.id}`,
        cooldown,
      );
      if (remaining > 0) {
        await interaction.reply({
          content: `Please wait ${String(remaining)}s before using this command again.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await command.execute(interaction);
    } catch (error) {
      await handleInteractionError(interaction, error, this.logger);
    }
  }
}
