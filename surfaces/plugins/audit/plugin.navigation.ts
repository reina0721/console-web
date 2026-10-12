import type { NavigationContribution } from '@community-go/plugin-framework/navigation';
export const navigationContribution = {
  parents: [
    {
      navigationId: 'audit.root',
      labelKey: 'audit.nav',
      groupId: 'management',
      order: 20,
      iconId: 'list',
      routeId: 'audit',
    },
  ],
} as const satisfies NavigationContribution;
