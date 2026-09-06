import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

import type { AppLogger } from '../utils/logger';
import { toError, UserFacingError } from '../utils/errors';

export async function handleInteractionError(
  interaction: ChatInputCommandInteraction,
  thrown: unknown,
  logger: AppLogger,
): Promise<void> {
  const error = toError(thrown);
  logger.error(
    { err: error, command: interaction.commandName, interactionId: interaction.id },
    'Command execution failed',
  );

  const content =
    error instanceof UserFacingError
      ? error.message
      : 'Something went wrong while running that command.';
  const response = { content, flags: MessageFlags.Ephemeral } as const;

  if (interaction.replied || interaction.deferred) await interaction.followUp(response);
  else await interaction.reply(response);
}
