import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'departments',
  mount: '/system/departments',
} as const satisfies PluginDefinition;
