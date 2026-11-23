import type {
  ApplicationCommandType,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  PermissionResolvable,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  UserContextMenuCommandInteraction,
} from 'discord.js';

/** Checks the interaction handler runs before a command or component handler executes. */
export interface InteractionGuards {
  readonly cooldownSeconds?: number;
  readonly guildOnly?: boolean;
  readonly requiredUserPermissions?: readonly PermissionResolvable[];
  readonly requiredBotPermissions?: readonly PermissionResolvable[];
}

export interface CommandMetadata extends InteractionGuards {
  readonly category: string;
  readonly enabled?: boolean;
}

export interface CommandDefinition {
  readonly data: {
    readonly name: string;
    toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
  };
  readonly metadata: CommandMetadata;
}

export interface CommandExecutor {
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  /** Suggests values for options declared with `.setAutocomplete(true)`. */
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}

export type SlashCommand = CommandDefinition & CommandExecutor;

/** A command class: static Discord definition plus a constructor taking its dependencies. */
export type CommandClass<TArgs extends unknown[]> = CommandDefinition &
  (new (...args: TArgs) => CommandExecutor);

export type ContextMenuType = ApplicationCommandType.User | ApplicationCommandType.Message;

/** A right-click "Apps" action on a user or a message. */
export interface ContextMenuDefinition {
  readonly data: {
    readonly name: string;
    readonly type: ContextMenuType;
    toJSON(): RESTPostAPIContextMenuApplicationCommandsJSONBody;
  };
  readonly metadata: CommandMetadata;
}

export type ContextMenuInteraction =
  UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction;

export interface ContextMenuExecutor {
  execute(interaction: ContextMenuInteraction): Promise<void>;
}

export type ContextMenuCommand = ContextMenuDefinition & ContextMenuExecutor;

export type ContextMenuClass<TArgs extends unknown[]> = ContextMenuDefinition &
  (new (...args: TArgs) => ContextMenuExecutor);
