import { inject, injectable } from 'tsyringe';
import { DataSource } from 'typeorm';

import { TOKENS } from '../container/tokens';
export interface HealthStatus {
  readonly database: 'connected' | 'disconnected';
  readonly uptimeSeconds: number;
}

@injectable()
export class HealthService {
  public constructor(
    private readonly database: DataSource,
    @inject(TOKENS.uptime)
    private readonly getUptime: () => number = () => process.uptime(),
  ) {}

  public getStatus(): HealthStatus {
    return {
      database: this.database.isInitialized ? 'connected' : 'disconnected',
      uptimeSeconds: Math.floor(this.getUptime()),
    };
  }
}
