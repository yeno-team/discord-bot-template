import type { EventEmitter } from 'node:events';

import type { Client } from 'discord.js';
import type { DependencyContainer, InjectionToken } from 'tsyringe';

import type { BotEvent, BotEventConstructor } from '../types';
import type { AppLogger } from '../utils/logger';
import { findModuleFiles, loadDefaultExport } from './load-modules';

function isBotEventConstructor(value: unknown): value is BotEventConstructor {
  if (typeof value !== 'function') return false;
  const candidate = value as Partial<BotEventConstructor>;
  return typeof candidate.prototype?.execute === 'function';
}

interface RuntimeEvent {
  readonly name: string;
  readonly once?: boolean;
  execute(...args: unknown[]): Promise<void> | void;
}

export async function registerEvents(
  client: Client,
  directory: string,
  container: DependencyContainer,
  logger: AppLogger,
): Promise<void> {
  for (const file of await findModuleFiles(directory)) {
    const eventType = loadDefaultExport(file);
    if (!isBotEventConstructor(eventType)) throw new Error(`Invalid event module: ${file}`);
    const token = eventType as unknown as InjectionToken<BotEvent>;
    const event = container.resolve(token);
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
