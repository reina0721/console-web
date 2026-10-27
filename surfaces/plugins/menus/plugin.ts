import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'menus',
  mount: '/system/menus',
} as const satisfies PluginDefinition;
