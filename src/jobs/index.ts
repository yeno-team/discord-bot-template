import type { Client } from 'discord.js';

import type { AppServices } from '../app';
import type { ScheduledJob } from '../types';
import type { AppLogger } from '../utils/logger';
import { LogStatusJob } from './log-status.job';

export interface JobDependencies {
  readonly client: Client;
  readonly logger: AppLogger;
  readonly services: AppServices;
}

/**
 * Every scheduled job, in one place. Jobs start after the bot logs in. A job that posts
 * to Discord should still check `client.isReady()`, since the gateway can reconnect.
 */
export function createJobs({ logger, services }: JobDependencies): ScheduledJob[] {
  return [new LogStatusJob(services.health, logger)];
}
