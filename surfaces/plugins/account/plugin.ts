import type { PluginDefinition } from '@community-go/plugin-framework/plugin';
export const pluginDefinition = {
  pluginId: 'account',
  mount: '/account',
} as const satisfies PluginDefinition;
