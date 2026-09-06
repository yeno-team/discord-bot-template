import { Events } from 'discord.js';

import { handleInteraction } from '../handlers';
import type { BotEvent } from '../types';

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(context, interaction) {
    await handleInteraction(interaction, context);
  },
};

export default event;
