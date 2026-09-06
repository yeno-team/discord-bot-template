import { CooldownService } from '../../src/services';
import type { RedisConnection } from '../../src/redis';

describe('CooldownService', () => {
  it('stores cooldowns in Redis using milliseconds', async () => {
    const setIfAbsent = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const getTtlMilliseconds = jest.fn().mockResolvedValue(3_501);
    const redis = { setIfAbsent, getTtlMilliseconds } as unknown as RedisConnection;
    const cooldowns = new CooldownService(redis);

    await expect(cooldowns.consume('ping:user-1', 5)).resolves.toBe(0);
    await expect(cooldowns.consume('ping:user-1', 5)).resolves.toBe(4);
    expect(setIfAbsent).toHaveBeenCalledWith('cooldown:ping:user-1', '1', 5_000);
    expect(getTtlMilliseconds).toHaveBeenCalledWith('cooldown:ping:user-1');
  });

  it('does not contact Redis for commands without a cooldown', async () => {
    const setIfAbsent = jest.fn();
    const cooldowns = new CooldownService({ setIfAbsent } as unknown as RedisConnection);

    await expect(cooldowns.consume('example:user-1', 0)).resolves.toBe(0);
    expect(setIfAbsent).not.toHaveBeenCalled();
  });
});
