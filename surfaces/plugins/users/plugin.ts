import type { PluginDefinition } from '@community-go/plugin-framework/plugin';
export const pluginDefinition = {
  pluginId: 'users',
  mount: '/users',
} as const satisfies PluginDefinition;
