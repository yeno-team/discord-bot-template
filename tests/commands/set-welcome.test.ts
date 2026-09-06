import type { ChatInputCommandInteraction } from 'discord.js';

import SetWelcomeCommand from '../../src/commands/admin/set-welcome';
import type { WelcomeSettingsService } from '../../src/services';

describe('/set-welcome', () => {
  it('passes the selected guild and channel to the service', async () => {
    const setWelcomeChannel = jest.fn().mockResolvedValue({});
    const reply = jest.fn().mockResolvedValue(undefined);
    const interaction = {
      guildId: 'guild-1',
      options: { getChannel: jest.fn().mockReturnValue({ id: 'channel-1' }) },
      reply,
    } as unknown as ChatInputCommandInteraction;
    const welcomeSettings = { setWelcomeChannel } as unknown as WelcomeSettingsService;
    const command = new SetWelcomeCommand(welcomeSettings);

    await command.execute(interaction);

    expect(setWelcomeChannel).toHaveBeenCalledWith('guild-1', 'channel-1');
    expect(reply).toHaveBeenCalledWith({ content: 'Welcome channel set to <#channel-1>.' });
  });
});
