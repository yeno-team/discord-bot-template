import { createClient } from 'redis';

import { loadConfig } from '../../src/config';
import { RedisConnection } from '../../src/redis';
import type { AppLogger } from '../../src/utils/logger';

jest.mock('redis', () => ({ createClient: jest.fn() }));

describe('RedisConnection', () => {
  it('provides generic atomic set and TTL operations', async () => {
    const set = jest.fn().mockResolvedValue('OK');
    const pTTL = jest.fn().mockResolvedValue(3_501);
    const on = jest.fn();
    jest.mocked(createClient).mockReturnValue({ set, pTTL, on, isOpen: false } as never);
    const config = loadConfig({
      env: {
        NODE_ENV: 'test',
        DISCORD_TOKEN: 'test-token',
        DISCORD_CLIENT_ID: 'test-client-id',
        REDIS_URL: 'redis://localhost:6379',
      },
    });
    const connection = new RedisConnection(config, {
      error: jest.fn(),
    } as unknown as AppLogger);

    await expect(connection.setIfAbsent('key', 'value', 5_000)).resolves.toBe(true);
    await expect(connection.getTtlMilliseconds('key')).resolves.toBe(3_501);
    expect(set).toHaveBeenCalledWith('key', 'value', {
      NX: true,
      PX: 5_000,
    });
    expect(pTTL).toHaveBeenCalledWith('key');
  });
});
