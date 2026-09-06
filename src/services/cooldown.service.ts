import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../container/tokens';

export type Clock = () => number;

@injectable()
export class CooldownService {
  private readonly expirations = new Map<string, number>();

  public constructor(@inject(TOKENS.clock) private readonly now: Clock = Date.now) {}

  public consume(key: string, durationSeconds: number): number {
    const now = this.now();
    const expiration = this.expirations.get(key) ?? 0;

    if (expiration > now) {
      return Math.ceil((expiration - now) / 1000);
    }

    this.expirations.set(key, now + durationSeconds * 1000);
    return 0;
  }
}
