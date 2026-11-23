import { Cron } from 'croner';

import type { RedisConnection } from '../redis';
import type { ScheduledJob } from '../types';
import type { AppLogger } from '../utils/logger';

/** Long enough to outlast clock drift between replicas; each run has its own key. */
const LOCK_TTL_MILLISECONDS = 10 * 60 * 1000;

/**
 * Runs scheduled jobs. A job never overlaps itself, and a Redis lock per scheduled run
 * makes sure only one bot replica runs it. A failing job is logged and does not stop
 * later runs.
 */
export class JobScheduler {
  private readonly crons: Cron[] = [];
  private readonly running = new Set<Promise<boolean>>();

  public constructor(
    private readonly jobs: readonly ScheduledJob[],
    private readonly redis: RedisConnection,
    private readonly logger: AppLogger,
  ) {
    const names = new Set<string>();
    for (const job of jobs) {
      if (names.has(job.name)) throw new Error(`Duplicate scheduled job name: ${job.name}`);
      names.add(job.name);
      JobScheduler.validate(job);
    }
  }

  public start(): void {
    if (this.crons.length > 0) return;
    for (const job of this.jobs) {
      const cron = new Cron(
        job.schedule,
        { timezone: job.timezone ?? 'UTC', protect: true, unref: true },
        async () => {
          await this.track(this.runOnce(job));
        },
      );
      this.crons.push(cron);
      this.logger.info(
        { job: job.name, nextRun: cron.nextRun()?.toISOString() },
        'Scheduled job registered',
      );
    }
  }

  /** Stops scheduling and waits for runs already in progress to finish. */
  public async stop(): Promise<void> {
    for (const cron of this.crons) cron.stop();
    this.crons.length = 0;
    await Promise.allSettled(this.running);
  }

  /**
   * Runs a job once if no other replica has claimed this run. Returns whether it ran
   * successfully. Exposed for tests and for triggering a job manually.
   */
  public async runOnce(job: ScheduledJob, now = Date.now()): Promise<boolean> {
    const runSecond = Math.floor(now / 1000);
    try {
      const claimed = await this.redis.setIfAbsent(
        `job:${job.name}:${String(runSecond)}`,
        '1',
        LOCK_TTL_MILLISECONDS,
      );
      if (!claimed) {
        this.logger.debug({ job: job.name }, 'Scheduled job already claimed by another replica');
        return false;
      }

      const started = performance.now();
      await job.run();
      this.logger.info(
        { job: job.name, durationMs: Math.round(performance.now() - started) },
        'Scheduled job finished',
      );
      return true;
    } catch (error) {
      this.logger.error({ err: error, job: job.name }, 'Scheduled job failed');
      return false;
    }
  }

  private track(run: Promise<boolean>): Promise<boolean> {
    this.running.add(run);
    void run.finally(() => this.running.delete(run));
    return run;
  }

  private static validate(job: ScheduledJob): void {
    try {
      // A bad pattern throws here; a bad timezone only throws once a run time is computed.
      new Cron(job.schedule, { timezone: job.timezone ?? 'UTC', paused: true }).nextRun();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid schedule for job "${job.name}": ${reason}`);
    }
  }
}
