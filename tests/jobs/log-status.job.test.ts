import { LogStatusJob } from '../../src/jobs/log-status.job';
import type { HealthService } from '../../src/services';
import type { AppLogger } from '../../src/utils/logger';

describe('LogStatusJob', () => {
  it('logs the health status', async () => {
    const info = jest.fn();
    const status = { database: 'connected' as const, uptimeSeconds: 42 };
    const job = new LogStatusJob(
      { getStatus: () => status } as HealthService,
      { info } as unknown as AppLogger,
    );

    await job.run();

    expect(info).toHaveBeenCalledWith({ status }, 'Hourly status');
  });
});
