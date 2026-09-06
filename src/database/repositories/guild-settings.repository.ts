import type { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { injectable } from 'tsyringe';

import { GuildSettingsEntity } from '../entities';

export interface GuildSettingsUpdate {
  readonly welcomeChannelId: string | null;
}

@injectable()
export class GuildSettingsRepository {
  private readonly repository: Repository<GuildSettingsEntity>;

  public constructor(database: DataSource) {
    this.repository = database.getRepository(GuildSettingsEntity);
  }

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
