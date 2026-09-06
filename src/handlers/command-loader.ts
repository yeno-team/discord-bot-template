import { Collection } from 'discord.js';
import type { DependencyContainer, InjectionToken } from 'tsyringe';

import type { AppLogger } from '../utils/logger';
import type {
  CommandConstructor,
  CommandDefinition,
  CommandExecutor,
  SlashCommand,
} from '../types';
import { findModuleFiles, loadDefaultExport } from './load-modules';

function isCommandConstructor(value: unknown): value is CommandConstructor {
  if (typeof value !== 'function') return false;
  const candidate = value as Partial<CommandConstructor>;
  return (
    candidate.data !== undefined &&
    typeof candidate.data.name === 'string' &&
    typeof candidate.data.toJSON === 'function' &&
    typeof candidate.metadata?.category === 'string' &&
    typeof candidate.prototype?.execute === 'function'
  );
}

async function loadCommandConstructors(
  directory: string,
  logger: AppLogger,
): Promise<Collection<string, CommandConstructor>> {
  const commandTypes = new Collection<string, CommandConstructor>();

  for (const file of await findModuleFiles(directory)) {
    const commandType = loadDefaultExport(file);
    if (!isCommandConstructor(commandType)) {
      throw new Error(`Invalid slash command module: ${file}`);
    }
    if (commandTypes.has(commandType.data.name)) {
      throw new Error(`Duplicate slash command name: ${commandType.data.name}`);
    }
    commandTypes.set(commandType.data.name, commandType);
    logger.debug(
      { command: commandType.data.name, category: commandType.metadata.category },
      'Loaded command',
    );
  }

  return commandTypes;
}

export async function loadCommandDefinitions(
  directory: string,
  logger: AppLogger,
): Promise<Collection<string, CommandDefinition>> {
  return loadCommandConstructors(directory, logger);
}

export async function loadCommands(
  directory: string,
  logger: AppLogger,
  container: DependencyContainer,
): Promise<Collection<string, SlashCommand>> {
  const commands = new Collection<string, SlashCommand>();

  for (const commandType of (await loadCommandConstructors(directory, logger)).values()) {
    const token = commandType as unknown as InjectionToken<CommandExecutor>;
    const executor = container.resolve(token);
    commands.set(commandType.data.name, {
      data: commandType.data,
      metadata: commandType.metadata,
      execute: (interaction) => executor.execute(interaction),
    });
  }

  return commands;
}
