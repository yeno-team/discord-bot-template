import type { ChatInputCommandInteraction } from 'discord.js';

import ping from '../../src/commands/general/ping';
import type { AppContext } from '../../src/types';

describe('/ping', () => {
  it('formats health service output without a Discord connection', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const interaction = { reply } as unknown as ChatInputCommandInteraction;
    const context = {
      services: {
        health: {
          getStatus: () => ({ database: 'connected' as const, uptimeSeconds: 42 }),
        },
      },
    } as AppContext;

    await ping.execute(interaction, context);

    expect(reply).toHaveBeenCalledWith({
      content: 'Pong! Database: connected. Uptime: 42s.',
    });
  });
});
