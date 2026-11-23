import type { HealthService } from '../services';
import type { ScheduledJob } from '../types';
import type { AppLogger } from '../utils/logger';

/** Example job: logs the bot's health at the start of every hour. */
export class LogStatusJob implements ScheduledJob {
  public readonly name = 'log-status';
  public readonly schedule = '0 * * * *';

  public constructor(
    private readonly health: HealthService,
    private readonly logger: AppLogger,
  ) {}

  public run(): Promise<void> {
    this.logger.info({ status: this.health.getStatus() }, 'Hourly status');
    return Promise.resolve();
  }
}
