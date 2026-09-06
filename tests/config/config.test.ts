import { ConfigError, loadConfig } from '../../src/config';

const requiredEnvironment = {
  DISCORD_TOKEN: 'test-token',
  DISCORD_CLIENT_ID: 'test-client-id',
};

describe('loadConfig', () => {
  it('uses isolated defaults in the test environment', () => {
    const config = loadConfig({
      env: { ...requiredEnvironment, NODE_ENV: 'test' },
    });

    expect(config.env).toBe('test');
    expect(config.database.path).toBe(':memory:');
    expect(config.logging.level).toBe('silent');
    expect(config.logging.pretty).toBe(false);
  });

  it('does not load a local dotenv file in production', () => {
    expect(() =>
      loadConfig({
        env: { NODE_ENV: 'production' },
      }),
    ).toThrow(ConfigError);
  });

  it('reports all missing required values', () => {
    expect(() => loadConfig({ env: { NODE_ENV: 'test' } })).toThrow(
      /DISCORD_TOKEN.*DISCORD_CLIENT_ID/s,
    );
  });
});
