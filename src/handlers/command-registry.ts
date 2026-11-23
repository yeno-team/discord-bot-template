import { Collection } from 'discord.js';

import type {
  CommandClass,
  ContextMenuClass,
  ContextMenuCommand,
  ContextMenuType,
  SlashCommand,
} from '../types';

/** Instantiates a command class with its dependencies, type-checked against its constructor. */
export function createCommand<TArgs extends unknown[]>(
  Command: CommandClass<TArgs>,
  ...dependencies: TArgs
): SlashCommand {
  const executor = new Command(...dependencies);
  const autocomplete = executor.autocomplete?.bind(executor);
  return {
    data: Command.data,
    metadata: Command.metadata,
    execute: (interaction) => executor.execute(interaction),
    ...(autocomplete === undefined ? {} : { autocomplete }),
  };
}

/** Instantiates a context menu class with its dependencies, like `createCommand`. */
export function createContextMenu<TArgs extends unknown[]>(
  Menu: ContextMenuClass<TArgs>,
  ...dependencies: TArgs
): ContextMenuCommand {
  const executor = new Menu(...dependencies);
  return {
    data: Menu.data,
    metadata: Menu.metadata,
    execute: (interaction) => executor.execute(interaction),
  };
}

export function toCommandCollection(
  commands: readonly SlashCommand[],
): Collection<string, SlashCommand> {
  const collection = new Collection<string, SlashCommand>();
  for (const command of commands) {
    if (collection.has(command.data.name)) {
      throw new Error(`Duplicate slash command name: ${command.data.name}`);
    }
    collection.set(command.data.name, command);
  }
  return collection;
}

/** A user menu and a message menu may share a name, so menus are keyed by type and name. */
export function contextMenuKey(type: ContextMenuType, name: string): string {
  return `${String(type)}:${name}`;
}

export function toContextMenuCollection(
  menus: readonly ContextMenuCommand[],
): Collection<string, ContextMenuCommand> {
  const collection = new Collection<string, ContextMenuCommand>();
  for (const menu of menus) {
    const key = contextMenuKey(menu.data.type, menu.data.name);
    if (collection.has(key)) throw new Error(`Duplicate context menu name: ${menu.data.name}`);
    collection.set(key, menu);
  }
  return collection;
}
