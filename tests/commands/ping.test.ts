import type { ButtonInteraction, ChatInputCommandInteraction } from 'discord.js';

import PingCommand from '../../src/commands/general/ping';
import PingRefreshButton from '../../src/components/general/ping-refresh';
import { parseCustomId } from '../../src/handlers';
import type { HealthService } from '../../src/services';

const health = {
  getStatus: () => ({ database: 'connected' as const, uptimeSeconds: 42 }),
} as HealthService;

describe('/ping', () => {
  it('replies with health output and a Refresh button', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    const interaction = { reply } as unknown as ChatInputCommandInteraction;

    await new PingCommand(health).execute(interaction);

    const [response] = reply.mock.calls[0] as [
      { content: string; components: { toJSON(): unknown }[] },
    ];
    expect(response.content).toBe('Pong! Database: connected. Uptime: 42s.');
    const row = response.components[0]?.toJSON() as { components: { custom_id: string }[] };
    const customId = row.components[0]?.custom_id ?? '';
    expect(parseCustomId(customId).prefix).toBe(PingRefreshButton.prefix);
  });

  it('updates the message when Refresh is pressed', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const interaction = { update } as unknown as ButtonInteraction;

    await new PingRefreshButton(health).execute(interaction);

    expect(update).toHaveBeenCalledWith({ content: 'Pong! Database: connected. Uptime: 42s.' });
  });
});
