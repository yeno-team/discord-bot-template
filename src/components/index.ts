import type { AppServices } from '../app';
import type { ComponentHandler } from '../types';
import PingRefreshButton from './general/ping-refresh';

/**
 * Every button, select menu, and modal handler, in one place. Each handler owns a custom ID
 * prefix; startup fails if two handlers of the same kind share one.
 */
export function createComponents(services: AppServices): ComponentHandler[] {
  return [new PingRefreshButton(services.health)];
}
