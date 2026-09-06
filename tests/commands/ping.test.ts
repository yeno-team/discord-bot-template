import type { ChatInputCommandInteraction } from 'discord.js';

import PingCommand from '../../src/commands/general/ping';
import type { HealthService } from '../../src/services';

describe('/ping', () => {
  it('formats health service output without a Discord connection', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const interaction = { reply } as unknown as ChatInputCommandInteraction;
    const health = {
      getStatus: () => ({ database: 'connected' as const, uptimeSeconds: 42 }),
    } as HealthService;
    const command = new PingCommand(health);

    await command.execute(interaction);

    expect(reply).toHaveBeenCalledWith({
      content: 'Pong! Database: connected. Uptime: 42s.',
    });
  });
});
