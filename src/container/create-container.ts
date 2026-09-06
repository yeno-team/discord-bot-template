import type { Client } from 'discord.js';
import {
  container as rootContainer,
  type DependencyContainer,
  type InjectionToken,
} from 'tsyringe';
import { DataSource } from 'typeorm';

import type { AppConfig } from '../config';
import { RedisConnection } from '../redis';
import { CooldownService } from '../services';
import type { AppLogger } from '../utils/logger';
import { TOKENS } from './tokens';

export interface ContainerDependencies {
  readonly client: Client;
  readonly config: AppConfig;
  readonly database: DataSource;
  readonly logger: AppLogger;
  readonly redis?: RedisConnection;
}

function registerValue<T>(
  container: DependencyContainer,
  token: InjectionToken<T>,
  value: T,
): void {
  container.register(token, { useValue: value });
}

export function createDependencyContainer(
  dependencies: ContainerDependencies,
): DependencyContainer {
  const container = rootContainer.createChildContainer();

  registerValue(container, TOKENS.client, dependencies.client);
  registerValue(container, TOKENS.config, dependencies.config);
  registerValue(container, TOKENS.logger, dependencies.logger);
  registerValue(container, TOKENS.uptime, () => process.uptime());
  registerValue(container, DataSource, dependencies.database);
  if (dependencies.redis === undefined) container.registerSingleton(RedisConnection);
  else registerValue(container, RedisConnection, dependencies.redis);
  container.registerSingleton(CooldownService);

  return container;
}
