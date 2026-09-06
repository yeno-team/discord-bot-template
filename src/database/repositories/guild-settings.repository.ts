import type { Repository } from 'typeorm';

import type { GuildSettingsEntity } from '../entities';

export interface GuildSettingsUpdate {
  readonly welcomeChannelId: string | null;
}

export class GuildSettingsRepository {
  public constructor(private readonly repository: Repository<GuildSettingsEntity>) {}

  public findByGuildId(guildId: string): Promise<GuildSettingsEntity | null> {
    return this.repository.findOneBy({ guildId });
  }

  public async upsert(guildId: string, update: GuildSettingsUpdate): Promise<GuildSettingsEntity> {
    const current = await this.findByGuildId(guildId);
    const settings = current ?? this.repository.create({ guildId });
    settings.welcomeChannelId = update.welcomeChannelId;

    return this.repository.save(settings);
  }
}
