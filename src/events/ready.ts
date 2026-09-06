import { Events } from 'discord.js';
import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../container';
import type { BotEvent } from '../types';
import type { AppLogger } from '../utils/logger';

@injectable()
export default class ReadyEvent implements BotEvent<Events.ClientReady> {
  public readonly name = Events.ClientReady;
  public readonly once = true;

  public constructor(@inject(TOKENS.logger) private readonly logger: AppLogger) {}

  public execute(client: Parameters<BotEvent<Events.ClientReady>['execute']>[0]): void {
    this.logger.info({ user: client.user.tag }, 'Discord client is ready');
  }
}
