'use client';
import { useState } from 'react';
import {
  useFrontendTranslation,
  formatDate,
  formatTimeOfDay,
  formatNumber,
} from '@community-go/i18n';
import { Page, PageHeader, Section } from '@community-go/surface-foundation/layout';
import { Action } from '@community-go/ui-adapter/action';
import { SelectField } from '@community-go/ui-adapter/form-field';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { NOTIFICATION_CATEGORIES } from '@community-go/plugin-framework/notifications';
import { route, RouteLink, usePluginNavigation } from '@community-go/plugin-framework/plugin';
import { usePreferencesPort } from '@community-go/plugin-framework/preferences';
import type { Preferences } from '@community-go/surface/preferences-model';
import { IdentityError, useIdentityPort } from '@community-go/surface/identity';
import { useProductInbox } from '../../../src/identity/use-inbox';
import {
  IdentityModeNotice,
  IdentityMutationError,
  IdentityQueryState,
} from '../../../src/identity/query-state';
export function InboxPage({ id }: Readonly<{ id?: string }>) {
  const { t, locale } = useFrontendTranslation();
  const port = useIdentityPort();
  const region = usePreferencesPort<Preferences>().getSnapshot().localeRegion;
  const timestamp = (value: number) =>
    formatDate(locale, value, region.timeZone === 'auto' ? {} : { timeZone: region.timeZone }) +
    ' · ' +
    formatTimeOfDay(locale, region, value);
  const inbox = useProductInbox();
  const navigation = usePluginNavigation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [requestedPage, setPage] = useState(1);
  const selected = id === undefined ? null : inbox.items.find((item) => item.id === id);
  const filtered = inbox.items.filter(
    (item) =>
      (category === 'all' || category === item.category) &&
      (!unreadOnly || !item.read) &&
      `${item.title} ${item.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const page = Math.min(requestedPage, pages);
  const items = filtered.slice((page - 1) * 20, page * 20);
  let association = selected?.target
    ? route(selected.target.routeId, selected.target.params ?? {}, {
        query: selected.target.query ?? {},
        ...(selected.target.fragment ? { fragment: selected.target.fragment } : {}),
      })
    : null;
  if (association) {
    try {
      navigation.href(association);
    } catch {
      association = null;
    }
  }
  const unavailable =
    id !== undefined && !selected && !inbox.loading ? new IdentityError('not-found') : null;
  return (
    <Page>
      <PageHeader
        title={t(id === undefined ? 'notifications.nav' : 'management.detail')}
        description={t('notifications.description')}
        actions={
          id === undefined ? (
            <Action
              disabled={inbox.pending || inbox.unread === 0 || Boolean(inbox.error)}
              onPress={() => {
                void inbox.markRead(
                  inbox.items.filter((item) => !item.read).map((item) => item.id),
                );
              }}
            >
              {t('management.markAll')}
            </Action>
          ) : (
            <RouteLink target={route('notifications')}>{t('notifications.back')}</RouteLink>
          )
        }
      />
      <IdentityModeNotice mode={port.mode} />
      <IdentityMutationError error={inbox.failure} />
      {inbox.error || unavailable || (inbox.loading && !inbox.items.length) ? (
        <IdentityQueryState error={inbox.error ?? unavailable} retry={inbox.reload} />
      ) : selected ? (
        <Section title={selected.title}>
          <div className="grid gap-4 p-5">
            <p className="text-sm text-ink-muted">{timestamp(selected.createdAt)}</p>
            <p>{selected.description}</p>
            <StatusPill tone={selected.category === 'failure' ? 'danger' : 'neutral'}>
              {t(`shell.notificationCategory.${selected.category}`)}
            </StatusPill>
            {!selected.read ? (
              <Action
                disabled={inbox.pending}
                onPress={() => {
                  void inbox.markRead([selected.id]);
                }}
              >
                {t('management.read')}
              </Action>
            ) : null}
            {association ? (
              <RouteLink target={association}>{t('management.association')}</RouteLink>
            ) : (
              <p className="text-sm text-ink-muted">{t('management.associationUnavailable')}</p>
            )}
          </div>
        </Section>
      ) : (
        <Section title={t('notifications.nav')}>
          <div className="grid gap-4 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <SearchBox
                label={t('notifications.search')}
                placeholder={t('notifications.search')}
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
              />
              <SelectField
                label={t('notifications.category')}
                value={category}
                onValueChange={(value) => {
                  setCategory(value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: t('management.all') },
                  ...NOTIFICATION_CATEGORIES.map((value) => ({
                    value,
                    label: t(`shell.notificationCategory.${value}`),
                  })),
                ]}
              />
              <SelectField
                label={t('notifications.state')}
                value={unreadOnly ? 'unread' : 'all'}
                onValueChange={(value) => {
                  setUnreadOnly(value === 'unread');
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: t('management.all') },
                  { value: 'unread', label: t('management.unread') },
                ]}
              />
            </div>
            <Action
              variant="secondary"
              disabled={inbox.pending || !items.some((item) => !item.read)}
              onPress={() => {
                void inbox.markRead(items.filter((item) => !item.read).map((item) => item.id));
              }}
            >
              {t('notifications.batch')}
            </Action>
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">{t('management.empty')}</p>
            ) : (
              <ul data-reveal-items className="grid gap-3">
                {items.map((item) => (
                  <li key={item.id} className="grid gap-2 rounded-panel border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <RouteLink
                        target={route('notifications.detail', {}, { query: { id: item.id } })}
                      >
                        {item.title}
                      </RouteLink>
                      <StatusPill tone={item.category === 'failure' ? 'danger' : 'neutral'}>
                        {t(`shell.notificationCategory.${item.category}`)}
                      </StatusPill>
                    </div>
                    <p className="text-sm text-ink-muted">
                      {timestamp(item.createdAt)}
                      {!item.read ? ` · ${t('management.unread')}` : ''}
                    </p>
                    {!item.read ? (
                      <Action
                        variant="quiet"
                        size="sm"
                        disabled={inbox.pending}
                        onPress={() => {
                          void inbox.markRead([item.id]);
                        }}
                      >
                        {t('management.read')}
                      </Action>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Action variant="secondary" disabled={page <= 1} onPress={() => setPage(page - 1)}>
                {t('management.previous')}
              </Action>
              <p className="text-sm text-ink-muted">
                {t('management.pagination', {
                  page: formatNumber(locale, page),
                  pages: formatNumber(locale, pages),
                  total: formatNumber(locale, filtered.length),
                })}
              </p>
              <Action
                variant="secondary"
                disabled={page >= pages}
                onPress={() => setPage(page + 1)}
              >
                {t('management.next')}
              </Action>
            </div>
          </div>
        </Section>
      )}
    </Page>
  );
}
