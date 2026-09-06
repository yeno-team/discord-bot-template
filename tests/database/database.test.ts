import 'reflect-metadata';

import type { DataSource } from 'typeorm';

import { createDataSource, GuildSettingsEntity, GuildSettingsRepository } from '../../src/database';

describe('database layer', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = createDataSource(':memory:');
    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('runs migrations without schema synchronization', () => {
    expect(dataSource.options.synchronize).toBe(false);
    expect(dataSource.entityMetadatas).toHaveLength(1);
  });

  it('stores and updates guild settings through the repository', async () => {
    const repository = new GuildSettingsRepository(dataSource.getRepository(GuildSettingsEntity));

    await repository.upsert('guild-1', { welcomeChannelId: 'channel-1' });
    await repository.upsert('guild-1', { welcomeChannelId: 'channel-2' });

    await expect(repository.findByGuildId('guild-1')).resolves.toMatchObject({
      guildId: 'guild-1',
      welcomeChannelId: 'channel-2',
    });
  });
});
