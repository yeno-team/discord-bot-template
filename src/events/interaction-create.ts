import { Events } from 'discord.js';
import { injectable } from 'tsyringe';

import { InteractionHandler } from '../handlers';
import type { BotEvent } from '../types';

@injectable()
export default class InteractionCreateEvent implements BotEvent<Events.InteractionCreate> {
  public readonly name = Events.InteractionCreate;

  public constructor(private readonly interactions: InteractionHandler) {}

  public async execute(interaction: Parameters<BotEvent<Events.InteractionCreate>['execute']>[0]) {
    await this.interactions.handle(interaction);
  }
}
