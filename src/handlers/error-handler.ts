import { MessageFlags, type RepliableInteraction } from 'discord.js';

import type { AppLogger } from '../utils/logger';
import { toError, UserFacingError } from '../utils/errors';

export async function handleInteractionError(
  interaction: RepliableInteraction,
  thrown: unknown,
  logger: AppLogger,
  context: Readonly<Record<string, string>> = {},
): Promise<void> {
  const error = toError(thrown);
  logger.error({ err: error, interactionId: interaction.id, ...context }, 'Interaction failed');

  const content =
    error instanceof UserFacingError ? error.message : 'Something went wrong. Please try again.';
  const response = { content, flags: MessageFlags.Ephemeral } as const;

  try {
    if (interaction.replied || interaction.deferred) await interaction.followUp(response);
    else await interaction.reply(response);
  } catch (replyError) {
    // The interaction may have expired; there is no one left to tell.
    logger.warn(
      { err: toError(replyError), interactionId: interaction.id },
      'Failed to send interaction error reply',
    );
  }
}
