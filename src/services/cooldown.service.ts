import { injectable } from 'tsyringe';

import { RedisConnection } from '../redis';

@injectable()
export class CooldownService {
  public constructor(private readonly redis: RedisConnection) {}

  public async consume(key: string, durationSeconds: number): Promise<number> {
    if (durationSeconds <= 0) return 0;

    const redisKey = `cooldown:${key}`;
    const acquired = await this.redis.setIfAbsent(redisKey, '1', durationSeconds * 1000);
    if (acquired) return 0;

    const remainingMilliseconds = await this.redis.getTtlMilliseconds(redisKey);
    return remainingMilliseconds > 0 ? Math.ceil(remainingMilliseconds / 1000) : 0;
  }
}
