import 'reflect-metadata';

import { Client } from 'discord.js';

import { bootstrap } from '../src/bootstrap';
import { loadConfig } from '../src/config';
import { createDataSource } from '../src/database';
import type { RedisConnection } from '../src/redis';
import { createLogger } from '../src/utils/logger';

describe('bootstrap', () => {
  it('assembles the application without connecting to Discord', async () => {
    const config = loadConfig({
      env: {
        NODE_ENV: 'test',
        DISCORD_TOKEN: 'test-token',
        DISCORD_CLIENT_ID: 'test-client-id',
        REDIS_URL: 'redis://localhost:6379',
      },
    });
    const database = createDataSource(':memory:');
    await database.initialize();
    const client = new Client({ intents: [] });
    const connect = jest.fn().mockResolvedValue(undefined);
    const close = jest.fn().mockResolvedValue(undefined);
    const redis = {
      connect,
      close,
      isOpen: true,
    } as unknown as RedisConnection;
    const application = await bootstrap({
      client,
      config,
      database,
      logger: createLogger(config.logging),
      login: false,
      redis,
    });

    expect(application.context.commands.has('ping')).toBe(true);
    expect(application.context.commands.has('set-welcome')).toBe(true);
    expect(database.migrations).toHaveLength(1);
    expect(connect).toHaveBeenCalled();
    await application.shutdown('test complete');
    expect(database.isInitialized).toBe(false);
    expect(close).toHaveBeenCalled();
  });
});
