import type { Collection } from 'discord.js';
import {
  MessageFlags,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
  type PermissionsBitField,
} from 'discord.js';

import type { CooldownService } from '../services';
import type {
  ComponentInteraction,
  ComponentKind,
  ContextMenuCommand,
  ContextMenuInteraction,
  InteractionGuards,
  SlashCommand,
} from '../types';
import type { AppLogger } from '../utils/logger';
import { contextMenuKey } from './command-registry';
import type { ComponentRegistry } from './component-registry';
import { parseCustomId } from './custom-id';
import { handleInteractionError } from './error-handler';

type GuardedInteraction =
  ChatInputCommandInteraction | ContextMenuInteraction | ComponentInteraction;

export interface InteractionHandlerDependencies {
  readonly commands: Collection<string, SlashCommand>;
  readonly contextMenus: Collection<string, ContextMenuCommand>;
  readonly components: ComponentRegistry;
  readonly cooldowns: CooldownService;
  readonly logger: AppLogger;
}

function hasPermissions(
  actual: Readonly<PermissionsBitField> | null,
  required: InteractionGuards['requiredUserPermissions'],
): boolean {
  return required === undefined || actual?.has(required) === true;
}

function componentKind(interaction: Interaction): ComponentKind | undefined {
  if (interaction.isButton()) return 'button';
  if (interaction.isAnySelectMenu()) return 'selectMenu';
  if (interaction.isModalSubmit()) return 'modal';
  return undefined;
}

export class InteractionHandler {
  private readonly commands: Collection<string, SlashCommand>;
  private readonly contextMenus: Collection<string, ContextMenuCommand>;
  private readonly components: ComponentRegistry;
  private readonly cooldowns: CooldownService;
  private readonly logger: AppLogger;

  public constructor(dependencies: InteractionHandlerDependencies) {
    this.commands = dependencies.commands;
    this.contextMenus = dependencies.contextMenus;
    this.components = dependencies.components;
    this.cooldowns = dependencies.cooldowns;
    this.logger = dependencies.logger;
  }

  public async handle(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      await this.handleCommand(interaction);
      return;
    }
    if (interaction.isAutocomplete()) {
      await this.handleAutocomplete(interaction);
      return;
    }
    if (interaction.isUserContextMenuCommand() || interaction.isMessageContextMenuCommand()) {
      await this.handleContextMenu(interaction);
      return;
    }

    const kind = componentKind(interaction);
    if (kind !== undefined) await this.handleComponent(interaction as ComponentInteraction, kind);
  }

  private async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    if (command === undefined || command.metadata.enabled === false) {
      await interaction.reply({
        content: 'This command is unavailable.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await this.run(
      interaction,
      command.metadata,
      `${interaction.commandName}:${interaction.user.id}`,
      () => command.execute(interaction),
      { command: interaction.commandName },
    );
  }

  /**
   * Autocomplete fires on every keystroke, so it skips cooldowns and permission checks
   * (Discord already hides commands members cannot use). Failures answer with no choices.
   */
  private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    try {
      if (command?.autocomplete === undefined || command.metadata.enabled === false) {
        await interaction.respond([]);
        return;
      }
      await command.autocomplete(interaction);
    } catch (error) {
      this.logger.error(
        { err: error, command: interaction.commandName, interactionId: interaction.id },
        'Autocomplete failed',
      );
      if (!interaction.responded) await interaction.respond([]).catch(() => undefined);
    }
  }

  private async handleContextMenu(interaction: ContextMenuInteraction): Promise<void> {
    const type = interaction.commandType;
    const menu = this.contextMenus.get(contextMenuKey(type, interaction.commandName));
    if (menu === undefined || menu.metadata.enabled === false) {
      await interaction.reply({
        content: 'This command is unavailable.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await this.run(
      interaction,
      menu.metadata,
      `menu:${String(type)}:${interaction.commandName}:${interaction.user.id}`,
      () => menu.execute(interaction),
      { contextMenu: interaction.commandName },
    );
  }

  private async handleComponent(
    interaction: ComponentInteraction,
    kind: ComponentKind,
  ): Promise<void> {
    const { prefix, args } = parseCustomId(interaction.customId);
    const handler = this.components.get(kind, prefix);
    if (handler === undefined) {
      this.logger.debug({ kind, customId: interaction.customId }, 'No component handler found');
      await interaction.reply({
        content: 'This is no longer available.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await this.run(
      interaction,
      handler.metadata ?? {},
      `component:${kind}:${prefix}:${interaction.user.id}`,
      () => handler.execute(interaction, args),
      { component: kind, customId: interaction.customId },
    );
  }

  /** Applies the shared guards, then runs the handler and reports any error to the user. */
  private async run(
    interaction: GuardedInteraction,
    guards: InteractionGuards,
    cooldownKey: string,
    execute: () => Promise<void>,
    logContext: Readonly<Record<string, string>>,
  ): Promise<void> {
    try {
      if (guards.guildOnly === true && interaction.guildId === null) {
        await interaction.reply({
          content: 'This can only be used in a server.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (!hasPermissions(interaction.memberPermissions, guards.requiredUserPermissions)) {
        await interaction.reply({
          content: 'You do not have permission to do that.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const channelId = interaction.channelId;
      const botPermissions =
        channelId === null
          ? null
          : (interaction.guild?.members.me?.permissionsIn(channelId) ?? null);
      if (!hasPermissions(botPermissions, guards.requiredBotPermissions)) {
        await interaction.reply({
          content: 'I do not have the permissions required to do that here.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const remaining = await this.cooldowns.consume(cooldownKey, guards.cooldownSeconds ?? 0);
      if (remaining > 0) {
        await interaction.reply({
          content: `Please wait ${String(remaining)}s before trying again.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await execute();
    } catch (error) {
      await handleInteractionError(interaction, error, this.logger, logContext);
    }
  }
}
