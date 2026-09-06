import type { GuildSettingsEntity, GuildSettingsRepository } from '../database';

export class WelcomeSettingsService {
  public constructor(private readonly settings: GuildSettingsRepository) {}

  public setWelcomeChannel(guildId: string, channelId: string): Promise<GuildSettingsEntity> {
    return this.settings.upsert(guildId, { welcomeChannelId: channelId });
  }
}
