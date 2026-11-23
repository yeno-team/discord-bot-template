/** Work that runs on a cron schedule, such as a daily post or a cleanup. */
export interface ScheduledJob {
  /** Unique name, used in logs and in the Redis lock key. */
  readonly name: string;
  /**
   * A cron pattern: `minute hour day month weekday`, with an optional leading seconds field.
   * For example `0 9 * * 1` is every Monday at 09:00. https://crontab.guru helps write them.
   */
  readonly schedule: string;
  /** IANA timezone the schedule is read in, such as `America/New_York`. Defaults to UTC. */
  readonly timezone?: string;
  run(): Promise<void>;
}
