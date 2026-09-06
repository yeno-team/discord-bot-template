import { Collection } from 'discord.js';

import type { AppLogger } from '../utils/logger';
import type { SlashCommand } from '../types';
import { findModuleFiles, loadDefaultExport } from './load-modules';

function isSlashCommand(value: unknown): value is SlashCommand {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SlashCommand>;
  return (
    candidate.data !== undefined &&
    typeof candidate.data.name === 'string' &&
    typeof candidate.data.toJSON === 'function' &&
    typeof candidate.execute === 'function' &&
    typeof candidate.metadata?.category === 'string'
  );
}

export async function loadCommands(
  directory: string,
  logger: AppLogger,
): Promise<Collection<string, SlashCommand>> {
  const commands = new Collection<string, SlashCommand>();

  for (const file of await findModuleFiles(directory)) {
    const command = await loadDefaultExport<unknown>(file);
    if (!isSlashCommand(command)) throw new Error(`Invalid slash command module: ${file}`);
    if (commands.has(command.data.name)) {
      throw new Error(`Duplicate slash command name: ${command.data.name}`);
    }
    commands.set(command.data.name, command);
    logger.debug(
      { command: command.data.name, category: command.metadata.category },
      'Loaded command',
    );
  }

  return commands;
}
