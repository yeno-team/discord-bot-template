import { injectable } from 'tsyringe';

import { RedisConnection } from '../redis';

@injectable()
export class CooldownService {
  public constructor(private readonly redis: RedisConnection) {}

  public consume(key: string, durationSeconds: number): Promise<number> {
    if (durationSeconds <= 0) return Promise.resolve(0);
    return this.redis.acquireCooldown(key, durationSeconds * 1000);
  }
}
