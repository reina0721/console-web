'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatTimeOfDay, useFrontendTranslation } from '@community-go/i18n';
import { Page, PageHeader, Section } from '@community-go/surface-foundation/layout';
import { Action } from '@community-go/ui-adapter/action';
import { useAuth } from '../auth/context';
import { RouterTextLink } from '../host/router-text-link';
import { routeTargetResolver } from '../host/route-target-resolver';
import { useShellStore } from '../state/use-shell-store';
import { useWorkbenchStore } from '../state/use-workbench-store';
import { useWorkspaceStore } from '../state/use-workspace-store';
import { useProductInbox } from '@community-go/surface/identity/runtime';
import { useNavigationTitle } from './use-navigation-title';
import { NotificationCenter } from './notification-center';

export default function OverviewPage() {
  const { t, locale } = useFrontendTranslation();
  const auth = useAuth();
  const router = useRouter();
  const recents = useWorkbenchStore((state) => state.recents);
  const favorites = useWorkbenchStore((state) => state.favorites);
  const records = useWorkspaceStore((state) => state.records);
  const inbox = useProductInbox();
  const { items } = inbox;
  const showRecents = useShellStore((state) => state.preferences.navigation.showRecents);
  const showNotifications = useShellStore(
    (state) => state.preferences.notifications.inAppNotifications,
  );
  const autoRestore = useShellStore((state) => state.preferences.navigation.autoRestoreWorkspace);
  const localeRegion = useShellStore((state) => state.preferences.localeRegion);
  // Only create owns a restorable draft; edit has no durable entity identity.
  const draftName = records['reference-resources.create']?.draft?.name;
  const hasDraft = typeof draftName === 'string' && draftName.trim().length > 0;
  useEffect(() => {
    if (autoRestore && hasDraft) router.replace('/reference-resources/create');
  }, [autoRestore, hasDraft, router]);
  const entryTitle = useNavigationTitle();
  const recentPages = recents.filter((entry) => entry.pathname !== '/').slice(0, 6);
  const unread = items.filter((item) => !item.read).length;
  const timestamp = (value: number) =>
    formatDate(
      locale,
      value,
      localeRegion.timeZone === 'auto' ? {} : { timeZone: localeRegion.timeZone },
    ) +
    ' · ' +
    formatTimeOfDay(locale, localeRegion, value);

  return (
    <Page>
      <PageHeader
        eyebrow={t('overview.eyebrow')}
        title={t('overview.title')}
        description={t('overview.description', { name: auth.session?.user.name ?? '' })}
        actions={<RouterTextLink href="/settings">{t('overview.preferencesEntry')}</RouterTextLink>}
      />
      {hasDraft ? (
        <Section
          appearance="outlined"
          id="workbench-drafts"
          title={t('overview.draftsTitle')}
          description={t('overview.draftsDescription')}
        >
          <div data-reveal-items className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-ink">{draftName}</p>
                <p className="mt-1 text-xs text-ink-muted">{t('overview.draftScope')}</p>
              </div>
              <RouterTextLink href="/reference-resources/create">
                {t('overview.resumeDraft')}
              </RouterTextLink>
            </div>
          </div>
        </Section>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          appearance="outlined"
          id="workbench-favorites"
          title={t('overview.favoritesTitle')}
          description={t('overview.favoritesDescription')}
        >
          {favorites.length ? (
            <ul data-reveal-items className="flex flex-col gap-3 p-5">
              {favorites.map((entry) => (
                <li key={entry.pathname} className="min-w-0 break-words">
                  <RouterTextLink href={entry.pathname}>
                    {entryTitle(entry.pathname, entry.title)}
                  </RouterTextLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-ink-muted">{t('overview.favoritesEmpty')}</p>
          )}
        </Section>
        {showRecents ? (
          <Section
            appearance="outlined"
            id="workbench-recents"
            title={t('overview.recentsTitle')}
            description={t('overview.recentsDescription')}
          >
            {recentPages.length ? (
              <ol data-reveal-items className="flex flex-col gap-3 p-5">
                {recentPages.map((entry) => (
                  <li
                    key={entry.pathname}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-2"
                  >
                    <RouterTextLink href={entry.pathname}>
                      {entryTitle(entry.pathname, entry.title)}
                    </RouterTextLink>
                    <time
                      className="text-xs text-ink-muted"
                      dateTime={new Date(entry.visitedAt).toISOString()}
                    >
                      {timestamp(entry.visitedAt)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-5 text-sm text-ink-muted">{t('overview.recentsEmpty')}</p>
            )}
          </Section>
        ) : null}
      </div>
      {showNotifications ? (
        <Section
          appearance="outlined"
          id="workbench-activity"
          title={t('overview.activityTitle')}
          description={t('overview.activityDescription')}
          action={<NotificationCenter triggerLabel={t('overview.notificationsEntry')} />}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
            <p className="text-sm text-ink-muted">{t('shell.unreadCount', { count: unread })}</p>
            {unread ? (
              <Action
                variant="secondary"
                size="sm"
                disabled={inbox.pending || Boolean(inbox.error)}
                onPress={() => {
                  void inbox.markRead(items.filter((item) => !item.read).map((item) => item.id));
                }}
              >
                {t('shell.markAllRead')}
              </Action>
            ) : null}
          </div>
          {inbox.error || inbox.failure ? (
            <p role="alert" className="px-5 pt-3 text-sm text-danger">
              {t(`identityProduct.errors.${(inbox.error ?? inbox.failure)?.code}`)}
            </p>
          ) : null}
          {items.length ? (
            <ul data-reveal-items className="flex flex-col gap-4 p-5">
              {items.slice(0, 5).map((item) => {
                let href: string | undefined;
                if (item.target) {
                  try {
                    href = routeTargetResolver.resolveHref({
                      ...item.target,
                      params: item.target.params ?? {},
                    });
                  } catch {
                    /* Removed Plugin events remain readable without an invalid link. */
                  }
                }
                return (
                  <li
                    key={item.id}
                    className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-ink">{item.title}</p>
                      {item.description ? (
                        <p className="mt-1 break-words text-xs text-ink-muted">
                          {item.description}
                        </p>
                      ) : null}
                      <time
                        className="mt-1 block text-xs text-ink-muted"
                        dateTime={new Date(item.createdAt).toISOString()}
                      >
                        {timestamp(item.createdAt)}
                      </time>
                      {href ? (
                        <RouterTextLink href={href} tone="neutral">
                          {t('overview.relatedPage')}
                        </RouterTextLink>
                      ) : null}
                    </div>
                    {item.read ? (
                      <span className="text-xs text-ink-muted">{t('overview.read')}</span>
                    ) : (
                      <Action
                        variant="secondary"
                        size="sm"
                        disabled={inbox.pending}
                        onPress={() => {
                          void inbox.markRead([item.id]);
                        }}
                      >
                        {t('overview.markRead')}
                      </Action>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-5 text-sm text-ink-muted">{t('overview.activityEmpty')}</p>
          )}
        </Section>
      ) : null}
      <Section
        appearance="outlined"
        id="workbench-shortcuts"
        title={t('overview.shortcutsTitle')}
        description={t('overview.shortcutsDescription')}
      >
        <ul data-reveal-items className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ['appearance', '/settings'],
              ['navigation', '/settings/navigation'],
              ['locale', '/settings/locale'],
              ['actions', '/settings/actions'],
            ] as const
          ).map(([id, href]) => (
            <li key={id} className="min-w-0">
              <RouterTextLink href={href}>{t('overview.shortcuts.' + id)}</RouterTextLink>
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                {t('overview.shortcuts.' + id + 'Description')}
              </p>
            </li>
          ))}
        </ul>
      </Section>
      <Section
        appearance="embedded"
        title={t('overview.developmentTitle')}
        description={t('overview.developmentDescription')}
      >
        <div data-reveal-items className="flex flex-wrap gap-4 p-5">
          <RouterTextLink href="/ui-elements" tone="neutral">
            {t('overview.componentsEntry')}
          </RouterTextLink>
          <RouterTextLink href="/reference-resources" tone="neutral">
            {t('overview.referenceEntry')}
          </RouterTextLink>
          <RouterTextLink href="/system-tools/icons" tone="neutral">
            {t('overview.iconsEntry')}
          </RouterTextLink>
        </div>
      </Section>
    </Page>
  );
}
