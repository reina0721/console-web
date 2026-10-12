'use client';
import { useState } from 'react';
import { formatDate, formatNumber, useFrontendTranslation } from '@community-go/i18n';
import { Page, PageHeader, FilterBar } from '@community-go/surface-foundation/layout';
import { Collection } from '@community-go/surface-foundation/collection';
import { Action } from '@community-go/ui-adapter/action';
import { DataTable, type DataColumn } from '@community-go/ui-adapter/data-display';
import { SelectField } from '@community-go/ui-adapter/form-field';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { StateSurface } from '@community-go/ui-adapter/state-surface';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { NavigationIcon } from '@community-go/surface/icon-presentation';
import {
  useIdentityPort,
  IdentityError,
  userQuerySchema,
  defaultUserQuery,
  type UserQuery,
  type DirectoryUser,
} from '@community-go/surface/identity';
import { route, RouteLink, usePluginNavigation } from '@community-go/plugin-framework/plugin';
import { usePreferencesPort } from '@community-go/plugin-framework/preferences';
import type { Preferences } from '@community-go/surface/preferences-model';
import { useIdentityQuery } from '../../../src/identity/use-query';
import { IdentityQueryState, IdentityModeNotice } from '../../../src/identity/query-state';

export function UsersPage({ query }: Readonly<{ query: UserQuery | null }>) {
  const port = useIdentityPort();
  const { t, locale } = useFrontendTranslation();
  const navigation = usePluginNavigation();
  const preferences = usePreferencesPort<Preferences>().getSnapshot();
  const [search, setSearch] = useState(query?.q ?? '');
  const result = useIdentityQuery(`users:${JSON.stringify(query)}`, async (service) => {
    if (!query) throw new IdentityError('validation');
    const access = await service.access();
    if (!access.permissions.includes('users.read')) throw new IdentityError('forbidden');
    const [page, roles] = await Promise.all([service.list(query), service.roles()]);
    return { access, page, roles };
  });
  function apply(patch: Partial<UserQuery>) {
    const parsed = userQuerySchema.safeParse({ ...(query ?? defaultUserQuery), ...patch });
    if (!parsed.success) return;
    const next = parsed.data;
    navigation.navigate(
      route(
        'users',
        {},
        {
          query: {
            q: next.q,
            status: next.status,
            roleId: next.roleId,
            sort: next.sort,
            direction: next.direction,
            page: String(next.page),
            pageSize: String(next.pageSize),
          },
        },
      ),
    );
  }
  const clear = () => navigation.navigate(route('users'));
  const data = result.data;
  const roleLabel = (id: string) =>
    ['administrator', 'operator', 'viewer'].includes(id)
      ? t(`identityProduct.roleNames.${id}`)
      : (data?.roles.find((role) => role.id === id)?.name ?? id);
  const status = (user: DirectoryUser) => (
    <StatusPill tone={user.status === 'active' ? 'success' : 'neutral'}>
      {t(`identityProduct.${user.status}`)}
    </StatusPill>
  );
  const detailLink = (user: DirectoryUser) => (
    <RouteLink target={route('users.detail', {}, { query: { id: user.id } })}>
      {user.name}
    </RouteLink>
  );
  const columns: readonly DataColumn<DirectoryUser>[] = [
    {
      id: 'name',
      label: t('identityProduct.name'),
      rowHeader: true,
      sortable: true,
      render: detailLink,
    },
    {
      id: 'email',
      label: t('identityProduct.email'),
      sortable: true,
      render: (user) => user.email,
    },
    { id: 'status', label: t('identityProduct.status'), render: status },
    {
      id: 'roles',
      label: t('identityProduct.roles'),
      render: (user) => user.roleIds.map(roleLabel).join(' / '),
    },
    {
      id: 'createdAt',
      label: t('users.createdAt'),
      sortable: true,
      render: (user) =>
        formatDate(
          locale,
          user.createdAt,
          preferences.localeRegion.timeZone === 'auto'
            ? {}
            : { timeZone: preferences.localeRegion.timeZone },
        ),
    },
  ];
  const pages = Math.max(1, Math.ceil((data?.page.total ?? 0) / (query?.pageSize ?? 20)));
  const empty = (
    <StateSurface
      state="empty"
      icon={<NavigationIcon iconId="identity" />}
      title={t('users.empty')}
      description={t('users.emptyDescription')}
      actionLabel={t('identityProduct.clear')}
      onAction={clear}
    />
  );
  return (
    <Page>
      <PageHeader
        eyebrow={t('users.eyebrow')}
        title={t('users.title')}
        description={t('users.description')}
        actions={
          data?.access.permissions.includes('users.create') ? (
            <RouteLink target={route('users.create')}>{t('users.create')}</RouteLink>
          ) : undefined
        }
      />
      <IdentityModeNotice mode={port.mode} />
      {!query ? (
        <StateSurface
          state="error"
          icon={<NavigationIcon iconId="identity" />}
          title={t('users.invalidQuery')}
          description={t('users.invalidQueryDescription')}
          actionLabel={t('identityProduct.clear')}
          onAction={clear}
        />
      ) : result.error || !data ? (
        <IdentityQueryState error={result.error} retry={result.reload} />
      ) : (
        <Collection
          title={t('users.collection')}
          description={t('users.count', {
            count: data.page.total,
            countFormatted: formatNumber(locale, data.page.total),
          })}
          filters={
            <FilterBar>
              <form
                className="flex flex-wrap items-center gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  apply({ q: search, page: 1 });
                }}
              >
                <div className="min-w-0 flex-1">
                  <SearchBox
                    label={t('users.search')}
                    placeholder={t('users.searchPlaceholder')}
                    value={search}
                    onValueChange={setSearch}
                  />
                </div>
                <Action type="submit" size="sm">
                  {t('identityProduct.search')}
                </Action>
                <Action variant="quiet" size="sm" onPress={clear}>
                  {t('identityProduct.clear')}
                </Action>
                <Action variant="secondary" size="sm" onPress={result.reload}>
                  {t('identityProduct.refresh')}
                </Action>
              </form>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SelectField
                  label={t('identityProduct.status')}
                  value={query.status}
                  options={['all', 'active', 'disabled'].map((value) => ({
                    value,
                    label: t(`identityProduct.${value}`),
                  }))}
                  onValueChange={(value) => {
                    if (value === 'all' || value === 'active' || value === 'disabled')
                      apply({ status: value, page: 1 });
                  }}
                />
                <SelectField
                  label={t('identityProduct.roles')}
                  value={query.roleId}
                  options={[
                    { value: 'all', label: t('identityProduct.all') },
                    ...data.roles.map((role) => ({ value: role.id, label: roleLabel(role.id) })),
                  ]}
                  onValueChange={(roleId) => apply({ roleId, page: 1 })}
                />
                <SelectField
                  label={t('users.sort')}
                  value={query.sort}
                  options={[
                    { value: 'name', label: t('identityProduct.name') },
                    { value: 'email', label: t('identityProduct.email') },
                    { value: 'createdAt', label: t('users.createdAt') },
                  ]}
                  onValueChange={(value) => {
                    if (value === 'name' || value === 'email' || value === 'createdAt')
                      apply({ sort: value, page: 1 });
                  }}
                />
                <SelectField
                  label={t('users.direction')}
                  value={query.direction}
                  options={[
                    { value: 'asc', label: t('users.ascending') },
                    { value: 'desc', label: t('users.descending') },
                  ]}
                  onValueChange={(value) => {
                    if (value === 'asc' || value === 'desc') apply({ direction: value, page: 1 });
                  }}
                />
              </div>
            </FilterBar>
          }
          content={
            <div aria-busy={result.loading || undefined}>
              <DataTable
                label={t('users.collection')}
                columns={columns}
                rows={data.page.items}
                emptyContent={empty}
                density={
                  preferences.dataDisplay.tableDensity === 'compact' ? 'compact' : 'comfortable'
                }
                rowSeparators={preferences.dataDisplay.rowSeparators}
                stickyHeader={preferences.dataDisplay.stickyHeader}
                sort={{
                  columnId: query.sort,
                  direction: query.direction === 'asc' ? 'ascending' : 'descending',
                  onSortChange: (columnId, direction) => {
                    if (columnId === 'name' || columnId === 'email' || columnId === 'createdAt')
                      apply({
                        sort: columnId,
                        direction: direction === 'ascending' ? 'asc' : 'desc',
                        page: 1,
                      });
                  },
                }}
              />
            </div>
          }
          narrowContent={
            data.page.items.length ? (
              <ul
                data-reveal-items
                className="divide-y divide-border"
                aria-label={t('users.collection')}
              >
                {data.page.items.map((user) => (
                  <li key={user.id} className="grid gap-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{detailLink(user)}</span>
                      {status(user)}
                    </div>
                    <p className="break-words text-sm text-ink-muted">{user.email}</p>
                    <p className="text-sm text-ink-muted">
                      {user.roleIds.map(roleLabel).join(' / ')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              empty
            )
          }
          pagination={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-ink-muted" aria-live="polite">
                {t('users.page', {
                  page: formatNumber(locale, query.page),
                  pages: formatNumber(locale, pages),
                })}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <SelectField
                  label={t('users.pageSize')}
                  value={String(query.pageSize)}
                  options={[10, 20, 50].map((value) => ({
                    value: String(value),
                    label: formatNumber(locale, value),
                  }))}
                  onValueChange={(value) => {
                    if (value === '10' || value === '20' || value === '50')
                      apply({ pageSize: value === '10' ? 10 : value === '20' ? 20 : 50, page: 1 });
                  }}
                />
                <Action
                  variant="secondary"
                  size="sm"
                  disabled={query.page <= 1 || result.loading}
                  onPress={() => apply({ page: query.page - 1 })}
                >
                  {t('users.previous')}
                </Action>
                <Action
                  variant="secondary"
                  size="sm"
                  disabled={query.page >= pages || result.loading}
                  onPress={() => apply({ page: query.page + 1 })}
                >
                  {t('users.next')}
                </Action>
              </div>
            </div>
          }
        />
      )}
    </Page>
  );
}
