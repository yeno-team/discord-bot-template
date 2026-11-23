import type { Client } from 'discord.js';
import type { DataSource } from 'typeorm';

import { createServices } from './app';
import { createDiscordClient } from './client';
import { createCommands, createContextMenus } from './commands';
import { createComponents } from './components';
import { loadConfig, type AppConfig } from './config';
import { initializeDatabase } from './database';
import { createEvents } from './events';
import {
  ComponentRegistry,
  InteractionHandler,
  registerEvents,
  toCommandCollection,
  toContextMenuCollection,
} from './handlers';
import type { RedisConnection } from './redis';
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
  readonly redis?: RedisConnection;
}

export async function bootstrap(options: BootstrapOptions = {}): Promise<Application> {
  const config = options.config ?? loadConfig();
  const logger = options.logger ?? createLogger(config.logging);
  const client = options.client ?? createDiscordClient();
  const database = options.database ?? (await initializeDatabase(config.database));
  let stopped = false;
  let redis: RedisConnection | undefined;

  try {
    const migrations = await database.runMigrations();
    if (migrations.length > 0) {
      logger.info(
        { migrations: migrations.map(({ name }) => name) },
        'Database migrations applied',
      );
    }

    const services = createServices({
      client,
      config,
      database,
      logger,
      ...(options.redis === undefined ? {} : { redis: options.redis }),
    });
    const connectedRedis = services.redis;
    redis = connectedRedis;
    await connectedRedis.connect();
    const commands = toCommandCollection(createCommands(services));
    const contextMenus = toContextMenuCollection(createContextMenus());
    const context: AppContext = {
      client,
      commands,
      contextMenus,
      config,
      database,
      logger,
    };

    const components = new ComponentRegistry(createComponents(services));
    const interactions = new InteractionHandler({
      commands,
      contextMenus,
      components,
      cooldowns: services.cooldowns,
      logger,
    });
    registerEvents(client, createEvents({ interactions, logger }), logger);
    const { heartbeat } = services;

    const application: Application = {
      context,
      async shutdown(reason = 'shutdown requested') {
        if (stopped) return;
        stopped = true;
        logger.info({ reason }, 'Shutting down');
        await heartbeat.stop();
        await client.destroy();
        await connectedRedis.close();
        if (database.isInitialized) await database.destroy();
        logger.info('Shutdown complete');
      },
    };

    if (options.login !== false) {
      logger.info({ environment: config.env }, 'Starting Discord client');
      await client.login(config.discord.token);
    }
    heartbeat.start();

    return application;
  } catch (error) {
    await client.destroy();
    if (redis?.isOpen === true) await redis.close();
    if (database.isInitialized) await database.destroy();
    throw error;
  }
}
