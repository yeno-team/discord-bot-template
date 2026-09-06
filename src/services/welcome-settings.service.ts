import { injectable } from 'tsyringe';

import { GuildSettingsRepository, type GuildSettingsEntity } from '../database';

@injectable()
export class WelcomeSettingsService {
  public constructor(private readonly settings: GuildSettingsRepository) {}

  public setWelcomeChannel(guildId: string, channelId: string): Promise<GuildSettingsEntity> {
    return this.settings.upsert(guildId, { welcomeChannelId: channelId });
  }
}
