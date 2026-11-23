import type { AppServices } from '../app';
import { createCommand, createContextMenu } from '../handlers/command-registry';
import type {
  CommandDefinition,
  ContextMenuCommand,
  ContextMenuDefinition,
  SlashCommand,
} from '../types';
import SetWelcomeCommand from './admin/set-welcome';
import UserInfoMenu from './context/user-info';
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

/**
 * Every right-click user or message command. Add a new menu to both lists, like commands,
 * and add a `services: AppServices` parameter once a menu needs a service.
 * Discord allows at most 5 user menus and 5 message menus per bot.
 */
export const contextMenuDefinitions: readonly ContextMenuDefinition[] = [UserInfoMenu];

export function createContextMenus(): ContextMenuCommand[] {
  return [createContextMenu(UserInfoMenu)];
}
