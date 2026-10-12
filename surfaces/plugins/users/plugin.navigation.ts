import type { NavigationContribution } from '@community-go/plugin-framework/navigation';
export const navigationContribution = {
  parents: [
    {
      navigationId: 'users.root',
      labelKey: 'users.nav',
      groupId: 'management',
      order: 0,
      iconId: 'identity',
      routeId: 'users',
    },
  ],
} as const satisfies NavigationContribution;
