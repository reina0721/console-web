'use client';
import { useState } from 'react';
import { useFrontendTranslation, formatNumber } from '@community-go/i18n';
import { Page, PageHeader } from '@community-go/surface-foundation/layout';
import { Collection } from '@community-go/surface-foundation/collection';
import { DataTable, type DataColumn } from '@community-go/ui-adapter/data-display';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { route, RouteLink } from '@community-go/plugin-framework/plugin';
import {
  IdentityError,
  useIdentityPort,
  type RoleSummary,
} from '@community-go/surface/identity/runtime';
import { useIdentityQuery } from '../../../src/identity/use-query';
import { IdentityModeNotice, IdentityQueryState } from '../../../src/identity/query-state';
export function RolesPage() {
  const { t, locale } = useFrontendTranslation();
  const port = useIdentityPort();
  const [search, setSearch] = useState('');
  const result = useIdentityQuery('roles-summary', async (service) => {
    const access = await service.access();
    if (!access.permissions.includes('roles.read')) throw new IdentityError('forbidden');
    return { access, roles: await service.roleSummaries() };
  });
  const label = (role: RoleSummary) =>
    ['administrator', 'operator', 'viewer'].includes(role.id)
      ? t(`identityProduct.roleNames.${role.id}`)
      : role.name;
  const roles =
    result.data?.roles.filter((role) =>
      label(role).toLowerCase().includes(search.trim().toLowerCase()),
    ) ?? [];
  const name = (role: RoleSummary) => (
    <RouteLink target={route('roles.detail', {}, { query: { id: role.id } })}>
      {label(role)}
    </RouteLink>
  );
  const summary = (role: RoleSummary) =>
    role.permissions.length
      ? role.permissions
          .slice(0, 3)
          .map((permission) => t(`management.permissions.${permission}`))
          .join(' / ') +
        (role.permissions.length > 3
          ? t('roles.morePermissions', { count: role.permissions.length - 3 })
          : '')
      : t('roles.noPermissions');
  const columns: readonly DataColumn<RoleSummary>[] = [
    { id: 'name', label: t('roles.name'), rowHeader: true, render: name },
    {
      id: 'type',
      label: t('roles.type'),
      render: (role) => (
        <StatusPill tone="neutral">
          {t(role.protected ? 'roles.system' : 'roles.custom')}
        </StatusPill>
      ),
    },
    { id: 'permissions', label: t('roles.permissions'), render: summary },
    {
      id: 'members',
      label: t('roles.members'),
      render: (role) => formatNumber(locale, role.memberCount),
    },
  ];
  return (
    <Page>
      <PageHeader
        title={t('roles.nav')}
        description={t('roles.description')}
        actions={
          result.data?.access.permissions.includes('roles.create') ? (
            <RouteLink target={route('roles.create')}>{t('roles.create')}</RouteLink>
          ) : null
        }
      />
      <IdentityModeNotice mode={port.mode} />
      {result.error || !result.data ? (
        <IdentityQueryState error={result.error} retry={result.reload} />
      ) : (
        <Collection
          title={t('roles.list')}
          filters={
            <SearchBox
              label={t('roles.search')}
              placeholder={t('roles.search')}
              value={search}
              onValueChange={setSearch}
            />
          }
          toolbar={
            <RouteLink target={route('roles.permissions')}>{t('roles.permissions')}</RouteLink>
          }
          content={
            <DataTable
              label={t('roles.list')}
              columns={columns}
              rows={roles}
              emptyContent={<p className="p-5 text-ink-muted">{t('roles.empty')}</p>}
            />
          }
          narrowContent={
            <ul data-reveal-items className="divide-y divide-border">
              {roles.map((role) => (
                <li key={role.id} className="grid gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {name(role)}
                    <StatusPill tone="neutral">
                      {t(role.protected ? 'roles.system' : 'roles.custom')}
                    </StatusPill>
                  </div>
                  <p className="text-sm text-ink-muted">{summary(role)}</p>
                  <p className="text-sm text-ink-muted">
                    {t('roles.memberCount', { value: formatNumber(locale, role.memberCount) })}
                  </p>
                </li>
              ))}
              {!roles.length ? <li className="p-5 text-ink-muted">{t('roles.empty')}</li> : null}
            </ul>
          }
        />
      )}
    </Page>
  );
}
