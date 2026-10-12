import type { PluginDefinition } from '@community-go/plugin-framework/plugin';
export const pluginDefinition = {
  pluginId: 'audit',
  mount: '/audit-logs',
} as const satisfies PluginDefinition;
