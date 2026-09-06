import { createClient } from 'redis';

import { loadConfig } from '../../src/config';
import { RedisConnection } from '../../src/redis';
import type { AppLogger } from '../../src/utils/logger';

jest.mock('redis', () => ({ createClient: jest.fn() }));

describe('RedisConnection', () => {
  it('acquires cooldowns atomically and returns the existing TTL', async () => {
    const set = jest.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
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

    await expect(connection.acquireCooldown('ping:user-1', 5_000)).resolves.toBe(0);
    await expect(connection.acquireCooldown('ping:user-1', 5_000)).resolves.toBe(4);
    expect(set).toHaveBeenCalledWith('cooldown:ping:user-1', '1', {
      NX: true,
      PX: 5_000,
    });
    expect(pTTL).toHaveBeenCalledWith('cooldown:ping:user-1');
  });
});
