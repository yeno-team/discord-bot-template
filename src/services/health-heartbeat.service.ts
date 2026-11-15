import { rm, writeFile } from 'node:fs/promises';

import type { Client } from 'discord.js';
import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../config';
import { TOKENS } from '../container/tokens';
import { RedisConnection } from '../redis';
import type { AppLogger } from '../utils/logger';

export const HEARTBEAT_INTERVAL_MILLISECONDS = 10_000;

/**
 * Touches a file while Discord and Redis are both ready. A container health check
 * treats a stale or missing file as unhealthy, so a bot that cannot log in never
 * passes `docker compose up --wait`.
 */
@injectable()
export class HealthHeartbeatService {
  private timer: NodeJS.Timeout | undefined;

  public constructor(
    @inject(TOKENS.config) private readonly config: AppConfig,
    @inject(TOKENS.client) private readonly client: Client,
    private readonly redis: RedisConnection,
    @inject(TOKENS.logger) private readonly logger: AppLogger,
  ) {}

  public start(): void {
    if (this.config.health.file === undefined || this.timer !== undefined) return;
    void this.beat();
    this.timer = setInterval(() => void this.beat(), HEARTBEAT_INTERVAL_MILLISECONDS);
    this.timer.unref();
  }

  public async beat(): Promise<boolean> {
    const file = this.config.health.file;
    if (file === undefined || !this.client.isReady() || !this.redis.isReady) return false;

    try {
      await writeFile(file, String(Date.now()));
      return true;
    } catch (error) {
      this.logger.warn({ err: error, file }, 'Failed to write health heartbeat');
      return false;
    }
  }

  public async stop(): Promise<void> {
    clearInterval(this.timer);
    this.timer = undefined;
    if (this.config.health.file !== undefined) await rm(this.config.health.file, { force: true });
  }
}
