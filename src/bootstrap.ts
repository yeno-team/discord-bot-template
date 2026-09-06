import path from 'node:path';

import type { Client } from 'discord.js';
import type { DataSource } from 'typeorm';

import { createDiscordClient } from './client';
import { loadConfig, type AppConfig } from './config';
import { createDependencyContainer, TOKENS } from './container';
import { initializeDatabase } from './database';
import { loadCommands, registerEvents } from './handlers';
import type { AppContext } from './types';
import { createLogger, type AppLogger } from './utils/logger';

export interface Application {
  readonly context: AppContext;
  shutdown(reason?: string): Promise<void>;
}

export interface BootstrapOptions {
  readonly config?: AppConfig;
  readonly client?: Client;
  readonly database?: DataSource;
  readonly logger?: AppLogger;
  readonly login?: boolean;
}

export async function bootstrap(options: BootstrapOptions = {}): Promise<Application> {
  const config = options.config ?? loadConfig();
  const logger = options.logger ?? createLogger(config.logging);
  const client = options.client ?? createDiscordClient();
  const database = options.database ?? (await initializeDatabase(config.database));
  let stopped = false;

  try {
    const migrations = await database.runMigrations();
    if (migrations.length > 0) {
      logger.info(
        { migrations: migrations.map(({ name }) => name) },
        'Database migrations applied',
      );
    }

    const container = createDependencyContainer({ client, config, database, logger });
    const commands = await loadCommands(path.join(__dirname, 'commands'), logger, container);
    container.register(TOKENS.commands, { useValue: commands });
    const context: AppContext = {
      client,
      commands,
      config,
      database,
      logger,
    };

    await registerEvents(client, path.join(__dirname, 'events'), container, logger);

    const application: Application = {
      context,
      async shutdown(reason = 'shutdown requested') {
        if (stopped) return;
        stopped = true;
        logger.info({ reason }, 'Shutting down');
        await client.destroy();
        if (database.isInitialized) await database.destroy();
        logger.info('Shutdown complete');
      },
    };

    if (options.login !== false) {
      logger.info({ environment: config.env }, 'Starting Discord client');
      await client.login(config.discord.token);
    }

    return application;
  } catch (error) {
    await client.destroy();
    if (database.isInitialized) await database.destroy();
    throw error;
  }
}
