import type { EventEmitter } from 'node:events';

import type { Client, ClientEvents } from 'discord.js';

import type { AppContext } from '../types';
import { findModuleFiles, loadDefaultExport } from './load-modules';

interface RuntimeEvent {
  readonly name: keyof ClientEvents;
  readonly once?: boolean;
  execute(context: AppContext, ...args: unknown[]): Promise<void> | void;
}

function isBotEvent(value: unknown): value is RuntimeEvent {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<RuntimeEvent>;
  return typeof candidate.name === 'string' && typeof candidate.execute === 'function';
}

export async function registerEvents(
  client: Client,
  directory: string,
  context: AppContext,
): Promise<void> {
  for (const file of await findModuleFiles(directory)) {
    const event = loadDefaultExport(file);
    if (!isBotEvent(event)) throw new Error(`Invalid event module: ${file}`);

    const listener = (...args: unknown[]): void => {
      void Promise.resolve(event.execute(context, ...args)).catch((error: unknown) => {
        context.logger.error({ err: error, event: event.name }, 'Event handler failed');
      });
    };

    const emitter: EventEmitter = client;
    if (event.once === true) emitter.once(event.name, listener);
    else emitter.on(event.name, listener);
    context.logger.debug({ event: event.name }, 'Registered event');
  }
}
