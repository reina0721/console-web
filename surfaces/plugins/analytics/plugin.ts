import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'analytics',
  mount: '/analytics',
} as const satisfies PluginDefinition;
