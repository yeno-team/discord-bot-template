import type {
  ChatInputCommandInteraction,
  PermissionResolvable,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
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
}

export type SlashCommand = CommandDefinition & CommandExecutor;

/** A command class: static Discord definition plus a constructor taking its dependencies. */
export type CommandClass<TArgs extends unknown[]> = CommandDefinition &
  (new (...args: TArgs) => CommandExecutor);
