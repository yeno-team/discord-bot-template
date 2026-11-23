import {
  ApplicationCommandType,
  Collection,
  ContextMenuCommandBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';

import { ComponentRegistry, contextMenuKey, InteractionHandler } from '../../src/handlers';
import type { RedisConnection } from '../../src/redis';
import { CooldownService } from '../../src/services';
import type { ComponentHandler, ContextMenuCommand, SlashCommand } from '../../src/types';
import type { AppLogger } from '../../src/utils/logger';

type Kind =
  'chat' | 'autocomplete' | 'userMenu' | 'messageMenu' | 'button' | 'selectMenu' | 'modal';

function createInteraction(
  kind: Kind,
  overrides: Readonly<Record<string, unknown>> = {},
): { interaction: Interaction; reply: jest.Mock } {
  const reply = jest.fn().mockResolvedValue(undefined);
  const interaction = {
    isChatInputCommand: () => kind === 'chat',
    isAutocomplete: () => kind === 'autocomplete',
    isUserContextMenuCommand: () => kind === 'userMenu',
    isMessageContextMenuCommand: () => kind === 'messageMenu',
    commandType:
      kind === 'messageMenu' ? ApplicationCommandType.Message : ApplicationCommandType.User,
    isButton: () => kind === 'button',
    isAnySelectMenu: () => kind === 'selectMenu',
    isModalSubmit: () => kind === 'modal',
    commandName: 'example',
    customId: 'example',
    id: 'interaction-1',
    guildId: 'guild-1',
    guild: null,
    channelId: 'channel-1',
    memberPermissions: null,
    user: { id: 'user-1' },
    replied: false,
    deferred: false,
    reply,
    ...overrides,
  } as unknown as Interaction;
  return { interaction, reply };
}

function createHandler(
  options: {
    readonly command?: SlashCommand;
    readonly contextMenu?: ContextMenuCommand;
    readonly components?: readonly ComponentHandler[];
    readonly cooldownFree?: boolean;
  } = {},
): InteractionHandler {
  const redis = {
    setIfAbsent: jest.fn().mockResolvedValue(options.cooldownFree ?? true),
    getTtlMilliseconds: jest.fn().mockResolvedValue(2_000),
  } as unknown as RedisConnection;
  const menu = options.contextMenu;
  return new InteractionHandler({
    commands: new Collection(options.command === undefined ? [] : [['example', options.command]]),
    contextMenus: new Collection(
      menu === undefined ? [] : [[contextMenuKey(menu.data.type, menu.data.name), menu]],
    ),
    components: new ComponentRegistry(options.components ?? []),
    cooldowns: new CooldownService(redis),
    logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as AppLogger,
  });
}

function createCommand(metadata: SlashCommand['metadata']): {
  command: SlashCommand;
  execute: jest.Mock;
} {
  const execute = jest.fn().mockResolvedValue(undefined);
  const command: SlashCommand = {
    data: new SlashCommandBuilder().setName('example').setDescription('Example'),
    metadata,
    execute,
  };
  return { command, execute };
}

describe('InteractionHandler commands', () => {
  it('blocks a guild-only command in direct messages', async () => {
    const { command, execute } = createCommand({ category: 'test', guildOnly: true });
    const { interaction, reply } = createInteraction('chat', { guildId: null });

    await createHandler({ command }).handle(interaction);

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith({
      content: 'This can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
  });

  it('executes an eligible command', async () => {
    const { command, execute } = createCommand({ category: 'test' });
    const { interaction } = createInteraction('chat');

    await createHandler({ command }).handle(interaction);

    expect(execute).toHaveBeenCalledWith(interaction as ChatInputCommandInteraction);
  });

  it('replies when a command is unknown', async () => {
    const { interaction, reply } = createInteraction('chat');

    await createHandler().handle(interaction);

    expect(reply).toHaveBeenCalledWith({
      content: 'This command is unavailable.',
      flags: MessageFlags.Ephemeral,
    });
  });

  it('reports a thrown error to the user', async () => {
    const { command, execute } = createCommand({ category: 'test' });
    execute.mockRejectedValue(new Error('boom'));
    const { interaction, reply } = createInteraction('chat');

    await createHandler({ command }).handle(interaction);

    expect(reply).toHaveBeenCalledWith({
      content: 'Something went wrong. Please try again.',
      flags: MessageFlags.Ephemeral,
    });
  });
});

describe('InteractionHandler components', () => {
  function createComponent(
    kind: ComponentHandler['kind'],
    prefix: string,
    metadata: ComponentHandler['metadata'] = {},
  ): { component: ComponentHandler; execute: jest.Mock } {
    const execute = jest.fn().mockResolvedValue(undefined);
    return { component: { kind, prefix, metadata, execute }, execute };
  }

  it.each(['button', 'selectMenu', 'modal'] as const)(
    'routes a %s by prefix and passes its args',
    async (kind) => {
      const { component, execute } = createComponent(kind, 'ticket');
      const { interaction } = createInteraction(kind, { customId: 'ticket:close:42' });

      await createHandler({ components: [component] }).handle(interaction);

      expect(execute).toHaveBeenCalledWith(interaction, ['close', '42']);
    },
  );

  it('does not route a button to a modal handler with the same prefix', async () => {
    const { component: modal, execute } = createComponent('modal', 'ticket');
    const { interaction, reply } = createInteraction('button', { customId: 'ticket' });

    await createHandler({ components: [modal] }).handle(interaction);

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith({
      content: 'This is no longer available.',
      flags: MessageFlags.Ephemeral,
    });
  });

  it('applies cooldowns to components', async () => {
    const { component, execute } = createComponent('button', 'ticket', { cooldownSeconds: 5 });
    const { interaction, reply } = createInteraction('button', { customId: 'ticket' });

    await createHandler({ components: [component], cooldownFree: false }).handle(interaction);

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith({
      content: 'Please wait 2s before trying again.',
      flags: MessageFlags.Ephemeral,
    });
  });

  it('ignores other interaction types', async () => {
    const { interaction, reply } = createInteraction('chat', {
      isChatInputCommand: () => false,
    });

    await createHandler().handle(interaction);

    expect(reply).not.toHaveBeenCalled();
  });
});

describe('InteractionHandler autocomplete', () => {
  it('passes autocomplete to the command', async () => {
    const { command } = createCommand({ category: 'test' });
    const autocomplete = jest.fn().mockResolvedValue(undefined);
    const { interaction } = createInteraction('autocomplete');

    await createHandler({ command: { ...command, autocomplete } }).handle(interaction);

    expect(autocomplete).toHaveBeenCalledWith(interaction);
  });

  it('responds with no choices when the command has no autocomplete', async () => {
    const respond = jest.fn().mockResolvedValue(undefined);
    const { command } = createCommand({ category: 'test' });
    const { interaction } = createInteraction('autocomplete', { respond });

    await createHandler({ command }).handle(interaction);

    expect(respond).toHaveBeenCalledWith([]);
  });

  it('responds with no choices when autocomplete throws', async () => {
    const respond = jest.fn().mockResolvedValue(undefined);
    const { command } = createCommand({ category: 'test' });
    const autocomplete = jest.fn().mockRejectedValue(new Error('boom'));
    const { interaction } = createInteraction('autocomplete', { respond, responded: false });

    await createHandler({ command: { ...command, autocomplete } }).handle(interaction);

    expect(respond).toHaveBeenCalledWith([]);
  });
});

describe('InteractionHandler context menus', () => {
  function createMenu(
    type: ApplicationCommandType.User | ApplicationCommandType.Message,
    metadata: ContextMenuCommand['metadata'] = { category: 'test' },
  ): { menu: ContextMenuCommand; execute: jest.Mock } {
    const execute = jest.fn().mockResolvedValue(undefined);
    const menu: ContextMenuCommand = {
      data: new ContextMenuCommandBuilder().setName('example').setType(type),
      metadata,
      execute,
    };
    return { menu, execute };
  }

  it('runs a user menu', async () => {
    const { menu, execute } = createMenu(ApplicationCommandType.User);
    const { interaction } = createInteraction('userMenu');

    await createHandler({ contextMenu: menu }).handle(interaction);

    expect(execute).toHaveBeenCalledWith(interaction);
  });

  it('does not run a user menu for a message menu with the same name', async () => {
    const { menu, execute } = createMenu(ApplicationCommandType.User);
    const { interaction, reply } = createInteraction('messageMenu');

    await createHandler({ contextMenu: menu }).handle(interaction);

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith({
      content: 'This command is unavailable.',
      flags: MessageFlags.Ephemeral,
    });
  });

  it('applies guards to context menus', async () => {
    const { menu, execute } = createMenu(ApplicationCommandType.Message, {
      category: 'test',
      guildOnly: true,
    });
    const { interaction } = createInteraction('messageMenu', { guildId: null });

    await createHandler({ contextMenu: menu }).handle(interaction);

    expect(execute).not.toHaveBeenCalled();
  });
});
