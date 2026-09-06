import type { Client, Collection } from 'discord.js';
import type { DataSource } from 'typeorm';

import type { AppConfig } from '../config';
import type { AppLogger } from '../utils/logger';
import type { SlashCommand } from './command';

export interface AppContext {
  readonly client: Client;
  readonly commands: Collection<string, SlashCommand>;
  readonly config: AppConfig;
  readonly database: DataSource;
  readonly logger: AppLogger;
}
