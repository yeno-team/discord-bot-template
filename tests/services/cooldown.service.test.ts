import { CooldownService } from '../../src/services';

describe('CooldownService', () => {
  it('tracks cooldowns by key and reports remaining whole seconds', () => {
    let now = 1_000;
    const cooldowns = new CooldownService(() => now);

    expect(cooldowns.consume('ping:user-1', 5)).toBe(0);
    now = 2_500;
    expect(cooldowns.consume('ping:user-1', 5)).toBe(4);
    expect(cooldowns.consume('ping:user-2', 5)).toBe(0);
    now = 6_000;
    expect(cooldowns.consume('ping:user-1', 5)).toBe(0);
  });
});
