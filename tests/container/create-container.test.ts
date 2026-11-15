import { Client } from 'discord.js';

import { createServices } from '../../src/app';
import { loadConfig } from '../../src/config';
import { createDependencyContainer } from '../../src/container';
import { createDataSource } from '../../src/database';
import { CooldownService, HealthService, WelcomeSettingsService } from '../../src/services';
import { createLogger } from '../../src/utils/logger';

describe('dependency container', () => {
  it('exposes the services created by the composition root', async () => {
    const config = loadConfig({
      env: {
        NODE_ENV: 'test',
        DISCORD_TOKEN: 'test-token',
        DISCORD_CLIENT_ID: 'test-client-id',
        REDIS_URL: 'redis://localhost:6379',
      },
    });
    const database = await createDataSource(':memory:').initialize();
    const client = new Client({ intents: [] });
    const logger = createLogger(config.logging);
    const services = createServices({ client, config, database, logger });
    const container = createDependencyContainer({ client, config, logger, services });

    expect(container.resolve(HealthService)).toBe(services.health);
    expect(container.resolve(WelcomeSettingsService)).toBe(services.welcomeSettings);
    expect(container.resolve(CooldownService)).toBe(services.cooldowns);

    await database.destroy();
  });
});
