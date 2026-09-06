import type { ClientEvents } from 'discord.js';

import type { AppContext } from './context';

export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  readonly name: K;
  readonly once?: boolean;
  execute(context: AppContext, ...args: ClientEvents[K]): Promise<void> | void;
}
