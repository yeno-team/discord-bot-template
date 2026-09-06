import {
  Collection,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';

import { InteractionHandler } from '../../src/handlers';
import type { RedisConnection } from '../../src/redis';
import { CooldownService } from '../../src/services';
import type { SlashCommand } from '../../src/types';
import type { AppLogger } from '../../src/utils/logger';

function createInteraction(overrides: { readonly guildId?: string | null } = {}): {
  interaction: ChatInputCommandInteraction;
  reply: jest.Mock;
} {
  const reply = jest.fn().mockResolvedValue(undefined);
  const interaction = {
    isChatInputCommand: () => true,
    commandName: 'example',
    id: 'interaction-1',
    guildId: 'guild-1',
    guild: null,
    channelId: 'channel-1',
    memberPermissions: null,
    user: { id: 'user-1' },
    reply,
    ...overrides,
  } as unknown as ChatInputCommandInteraction;
  return { interaction, reply };
}

function createHandler(command: SlashCommand): InteractionHandler {
  const redis = {
    acquireCooldown: jest.fn().mockResolvedValue(0),
  } as unknown as RedisConnection;
  return new InteractionHandler(
    new Collection([['example', command]]),
    new CooldownService(redis),
    { error: jest.fn() } as unknown as AppLogger,
  );
}

describe('handleInteraction', () => {
  it('blocks a guild-only command in direct messages', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const command: SlashCommand = {
      data: new SlashCommandBuilder().setName('example').setDescription('Example'),
      metadata: { category: 'test', guildOnly: true },
      execute,
    };
    const { interaction, reply } = createInteraction({ guildId: null });

    await createHandler(command).handle(interaction);

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith({
      content: 'This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
  });

  it('executes an eligible command with the injected context', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const command: SlashCommand = {
      data: new SlashCommandBuilder().setName('example').setDescription('Example'),
      metadata: { category: 'test' },
      execute,
    };
    const handler = createHandler(command);
    const { interaction } = createInteraction();

    await handler.handle(interaction);

    expect(execute).toHaveBeenCalledWith(interaction);
  });
});
