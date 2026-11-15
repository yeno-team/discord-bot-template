import { Collection } from 'discord.js';

import type { CommandClass, SlashCommand } from '../types';

/** Instantiates a command class with its dependencies, type-checked against its constructor. */
export function createCommand<TArgs extends unknown[]>(
  Command: CommandClass<TArgs>,
  ...dependencies: TArgs
): SlashCommand {
  const executor = new Command(...dependencies);
  return {
    data: Command.data,
    metadata: Command.metadata,
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
