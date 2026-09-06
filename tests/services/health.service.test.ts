import type { DataSource } from 'typeorm';

import { HealthService } from '../../src/services';

describe('HealthService', () => {
  it('returns application uptime and database state', () => {
    const database = { isInitialized: true } as DataSource;
    const service = new HealthService(database, () => 12.9);

    expect(service.getStatus()).toEqual({ database: 'connected', uptimeSeconds: 12 });
  });
});
