import type { NavigationContribution } from '@community-go/plugin-framework/navigation';
export const navigationContribution = {
  parents: [
    {
      navigationId: 'account.root',
      labelKey: 'account.nav',
      groupId: 'system',
      order: -10,
      iconId: 'account',
      routeId: 'account',
    },
  ],
} as const satisfies NavigationContribution;
