import { Client } from 'discord.js';

import { loadConfig } from '../../src/config';
import { createDependencyContainer } from '../../src/container';
import { createDataSource } from '../../src/database';
import { CooldownService, HealthService, WelcomeSettingsService } from '../../src/services';
import { createLogger } from '../../src/utils/logger';

describe('dependency container', () => {
  it('auto-resolves dependency chains and preserves application-scoped state', async () => {
    const config = loadConfig({
      env: {
        NODE_ENV: 'test',
        DISCORD_TOKEN: 'test-token',
        DISCORD_CLIENT_ID: 'test-client-id',
        REDIS_URL: 'redis://localhost:6379',
      },
    });
    const database = await createDataSource(':memory:').initialize();
    const container = createDependencyContainer({
      client: new Client({ intents: [] }),
      config,
      database,
      logger: createLogger(config.logging),
    });

    expect(container.resolve(HealthService)).toBeInstanceOf(HealthService);
    expect(container.resolve(WelcomeSettingsService)).toBeInstanceOf(WelcomeSettingsService);
    expect(container.resolve(CooldownService)).toBe(container.resolve(CooldownService));

    await database.destroy();
  });
});
