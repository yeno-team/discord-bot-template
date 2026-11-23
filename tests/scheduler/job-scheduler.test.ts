import type { RedisConnection } from '../../src/redis';
import { JobScheduler } from '../../src/scheduler';
import type { ScheduledJob } from '../../src/types';
import type { AppLogger } from '../../src/utils/logger';

function createLogger() {
  return { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as unknown as AppLogger & {
    error: jest.Mock;
  };
}

function createRedis(claimed = true) {
  const setIfAbsent = jest.fn().mockResolvedValue(claimed);
  return { redis: { setIfAbsent } as unknown as RedisConnection, setIfAbsent };
}

function createJob(overrides: Partial<ScheduledJob> = {}): {
  job: ScheduledJob;
  run: jest.Mock;
} {
  const run = jest.fn().mockResolvedValue(undefined);
  return { job: { name: 'example', schedule: '0 * * * *', run, ...overrides }, run };
}

describe('JobScheduler', () => {
  it('runs a job when this replica claims the run', async () => {
    const { job, run } = createJob();
    const { redis, setIfAbsent } = createRedis(true);
    const scheduler = new JobScheduler([job], redis, createLogger());

    await expect(scheduler.runOnce(job, 1_700_000_000_500)).resolves.toBe(true);

    expect(run).toHaveBeenCalledTimes(1);
    expect(setIfAbsent).toHaveBeenCalledWith('job:example:1700000000', '1', 600_000);
  });

  it('skips a run another replica already claimed', async () => {
    const { job, run } = createJob();
    const scheduler = new JobScheduler([job], createRedis(false).redis, createLogger());

    await expect(scheduler.runOnce(job)).resolves.toBe(false);

    expect(run).not.toHaveBeenCalled();
  });

  it('logs a failing job instead of throwing', async () => {
    const { job } = createJob({ run: jest.fn().mockRejectedValue(new Error('boom')) });
    const logger = createLogger();
    const scheduler = new JobScheduler([job], createRedis().redis, logger);

    await expect(scheduler.runOnce(job)).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'example' }),
      'Scheduled job failed',
    );
  });

  it('rejects duplicate job names', () => {
    const { job } = createJob();

    expect(() => new JobScheduler([job, job], createRedis().redis, createLogger())).toThrow(
      'Duplicate scheduled job name: example',
    );
  });

  it.each([
    ['an invalid pattern', { schedule: 'every day' }],
    ['an invalid timezone', { timezone: 'Mars/Olympus_Mons' }],
  ])('rejects %s at startup', (_label, overrides) => {
    const { job } = createJob(overrides);

    expect(() => new JobScheduler([job], createRedis().redis, createLogger())).toThrow(
      'Invalid schedule for job "example"',
    );
  });

  it('runs on schedule and waits for a running job when stopped', async () => {
    let finish: () => void = () => undefined;
    const run = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { job } = createJob({ schedule: '* * * * * *', run });
    const scheduler = new JobScheduler([job], createRedis().redis, createLogger());

    scheduler.start();
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    expect(run).toHaveBeenCalledTimes(1);

    let stopped = false;
    const stopping = scheduler.stop().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);

    finish();
    await stopping;
    expect(stopped).toBe(true);
  });
});
