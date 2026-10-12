import type { PluginDefinition } from '@community-go/plugin-framework/plugin';
export const pluginDefinition = {
  pluginId: 'roles',
  mount: '/roles',
} as const satisfies PluginDefinition;
