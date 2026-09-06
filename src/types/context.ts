import type { Client, Collection } from 'discord.js';
import type { DataSource } from 'typeorm';

import type { AppConfig } from '../config';
import type { GuildSettingsRepository } from '../database';
import type { CooldownService, HealthService, WelcomeSettingsService } from '../services';
import type { AppLogger } from '../utils/logger';
import type { SlashCommand } from './command';

export interface AppRepositories {
  readonly guildSettings: GuildSettingsRepository;
}

export interface AppServices {
  readonly cooldowns: CooldownService;
  readonly health: HealthService;
  readonly welcomeSettings: WelcomeSettingsService;
}

export interface AppContext {
  readonly client: Client;
  readonly commands: Collection<string, SlashCommand>;
  readonly config: AppConfig;
  readonly database: DataSource;
  readonly logger: AppLogger;
  readonly repositories: AppRepositories;
  readonly services: AppServices;
}
