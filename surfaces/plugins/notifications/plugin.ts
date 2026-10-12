import type { PluginDefinition } from '@community-go/plugin-framework/plugin';
export const pluginDefinition = {
  pluginId: 'notifications',
  mount: '/notifications',
} as const satisfies PluginDefinition;
