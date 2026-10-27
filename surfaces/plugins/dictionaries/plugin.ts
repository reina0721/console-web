import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'dictionaries',
  mount: '/system/dictionaries',
} as const satisfies PluginDefinition;
