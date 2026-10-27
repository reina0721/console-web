import type { NavigationContribution } from '@community-go/plugin-framework/navigation';

export const navigationContribution = {
  parents: [
    {
      navigationId: 'departments.root',
      labelKey: 'departments.nav',
      groupId: 'administration',
      iconId: 'department',
      routeId: 'departments',
      order: 41,
    },
  ],
} as const satisfies NavigationContribution;
