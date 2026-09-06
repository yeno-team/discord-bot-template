import type { GuildSettingsEntity, GuildSettingsRepository } from '../../src/database';
import { WelcomeSettingsService } from '../../src/services';

describe('WelcomeSettingsService', () => {
  it('delegates persistence to the guild settings repository', async () => {
    const saved = { guildId: 'guild-1', welcomeChannelId: 'channel-1' } as GuildSettingsEntity;
    const upsert = jest.fn().mockResolvedValue(saved);
    const repository = {
      upsert,
    } as unknown as GuildSettingsRepository;
    const service = new WelcomeSettingsService(repository);

    await expect(service.setWelcomeChannel('guild-1', 'channel-1')).resolves.toBe(saved);
    expect(upsert).toHaveBeenCalledWith('guild-1', {
      welcomeChannelId: 'channel-1',
    });
  });
});
