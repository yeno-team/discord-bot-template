import { Events } from 'discord.js';

import type { BotEvent } from '../types';

const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute(context, client) {
    context.logger.info({ user: client.user.tag }, 'Discord client is ready');
  },
};

export default event;
