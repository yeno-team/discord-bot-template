import type { InteractionHandler } from '../handlers';
import type { BotEvent } from '../types';
import type { AppLogger } from '../utils/logger';
import InteractionCreateEvent from './interaction-create';
import ReadyEvent from './ready';

export interface EventDependencies {
  readonly interactions: InteractionHandler;
  readonly logger: AppLogger;
}

/** Every Discord client event listener, in one place. */
export function createEvents({ interactions, logger }: EventDependencies): readonly BotEvent[] {
  return [new ReadyEvent(logger), new InteractionCreateEvent(interactions)];
}
