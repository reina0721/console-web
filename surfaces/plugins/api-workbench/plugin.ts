import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'api-workbench',
  mount: '/api-workbench',
} as const satisfies PluginDefinition;
