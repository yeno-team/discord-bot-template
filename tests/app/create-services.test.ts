import { Client } from 'discord.js';
import type { DataSource } from 'typeorm';

import { createServices } from '../../src/app';
import { createCommands, commandDefinitions } from '../../src/commands';
import { loadConfig } from '../../src/config';
import type { RedisConnection } from '../../src/redis';
import { createLogger } from '../../src/utils/logger';

function createTestServices() {
  const config = loadConfig({
    env: {
      NODE_ENV: 'test',
      DISCORD_TOKEN: 'test-token',
      DISCORD_CLIENT_ID: 'test-client-id',
      REDIS_URL: 'redis://localhost:6379',
    },
  });
  const redis = { isOpen: false } as unknown as RedisConnection;
  const services = createServices({
    client: new Client({ intents: [] }),
    config,
    database: { getRepository: jest.fn() } as unknown as DataSource,
    logger: createLogger(config.logging),
    redis,
  });
  return { redis, services };
}

describe('composition root', () => {
  it('shares one Redis connection across services', () => {
    const { redis, services } = createTestServices();

    expect(services.redis).toBe(redis);
  });

  it('creates a command for every deployed definition', () => {
    const { services } = createTestServices();
    const created = createCommands(services).map((command) => command.data.name);
    const deployed = commandDefinitions.map((definition) => definition.data.name);

    expect(created).toEqual(deployed);
    expect(new Set(deployed).size).toBe(deployed.length);
  });
});
