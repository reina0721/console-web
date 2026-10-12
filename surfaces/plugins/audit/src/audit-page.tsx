'use client';
import { useState } from 'react';
import {
  useFrontendTranslation,
  formatDate,
  formatTimeOfDay,
  formatNumber,
} from '@community-go/i18n';
import { Page, PageHeader, Section } from '@community-go/surface-foundation/layout';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { SelectField } from '@community-go/ui-adapter/form-field';
import { Action } from '@community-go/ui-adapter/action';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { route, RouteLink, usePluginNavigation } from '@community-go/plugin-framework/plugin';
import { usePreferencesPort } from '@community-go/plugin-framework/preferences';
import type { Preferences } from '@community-go/surface/preferences-model';
import {
  IdentityError,
  auditQuerySchema,
  auditOperations,
  defaultAuditQuery,
  useIdentityPort,
  type AuditQuery,
} from '@community-go/surface/identity';
import { useIdentityQuery } from '../../../src/identity/use-query';
import { IdentityModeNotice, IdentityQueryState } from '../../../src/identity/query-state';
export function AuditPage({ query }: Readonly<{ query: AuditQuery | null }>) {
  const { t, locale } = useFrontendTranslation();
  const port = useIdentityPort();
  const { navigate } = usePluginNavigation();
  const preferences = usePreferencesPort<Preferences>().getSnapshot();
  const [search, setSearch] = useState(query?.q ?? '');
  const result = useIdentityQuery(`audit:${JSON.stringify(query)}`, async (service) => {
    if (!query) throw new IdentityError('validation');
    const access = await service.access();
    if (!access.permissions.includes('audit.read')) throw new IdentityError('forbidden');
    return service.audit(query);
  });
  const data = result.data;
  const page = query?.page ?? 1;
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / (query?.pageSize ?? 20)));
  function apply(patch: Partial<AuditQuery>) {
    const parsed = auditQuerySchema.safeParse({ ...(query ?? defaultAuditQuery), ...patch });
    if (!parsed.success) return;
    const next = parsed.data;
    navigate(
      route(
        'audit',
        {},
        {
          query: {
            q: next.q,
            operation: next.operation,
            result: next.result,
            page: String(next.page),
            pageSize: String(next.pageSize),
          },
        },
      ),
    );
  }
  return (
    <Page>
      <PageHeader
        title={t('audit.nav')}
        description={t('audit.description')}
        actions={
          <Action variant="secondary" onPress={result.reload}>
            {t('identityProduct.refresh')}
          </Action>
        }
      />
      <IdentityModeNotice mode={port.mode} />
      {result.error || !data ? (
        <IdentityQueryState error={result.error} retry={result.reload} />
      ) : (
        <Section title={t('audit.nav')} description={t('audit.readonly')}>
          <div className="grid gap-4 p-5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                apply({ q: search, page: 1 });
              }}
              className="flex items-end gap-3"
            >
              <SearchBox
                label={t('audit.search')}
                placeholder={t('audit.search')}
                value={search}
                onChange={setSearch}
              />
              <Action type="submit">{t('identityProduct.search')}</Action>
            </form>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={t('audit.operation')}
                value={query?.operation ?? 'all'}
                options={[
                  { value: 'all', label: t('identityProduct.all') },
                  ...auditOperations.map((value) => ({
                    value,
                    label: t(`management.operations.${value}`),
                  })),
                ]}
                onValueChange={(operation) => {
                  const parsed = auditQuerySchema.shape.operation.safeParse(operation);
                  if (parsed.success) apply({ operation: parsed.data, page: 1 });
                }}
              />
              <SelectField
                label={t('audit.result')}
                value={query?.result ?? 'all'}
                options={['all', 'success', 'failure'].map((value) => ({
                  value,
                  label: t(value === 'all' ? 'identityProduct.all' : `audit.${value}`),
                }))}
                onValueChange={(value) => {
                  if (value === 'all' || value === 'success' || value === 'failure')
                    apply({ result: value, page: 1 });
                }}
              />
            </div>
            {data.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">{t('audit.empty')}</p>
            ) : (
              <ul data-reveal-items className="grid gap-3">
                {data.items.map((record) => (
                  <li key={record.id} className="grid gap-2 rounded-panel border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <RouteLink target={route('audit.detail', {}, { query: { id: record.id } })}>
                        {t(`management.operations.${record.operation}`)}
                      </RouteLink>
                      <StatusPill tone={record.result === 'success' ? 'success' : 'danger'}>
                        {t(`audit.${record.result}`)}
                      </StatusPill>
                    </div>
                    <p className="text-sm">
                      {t('audit.actor')}: {record.actorName} · {t('audit.object')}:{' '}
                      {record.objectName}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {formatDate(
                        locale,
                        record.createdAt,
                        preferences.localeRegion.timeZone === 'auto'
                          ? {}
                          : { timeZone: preferences.localeRegion.timeZone },
                      )}{' '}
                      · {formatTimeOfDay(locale, preferences.localeRegion, record.createdAt)}
                    </p>
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
                  total: formatNumber(locale, data.total),
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
    </Page>
  );
}
