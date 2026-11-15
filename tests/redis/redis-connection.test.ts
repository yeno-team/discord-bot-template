import { createClient } from 'redis';

import { loadConfig } from '../../src/config';
import { RedisConnection } from '../../src/redis';
import { getReconnectDelay } from '../../src/redis/redis-connection';
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

  it('fails startup quickly but keeps reconnecting after the first connection', () => {
    const handlers = new Map<string, () => void>();
    const on = jest.fn((event: string, handler: () => void) => handlers.set(event, handler));
    jest.mocked(createClient).mockReturnValue({ on, isOpen: false } as never);
    const config = loadConfig({
      env: {
        NODE_ENV: 'test',
        DISCORD_TOKEN: 'test-token',
        DISCORD_CLIENT_ID: 'test-client-id',
        REDIS_URL: 'redis://localhost:6379',
      },
    });
    new RedisConnection(config, { error: jest.fn() } as unknown as AppLogger);
    const options = jest.mocked(createClient).mock.calls[0]?.[0];
    const socket = options?.socket as { reconnectStrategy: (retries: number) => number | Error };

    expect(socket.reconnectStrategy(5)).toBeInstanceOf(Error);

    handlers.get('ready')?.();

    expect(socket.reconnectStrategy(5)).toBe(2_000);
    expect(socket.reconnectStrategy(1_000)).toBe(2_000);
  });
});

describe('getReconnectDelay', () => {
  it('backs off exponentially up to a cap', () => {
    expect(getReconnectDelay(0, true)).toBe(100);
    expect(getReconnectDelay(3, true)).toBe(800);
    expect(getReconnectDelay(10, true)).toBe(2_000);
  });
});
