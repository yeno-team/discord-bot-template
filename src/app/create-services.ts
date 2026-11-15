import type { Client } from 'discord.js';
import type { DataSource } from 'typeorm';

import type { AppConfig } from '../config';
import { GuildSettingsRepository } from '../database';
import { RedisConnection } from '../redis';
import {
  CooldownService,
  HealthHeartbeatService,
  HealthService,
  WelcomeSettingsService,
} from '../services';
import type { AppLogger } from '../utils/logger';

export interface ServiceDependencies {
  readonly client: Client;
  readonly config: AppConfig;
  readonly database: DataSource;
  readonly logger: AppLogger;
  readonly redis?: RedisConnection;
}

export interface AppServices {
  readonly redis: RedisConnection;
  readonly cooldowns: CooldownService;
  readonly health: HealthService;
  readonly heartbeat: HealthHeartbeatService;
  readonly welcomeSettings: WelcomeSettingsService;
}

/**
 * The composition root: every long-lived object is created here exactly once and passed
 * to its consumers through their constructors. Add new services and repositories here.
 */
export function createServices({
  client,
  config,
  database,
  logger,
  redis = new RedisConnection(config, logger),
}: ServiceDependencies): AppServices {
  const guildSettings = new GuildSettingsRepository(database);

  return {
    redis,
    cooldowns: new CooldownService(redis),
    health: new HealthService(database),
    heartbeat: new HealthHeartbeatService(config, client, redis, logger),
    welcomeSettings: new WelcomeSettingsService(guildSettings),
  };
}
