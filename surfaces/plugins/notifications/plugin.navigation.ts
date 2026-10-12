import type { NavigationContribution } from '@community-go/plugin-framework/navigation';
export const navigationContribution = {
  parents: [
    {
      navigationId: 'notifications.root',
      labelKey: 'notifications.nav',
      groupId: 'system',
      order: -5,
      iconId: 'feedback',
      routeId: 'notifications',
    },
  ],
} as const satisfies NavigationContribution;
