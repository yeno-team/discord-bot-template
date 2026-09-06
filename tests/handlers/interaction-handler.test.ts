import {
  Collection,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';

import { handleInteraction } from '../../src/handlers';
import { CooldownService } from '../../src/services';
import type { AppContext, SlashCommand } from '../../src/types';

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

function createContext(command: SlashCommand): AppContext {
  return {
    commands: new Collection([['example', command]]),
    services: { cooldowns: new CooldownService() },
    logger: { error: jest.fn() },
  } as unknown as AppContext;
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

    await handleInteraction(interaction, createContext(command));

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
    const context = createContext(command);
    const { interaction } = createInteraction();

    await handleInteraction(interaction, context);

    expect(execute).toHaveBeenCalledWith(interaction, context);
  });
});
