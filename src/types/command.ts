import type {
  ChatInputCommandInteraction,
  PermissionResolvable,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export interface CommandMetadata {
  readonly category: string;
  readonly cooldownSeconds?: number;
  readonly guildOnly?: boolean;
  readonly enabled?: boolean;
  readonly requiredUserPermissions?: readonly PermissionResolvable[];
  readonly requiredBotPermissions?: readonly PermissionResolvable[];
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

export interface CommandConstructor extends CommandDefinition {
  readonly prototype: CommandExecutor;
}
