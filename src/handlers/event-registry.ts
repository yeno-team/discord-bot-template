import type { EventEmitter } from 'node:events';

import type { Client } from 'discord.js';

import type { BotEvent } from '../types';
import type { AppLogger } from '../utils/logger';

interface RuntimeEvent {
  readonly name: string;
  readonly once?: boolean;
  execute(...args: unknown[]): Promise<void> | void;
}

export function registerEvents(
  client: Client,
  events: readonly BotEvent[],
  logger: AppLogger,
): void {
  for (const event of events) {
    const runtimeEvent = event as unknown as RuntimeEvent;

    const listener = (...args: unknown[]): void => {
      const result = runtimeEvent.execute(...args);
      void Promise.resolve(result).catch((error: unknown) => {
        logger.error({ err: error, event: event.name }, 'Event handler failed');
      });
    };

    const emitter: EventEmitter = client;
    if (event.once === true) emitter.once(event.name, listener);
    else emitter.on(event.name, listener);
    logger.debug({ event: event.name }, 'Registered event');
  }
}
