import type { NavigationContribution } from '@community-go/plugin-framework/navigation';
export const navigationContribution = {
  parents: [
    {
      navigationId: 'roles.root',
      labelKey: 'roles.nav',
      groupId: 'management',
      order: 10,
      iconId: 'identity',
      routeId: 'roles',
    },
  ],
} as const satisfies NavigationContribution;
