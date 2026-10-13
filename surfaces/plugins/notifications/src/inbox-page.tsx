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
import { SelectField, CheckboxField } from '@community-go/ui-adapter/form-field';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { NOTIFICATION_CATEGORIES } from '@community-go/plugin-framework/notifications';
import { route, RouteLink, usePluginNavigation } from '@community-go/plugin-framework/plugin';
import { usePreferencesPort } from '@community-go/plugin-framework/preferences';
import type { Preferences } from '@community-go/surface/preferences-model';
import { IdentityError, useIdentityPort } from '@community-go/surface/identity/runtime';
import { useProductInbox } from '../../../src/identity/use-inbox';
import { useIdentityQuery } from '../../../src/identity/use-query';
import { defaultInboxQuery, type InboxQuery } from './query-model';
import {
  IdentityModeNotice,
  IdentityMutationError,
  IdentityQueryState,
} from '../../../src/identity/query-state';
export function InboxPage({ id, query }: Readonly<{ id?: string; query?: InboxQuery | null }>) {
  const { t, locale } = useFrontendTranslation();
  const port = useIdentityPort();
  const region = usePreferencesPort<Preferences>().getSnapshot().localeRegion;
  const timestamp = (value: number) =>
    formatDate(locale, value, region.timeZone === 'auto' ? {} : { timeZone: region.timeZone }) +
    ' · ' +
    formatTimeOfDay(locale, region, value);
  const filters = query ?? defaultInboxQuery;
  const inbox = useProductInbox({ query: { ...filters, pageSize: 20 }, ...(id ? { id } : {}) });
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [localPage, setLocalPage] = useState(1);
  const navigation = usePluginNavigation();
  const listLocation = {
    q: filters.q,
    category: filters.category,
    read: filters.read,
    page: String(filters.page),
  };
  const [filterError, setFilterError] = useState<IdentityError | null>(null);
  const [search, setSearch] = useState(filters.q);
  const [filterFailure, setFilterFailure] = useState(false);
  const selected =
    id === undefined
      ? null
      : (inbox.items.find((item) => item.id === id) ??
        inbox.items.find((item) => item.id === `product:${id}`));
  const localFiltered = inbox.local.filter(
    (item) =>
      (filters.category === 'all' || item.category === filters.category) &&
      (filters.read === 'all' || (filters.read === 'read' ? item.read : !item.read)) &&
      `${item.title} ${item.description ?? ''}`.toLowerCase().includes(filters.q.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(inbox.total / 20));
  const page = filters.page;
  const items = inbox.remote;
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
  const associatedRoute = association?.routeId ?? '';
  const associatedId = association?.query?.id ?? '';
  const linkedRecord = useIdentityQuery(
    `notification.link:${id ?? ''}:${associatedRoute}:${associatedId}`,
    async (service) => {
      if (associatedRoute === 'users.detail') await service.read(associatedId);
      else if (associatedRoute === 'roles.detail') await service.readRole(associatedId);
      else if (associatedRoute === 'account') await service.me();
      else if (associatedRoute === 'system-settings') await service.registrationSettings();
      return true;
    },
  );
  function apply(patch: Partial<InboxQuery>) {
    setFilterError(null);
    void (async () => {
      const { inboxQuerySchema } = await import('./query');
      const parsed = inboxQuerySchema.safeParse({ ...filters, ...patch });
      if (!parsed.success) {
        setFilterFailure(true);
        return;
      }
      const next = parsed.data;
      navigation.navigate(
        route(
          'notifications',
          {},
          {
            query: { q: next.q, category: next.category, read: next.read, page: String(next.page) },
          },
        ),
      );
    })().catch((error: unknown) => {
      setFilterError(error instanceof IdentityError ? error : new IdentityError('unavailable'));
    });
  }
  const unavailable =
    id !== undefined && !selected && !inbox.loading ? new IdentityError('not-found') : null;
  return (
    <Page>
      <PageHeader
        title={
          id === undefined ? t('notifications.nav') : (selected?.title ?? t('management.detail'))
        }
        description={t('notifications.description')}
        actions={
          id === undefined ? (
            <Action
              disabled={inbox.pending || inbox.unread === 0 || Boolean(inbox.error)}
              onPress={() => {
                void inbox.markAllRead();
              }}
            >
              {t('management.markAll')}
            </Action>
          ) : (
            <RouteLink target={route('notifications', {}, { query: listLocation })}>
              {t('notifications.back')}
            </RouteLink>
          )
        }
      />
      <IdentityModeNotice mode={port.mode} />
      <IdentityMutationError error={inbox.failure ?? filterError} />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-muted">{t('shell.unreadCount', { count: inbox.unread })}</p>
        <Action variant="quiet" disabled={inbox.loading || inbox.pending} onPress={inbox.reload}>
          {t('identityProduct.refresh')}
        </Action>
        {inbox.loading ? (
          <span role="status" className="text-sm text-ink-muted">
            {t('identityProduct.loading')}
          </span>
        ) : null}
      </div>
      {inbox.error ||
      unavailable ||
      query === null ||
      (inbox.loading && (!inbox.items.length || (id !== undefined && !selected))) ? (
        <IdentityQueryState
          error={
            inbox.error ?? unavailable ?? (query === null ? new IdentityError('validation') : null)
          }
          retry={inbox.reload}
        />
      ) : selected ? (
        <Section title={selected.title}>
          <div className="grid gap-4 p-5">
            <p className="text-sm text-ink-muted">{timestamp(selected.createdAt)}</p>
            <p>{selected.description}</p>
            <StatusPill tone={selected.category === 'failure' ? 'danger' : 'neutral'}>
              {t(`shell.notificationCategory.${selected.category}`)}
            </StatusPill>
            <p className="text-sm text-ink-muted">
              {t(selected.read ? 'management.isRead' : 'management.unread')}
            </p>
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
            {association && !linkedRecord.loading && !linkedRecord.error ? (
              <RouteLink target={association}>{t('management.association')}</RouteLink>
            ) : !association || linkedRecord.error ? (
              <p className="text-sm text-ink-muted">{t('management.associationUnavailable')}</p>
            ) : null}
            {association && linkedRecord.loading ? (
              <p role="status" className="text-sm text-ink-muted">
                {t('identityProduct.loading')}
              </p>
            ) : null}
            {association && linkedRecord.error ? (
              <>
                <IdentityMutationError error={linkedRecord.error} />
                <Action variant="secondary" onPress={linkedRecord.reload}>
                  {t('identityProduct.retry')}
                </Action>
              </>
            ) : null}
          </div>
        </Section>
      ) : (
        <Section title={t('notifications.messages')}>
          <div className="grid gap-4 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  apply({ q: search, page: 1 });
                }}
              >
                <SearchBox
                  label={t('notifications.search')}
                  placeholder={t('notifications.search')}
                  value={search}
                  onValueChange={(value) => {
                    setSearch(value);
                    setFilterFailure(false);
                  }}
                />
                <Action type="submit" variant="secondary">
                  {t('identityProduct.search')}
                </Action>
              </form>
              <SelectField
                label={t('notifications.category')}
                value={filters.category}
                onValueChange={(value) => {
                  const category = NOTIFICATION_CATEGORIES.find((item) => item === value);
                  if (value === 'all') void apply({ category: 'all', page: 1 });
                  else if (category) void apply({ category, page: 1 });
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
                value={filters.read}
                onValueChange={(value) => {
                  if (value === 'all' || value === 'read' || value === 'unread')
                    void apply({ read: value, page: 1 });
                }}
                options={[
                  { value: 'all', label: t('management.all') },
                  { value: 'unread', label: t('management.unread') },
                  { value: 'read', label: t('management.isRead') },
                ]}
              />
            </div>
            {filterFailure ? (
              <p role="alert" className="text-sm text-danger">
                {t('notifications.invalidSearch')}
              </p>
            ) : null}
            <Action variant="quiet" onPress={() => navigation.navigate(route('notifications'))}>
              {t('identityProduct.clear')}
            </Action>
            <CheckboxField
              label={t('notifications.selectPage')}
              checked={
                Boolean(items.length) && items.every((item) => selectedIds.includes(item.id))
              }
              onCheckedChange={(checked) =>
                setSelectedIds(checked ? items.map((item) => item.id) : [])
              }
              disabled={inbox.pending}
            />
            <Action
              variant="secondary"
              disabled={
                inbox.pending || !items.some((item) => selectedIds.includes(item.id) && !item.read)
              }
              onPress={() => {
                void inbox
                  .markRead(
                    items
                      .filter((item) => selectedIds.includes(item.id) && !item.read)
                      .map((item) => item.id),
                  )
                  .then(() => setSelectedIds([]));
              }}
            >
              {t('notifications.batch')}
            </Action>
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">{t('management.empty')}</p>
            ) : (
              <ul data-reveal-items className="grid gap-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="grid min-w-0 gap-2 rounded-panel border border-border p-4"
                  >
                    <CheckboxField
                      label={t('notifications.selectItem', { name: item.title })}
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={(checked) =>
                        setSelectedIds((prior) =>
                          checked ? [...prior, item.id] : prior.filter((id) => id !== item.id),
                        )
                      }
                      disabled={inbox.pending}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <RouteLink
                        target={route(
                          'notifications.detail',
                          {},
                          { query: { ...listLocation, id: item.id } },
                        )}
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
              <Action
                variant="secondary"
                disabled={page <= 1}
                onPress={() => apply({ page: page - 1 })}
              >
                {t('management.previous')}
              </Action>
              <p className="text-sm text-ink-muted">
                {t('management.pagination', {
                  page: formatNumber(locale, page),
                  pages: formatNumber(locale, pages),
                  total: formatNumber(locale, inbox.total),
                })}
              </p>
              <Action
                variant="secondary"
                disabled={page >= pages}
                onPress={() => apply({ page: page + 1 })}
              >
                {t('management.next')}
              </Action>
            </div>
          </div>
        </Section>
      )}
      {id === undefined && localFiltered.length ? (
        <Section
          title={t('notifications.localEvents')}
          description={t('notifications.localEventsHint')}
        >
          <div className="grid min-w-0 gap-3 p-5">
            <ul className="divide-y divide-border">
              {localFiltered.slice((localPage - 1) * 20, localPage * 20).map((item) => (
                <li key={item.id} className="grid min-w-0 gap-2 py-3">
                  <RouteLink
                    target={route(
                      'notifications.detail',
                      {},
                      { query: { ...listLocation, id: item.id } },
                    )}
                  >
                    {item.title}
                  </RouteLink>
                  <p className="text-sm text-ink-muted">{timestamp(item.createdAt)}</p>
                  {!item.read ? (
                    <Action
                      variant="quiet"
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
            <div className="flex flex-wrap gap-3">
              <Action
                variant="secondary"
                disabled={localPage <= 1}
                onPress={() => setLocalPage(localPage - 1)}
              >
                {t('management.previous')}
              </Action>
              <Action
                variant="secondary"
                disabled={localPage * 20 >= localFiltered.length}
                onPress={() => setLocalPage(localPage + 1)}
              >
                {t('management.next')}
              </Action>
            </div>
          </div>
        </Section>
      ) : null}
    </Page>
  );
}
