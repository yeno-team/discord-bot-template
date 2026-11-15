import type { AppServices } from '../app';
import { createCommand } from '../handlers/command-registry';
import type { CommandDefinition, SlashCommand } from '../types';
import SetWelcomeCommand from './admin/set-welcome';
import PingCommand from './general/ping';

/**
 * Every slash command, in one place. Add a new command to both lists: deployment reads
 * the static definitions without creating services, and the bot builds the instances.
 */
export const commandDefinitions: readonly CommandDefinition[] = [PingCommand, SetWelcomeCommand];

export function createCommands(services: AppServices): SlashCommand[] {
  return [
    createCommand(PingCommand, services.health),
    createCommand(SetWelcomeCommand, services.welcomeSettings),
  ];
}
