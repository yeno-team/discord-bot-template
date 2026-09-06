import 'reflect-metadata';

import { Client } from 'discord.js';

import { bootstrap } from '../src/bootstrap';
import { loadConfig } from '../src/config';
import { createDataSource } from '../src/database';
import { createLogger } from '../src/utils/logger';

describe('bootstrap', () => {
  it('assembles the application without connecting to Discord', async () => {
    const config = loadConfig({
      env: {
        NODE_ENV: 'test',
        DISCORD_TOKEN: 'test-token',
        DISCORD_CLIENT_ID: 'test-client-id',
      },
    });
    const database = createDataSource(':memory:');
    await database.initialize();
    const client = new Client({ intents: [] });
    const application = await bootstrap({
      client,
      config,
      database,
      logger: createLogger(config.logging),
      login: false,
    });

    expect(application.context.commands.has('ping')).toBe(true);
    expect(application.context.commands.has('set-welcome')).toBe(true);
    expect(database.migrations).toHaveLength(1);

    await application.shutdown('test complete');
    expect(database.isInitialized).toBe(false);
  });
});
