import type { PluginDefinition } from '@community-go/plugin-framework/plugin';

export const pluginDefinition = {
  pluginId: 'workspace',
  mount: '/workspace',
} as const satisfies PluginDefinition;
