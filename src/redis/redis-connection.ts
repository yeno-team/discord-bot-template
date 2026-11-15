import { createClient, type RedisClientType } from 'redis';
import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../config';
import { TOKENS } from '../container/tokens';
import type { AppLogger } from '../utils/logger';

const INITIAL_CONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY_MILLISECONDS = 2_000;

/**
 * Startup gives up after a few attempts so a missing Redis fails fast. Once connected,
 * the client keeps retrying forever so a Redis restart cannot leave the bot permanently broken.
 */
export function getReconnectDelay(retries: number, hasConnected: boolean): number | Error {
  if (!hasConnected && retries >= INITIAL_CONNECT_ATTEMPTS) {
    return new Error('Redis connection could not be established');
  }
  return Math.min(100 * 2 ** retries, MAX_RECONNECT_DELAY_MILLISECONDS);
}

@injectable()
export class RedisConnection {
  private readonly client: RedisClientType;
  private hasConnected = false;

  public constructor(
    @inject(TOKENS.config) config: AppConfig,
    @inject(TOKENS.logger) logger: AppLogger,
  ) {
    this.client = createClient({
      url: config.redis.url,
      // Reject commands while reconnecting so interactions get an error reply
      // instead of waiting past Discord's three-second response window.
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 10_000,
        reconnectStrategy: (retries) => getReconnectDelay(retries, this.hasConnected),
      },
    });
    this.client.on('ready', () => {
      this.hasConnected = true;
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

  public async setIfAbsent(key: string, value: string, ttlMilliseconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, {
      NX: true,
      PX: ttlMilliseconds,
    });
    return result === 'OK';
  }

  public getTtlMilliseconds(key: string): Promise<number> {
    return this.client.pTTL(key);
  }
}
