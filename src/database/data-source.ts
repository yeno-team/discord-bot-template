import fs from 'node:fs/promises';
import path from 'node:path';

import { DataSource } from 'typeorm';

import type { AppConfig } from '../config';
import { GuildSettingsEntity } from './entities';
import { CreateGuildSettings1725588000000 } from './migrations/1725588000000-CreateGuildSettings';

export function createDataSource(databasePath: string): DataSource {
  return new DataSource({
    type: 'better-sqlite3',
    database: databasePath,
    entities: [GuildSettingsEntity],
    migrations: [CreateGuildSettings1725588000000],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: false,
  });
}

export async function initializeDatabase(config: AppConfig['database']): Promise<DataSource> {
  if (config.path !== ':memory:') {
    await fs.mkdir(path.dirname(path.resolve(config.path)), { recursive: true });
  }

  return createDataSource(config.path).initialize();
}
