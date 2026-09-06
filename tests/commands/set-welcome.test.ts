import type { ChatInputCommandInteraction } from 'discord.js';

import setWelcome from '../../src/commands/admin/set-welcome';
import type { AppContext } from '../../src/types';

describe('/set-welcome', () => {
  it('passes the selected guild and channel to the service', async () => {
    const setWelcomeChannel = jest.fn().mockResolvedValue({});
    const reply = jest.fn().mockResolvedValue(undefined);
    const interaction = {
      guildId: 'guild-1',
      options: { getChannel: jest.fn().mockReturnValue({ id: 'channel-1' }) },
      reply,
    } as unknown as ChatInputCommandInteraction;
    const context = {
      services: { welcomeSettings: { setWelcomeChannel } },
    } as unknown as AppContext;

    await setWelcome.execute(interaction, context);

    expect(setWelcomeChannel).toHaveBeenCalledWith('guild-1', 'channel-1');
    expect(reply).toHaveBeenCalledWith({ content: 'Welcome channel set to <#channel-1>.' });
  });
});
