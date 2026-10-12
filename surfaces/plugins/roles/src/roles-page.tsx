'use client';
import { useState } from 'react';
import { useFrontendTranslation, formatNumber } from '@community-go/i18n';
import { Page, PageHeader, Section } from '@community-go/surface-foundation/layout';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { route, RouteLink } from '@community-go/plugin-framework/plugin';
import { IdentityError, useIdentityPort } from '@community-go/surface/identity';
import { useIdentityQuery } from '../../../src/identity/use-query';
import { IdentityModeNotice, IdentityQueryState } from '../../../src/identity/query-state';
export function RolesPage() {
  const { t, locale } = useFrontendTranslation();
  const port = useIdentityPort();
  const [search, setSearch] = useState('');
  const result = useIdentityQuery('roles', async (service) => {
    const access = await service.access();
    if (!access.permissions.includes('roles.read')) throw new IdentityError('forbidden');
    return { access, roles: await service.roles() };
  });
  const roles = result.data?.roles.filter((role) =>
    role.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
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
        <Section title={t('roles.list')}>
          <div className="grid gap-4 p-5">
            <RouteLink target={route('roles.permissions')}>{t('roles.permissions')}</RouteLink>
            <SearchBox
              label={t('roles.search')}
              placeholder={t('roles.search')}
              value={search}
              onChange={setSearch}
            />
            {roles?.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('roles.empty')}</p>
            ) : (
              <ul data-reveal-items className="grid gap-3 md:grid-cols-2">
                {roles?.map((role) => (
                  <li key={role.id} className="grid gap-3 rounded-panel border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <RouteLink target={route('roles.detail', {}, { query: { id: role.id } })}>
                        {role.protected ? t(`identityProduct.roleNames.${role.id}`) : role.name}
                      </RouteLink>
                      <StatusPill tone="neutral">
                        {t(role.protected ? 'roles.system' : 'roles.custom')}
                      </StatusPill>
                    </div>
                    <p className="text-sm text-ink-muted">
                      {t('roles.permissionCount', {
                        count: role.permissions.length,
                        value: formatNumber(locale, role.permissions.length),
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}
    </Page>
  );
}
