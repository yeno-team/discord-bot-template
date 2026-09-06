import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

import type { AppConfig } from '../config';

export type AppLogger = Logger;

export function createLogger(config: AppConfig['logging']): AppLogger {
  const options: LoggerOptions = {
    level: config.level,
    base: { service: 'discord-bot' },
    redact: {
      paths: ['token', 'discord.token', 'config.discord.token', 'req.headers.authorization'],
      censor: '[REDACTED]',
    },
  };

  if (config.pretty) {
    return pino(
      options,
      pino.transport({
        target: 'pino-pretty',
        options: { colorize: true, singleLine: true, translateTime: 'SYS:standard' },
      }) as DestinationStream,
    );
  }

  return pino(options);
}
