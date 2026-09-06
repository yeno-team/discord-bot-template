import { createClient, type RedisClientType } from 'redis';
import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../config';
import { TOKENS } from '../container/tokens';
import type { AppLogger } from '../utils/logger';

@injectable()
export class RedisConnection {
  private readonly client: RedisClientType;

  public constructor(
    @inject(TOKENS.config) config: AppConfig,
    @inject(TOKENS.logger) logger: AppLogger,
  ) {
    this.client = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 10_000,
        reconnectStrategy: (retries) => {
          if (retries >= 5) return new Error('Redis reconnect limit reached');
          return Math.min(100 * 2 ** retries, 2_000);
        },
      },
    });
    this.client.on('error', (error: Error) => {
      logger.error({ err: error }, 'Redis client error');
    });
  }

  public get isOpen(): boolean {
    return this.client.isOpen;
  }

  public async connect(): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
  }

  public async close(): Promise<void> {
    if (this.client.isOpen) await this.client.close();
  }

  public async acquireCooldown(key: string, durationMilliseconds: number): Promise<number> {
    const redisKey = `cooldown:${key}`;
    const result = await this.client.set(redisKey, '1', {
      NX: true,
      PX: durationMilliseconds,
    });
    if (result === 'OK') return 0;

    const remainingMilliseconds = await this.client.pTTL(redisKey);
    return remainingMilliseconds > 0 ? Math.ceil(remainingMilliseconds / 1000) : 0;
  }
}
