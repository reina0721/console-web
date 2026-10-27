import type { NavigationContribution } from '@community-go/plugin-framework/navigation';

export const navigationContribution = {
  parents: [
    {
      navigationId: 'menus.root',
      labelKey: 'menus.nav',
      groupId: 'administration',
      iconId: 'menu',
      routeId: 'menus',
      order: 40,
    },
  ],
} as const satisfies NavigationContribution;
