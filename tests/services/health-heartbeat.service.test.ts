import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { Client } from 'discord.js';

import { loadConfig } from '../../src/config';
import type { RedisConnection } from '../../src/redis';
import { HealthHeartbeatService } from '../../src/services';
import type { AppLogger } from '../../src/utils/logger';

describe('HealthHeartbeatService', () => {
  let directory: string;
  let file: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'heartbeat-'));
    file = path.join(directory, 'healthy');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function createService(options: {
    readonly file?: string;
    readonly discordReady: boolean;
    readonly redisReady: boolean;
  }): HealthHeartbeatService {
    const config = loadConfig({
      env: {
        NODE_ENV: 'test',
        DISCORD_TOKEN: 'test-token',
        DISCORD_CLIENT_ID: 'test-client-id',
        REDIS_URL: 'redis://localhost:6379',
        ...(options.file === undefined ? {} : { HEALTHCHECK_FILE: options.file }),
      },
    });
    const client = { isReady: () => options.discordReady } as unknown as Client;
    const redis = { isReady: options.redisReady } as unknown as RedisConnection;
    return new HealthHeartbeatService(config, client, redis, {
      warn: jest.fn(),
    } as unknown as AppLogger);
  }

  it('writes the heartbeat only while Discord and Redis are ready', async () => {
    await expect(
      createService({ file, discordReady: false, redisReady: true }).beat(),
    ).resolves.toBe(false);
    await expect(
      createService({ file, discordReady: true, redisReady: false }).beat(),
    ).resolves.toBe(false);
    expect(existsSync(file)).toBe(false);

    await expect(
      createService({ file, discordReady: true, redisReady: true }).beat(),
    ).resolves.toBe(true);
    expect(Number(readFileSync(file, 'utf8'))).toBeGreaterThan(0);
  });

  it('removes the heartbeat on shutdown', async () => {
    const service = createService({ file, discordReady: true, redisReady: true });
    await service.beat();

    await service.stop();

    expect(existsSync(file)).toBe(false);
  });

  it('does nothing when no heartbeat file is configured', async () => {
    const service = createService({ discordReady: true, redisReady: true });

    service.start();

    await expect(service.beat()).resolves.toBe(false);
    await expect(service.stop()).resolves.toBeUndefined();
  });
});
