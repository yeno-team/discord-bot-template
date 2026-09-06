import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

const environmentSchema = z.enum(['development', 'test', 'production']);

const rawConfigSchema = z.object({
  NODE_ENV: environmentSchema.default('development'),
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  DATABASE_PATH: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export interface AppConfig {
  readonly env: Environment;
  readonly discord: {
    readonly token: string;
    readonly clientId: string;
    readonly guildId?: string;
  };
  readonly database: {
    readonly path: string;
  };
  readonly logging: {
    readonly level: NonNullable<z.infer<typeof rawConfigSchema>['LOG_LEVEL']>;
    readonly pretty: boolean;
  };
}

export interface LoadConfigOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly cwd?: string;
}

export class ConfigError extends Error {
  public constructor(public readonly issues: readonly string[]) {
    super(`Invalid environment configuration:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

export function loadConfig(options: LoadConfigOptions = {}): AppConfig {
  const source = options.env ?? process.env;
  const environment = environmentSchema.catch('development').parse(source.NODE_ENV);

  if (environment === 'development') {
    dotenv.config({
      path: path.resolve(options.cwd ?? process.cwd(), '.env.development'),
      processEnv: source,
      quiet: true,
    });
  }

  const parsed = rawConfigSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }

  const raw = parsed.data;
  const databasePath =
    raw.DATABASE_PATH ?? (raw.NODE_ENV === 'test' ? ':memory:' : './data/bot.sqlite');

  return {
    env: raw.NODE_ENV,
    discord: {
      token: raw.DISCORD_TOKEN,
      clientId: raw.DISCORD_CLIENT_ID,
      ...(raw.DISCORD_GUILD_ID === undefined ? {} : { guildId: raw.DISCORD_GUILD_ID }),
    },
    database: { path: databasePath },
    logging: {
      level: raw.LOG_LEVEL ?? (raw.NODE_ENV === 'test' ? 'silent' : 'info'),
      pretty: raw.NODE_ENV === 'development',
    },
  };
}
