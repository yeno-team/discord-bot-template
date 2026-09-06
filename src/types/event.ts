import type { ClientEvents } from 'discord.js';

export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  readonly name: K;
  readonly once?: boolean;
  execute(...args: ClientEvents[K]): Promise<void> | void;
}

export interface BotEventConstructor {
  readonly prototype: BotEvent;
}
