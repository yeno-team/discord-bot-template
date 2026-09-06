import { CooldownService } from '../../src/services';
import type { RedisConnection } from '../../src/redis';

describe('CooldownService', () => {
  it('stores cooldowns in Redis using milliseconds', async () => {
    const acquireCooldown = jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(4);
    const redis = { acquireCooldown } as unknown as RedisConnection;
    const cooldowns = new CooldownService(redis);

    await expect(cooldowns.consume('ping:user-1', 5)).resolves.toBe(0);
    await expect(cooldowns.consume('ping:user-1', 5)).resolves.toBe(4);
    expect(acquireCooldown).toHaveBeenCalledWith('ping:user-1', 5_000);
  });

  it('does not contact Redis for commands without a cooldown', async () => {
    const acquireCooldown = jest.fn();
    const cooldowns = new CooldownService({ acquireCooldown } as unknown as RedisConnection);

    await expect(cooldowns.consume('example:user-1', 0)).resolves.toBe(0);
    expect(acquireCooldown).not.toHaveBeenCalled();
  });
});
