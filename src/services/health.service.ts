import type { DataSource } from 'typeorm';

export interface HealthStatus {
  readonly database: 'connected' | 'disconnected';
  readonly uptimeSeconds: number;
}

export class HealthService {
  public constructor(
    private readonly database: DataSource,
    private readonly getUptime: () => number = () => process.uptime(),
  ) {}

  public getStatus(): HealthStatus {
    return {
      database: this.database.isInitialized ? 'connected' : 'disconnected',
      uptimeSeconds: Math.floor(this.getUptime()),
    };
  }
}
