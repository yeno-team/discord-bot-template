import type {
  AnySelectMenuInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
} from 'discord.js';

import type { InteractionGuards } from './command';

/** The interaction type each component kind receives. */
export interface ComponentInteractionMap {
  readonly button: ButtonInteraction;
  readonly selectMenu: AnySelectMenuInteraction;
  readonly modal: ModalSubmitInteraction;
}

export type ComponentKind = keyof ComponentInteractionMap;

export type ComponentInteraction = ComponentInteractionMap[ComponentKind];

/**
 * Handles buttons, select menus, or modals whose custom ID starts with `prefix`.
 * Build custom IDs with `createCustomId(prefix, ...args)`; the handler receives the args.
 */
export interface ComponentHandler<K extends ComponentKind = ComponentKind> {
  readonly kind: K;
  readonly prefix: string;
  readonly metadata?: InteractionGuards;
  execute(interaction: ComponentInteractionMap[K], args: readonly string[]): Promise<void>;
}
