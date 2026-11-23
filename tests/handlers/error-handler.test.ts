import { MessageFlags, type RepliableInteraction } from 'discord.js';

import { handleInteractionError } from '../../src/handlers/error-handler';
import { UserFacingError } from '../../src/utils/errors';
import type { AppLogger } from '../../src/utils/logger';

function createInteraction(state: { replied?: boolean; deferred?: boolean } = {}) {
  const reply = jest.fn().mockResolvedValue(undefined);
  const followUp = jest.fn().mockResolvedValue(undefined);
  const interaction = {
    id: 'interaction-1',
    replied: state.replied ?? false,
    deferred: state.deferred ?? false,
    reply,
    followUp,
  } as unknown as RepliableInteraction;
  return { interaction, reply, followUp };
}

function createLogger() {
  return { error: jest.fn(), warn: jest.fn() } as unknown as AppLogger & {
    error: jest.Mock;
    warn: jest.Mock;
  };
}

describe('handleInteractionError', () => {
  it('shows a UserFacingError message', async () => {
    const { interaction, reply } = createInteraction();

    await handleInteractionError(interaction, new UserFacingError('Nope.'), createLogger());

    expect(reply).toHaveBeenCalledWith({ content: 'Nope.', flags: MessageFlags.Ephemeral });
  });

  it('hides unexpected errors and follows up after a deferred reply', async () => {
    const { interaction, reply, followUp } = createInteraction({ deferred: true });
    const logger = createLogger();

    await handleInteractionError(interaction, 'boom', logger, { command: 'example' });

    expect(reply).not.toHaveBeenCalled();
    expect(followUp).toHaveBeenCalledWith({
      content: 'Something went wrong. Please try again.',
      flags: MessageFlags.Ephemeral,
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'example', interactionId: 'interaction-1' }),
      'Interaction failed',
    );
  });

  it('logs instead of throwing when the reply itself fails', async () => {
    const { interaction, reply } = createInteraction();
    reply.mockRejectedValue(new Error('Unknown interaction'));
    const logger = createLogger();

    await expect(handleInteractionError(interaction, 'boom', logger)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });
});
