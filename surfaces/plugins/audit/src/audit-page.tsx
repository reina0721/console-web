'use client';
import { lazy, Suspense, useState } from 'react';
import {
  useFrontendTranslation,
  formatDate,
  formatTimeOfDay,
  formatNumber,
} from '@community-go/i18n';
import { Page, PageHeader } from '@community-go/surface-foundation/layout';
import { Collection } from '@community-go/surface-foundation/collection';
import type { DataColumn } from '@community-go/ui-adapter/data-display';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { SelectField, TextField } from '@community-go/ui-adapter/form-field';
import { BusyIndicator } from '@community-go/ui-adapter/busy-indicator';
import { Action } from '@community-go/ui-adapter/action';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { route, RouteLink, usePluginNavigation } from '@community-go/plugin-framework/plugin';
import { usePreferencesPort } from '@community-go/plugin-framework/preferences';
import type { Preferences } from '@community-go/surface/preferences-model';
import {
  IdentityError,
  auditOperations,
  defaultAuditQuery,
  useIdentityPort,
  type AuditQuery,
  type AuditRecord,
} from '@community-go/surface/identity/runtime';
import { useIdentityQuery } from '../../../src/identity/use-query';
import {
  IdentityModeNotice,
  IdentityQueryState,
  IdentityMutationError,
} from '../../../src/identity/query-state';
const DatePickerField = lazy(() =>
  import('@community-go/ui-adapter/date-picker-field').then((module) => ({
    default: module.DatePickerField,
  })),
);
const AuditTable = lazy(() =>
  import('./audit-table').then((module) => ({
    default: module.AuditTable,
  })),
);
export function AuditPage({ query }: Readonly<{ query: AuditQuery | null }>) {
  const { t, locale } = useFrontendTranslation();
  const port = useIdentityPort();
  const navigation = usePluginNavigation();
  const region = usePreferencesPort<Preferences>().getSnapshot().localeRegion;
  const filters = query ?? defaultAuditQuery;
  const [search, setSearch] = useState(filters.q);
  const [actor, setActor] = useState(filters.actor ?? '');
  const [object, setObject] = useState(filters.object ?? '');
  const [from, setFrom] = useState(filters.from ?? '');
  const [to, setTo] = useState(filters.to ?? '');
  const [failure, setFailure] = useState<IdentityError | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const result = useIdentityQuery(`audit:${JSON.stringify(query)}`, async (service) => {
    if (!query) throw new IdentityError('validation');
    const access = await service.access();
    if (!access.permissions.includes('audit.read')) throw new IdentityError('forbidden');
    return service.audit(query);
  });
  const location = (value: AuditQuery) => ({
    q: value.q,
    operation: value.operation,
    result: value.result,
    actor: value.actor ?? '',
    object: value.object ?? '',
    from: value.from ?? '',
    to: value.to ?? '',
    page: String(value.page),
    pageSize: String(value.pageSize),
  });
  function apply(patch: Partial<AuditQuery>) {
    setFailure(null);
    void import('../../../src/identity/model')
      .then(({ auditQuerySchema }) => {
        const parsed = auditQuerySchema.safeParse({ ...filters, ...patch });
        if (!parsed.success) {
          setFailure(new IdentityError('validation'));
          return;
        }
        navigation.navigate(route('audit', {}, { query: location(parsed.data) }));
      })
      .catch(() => setFailure(new IdentityError('unavailable')));
  }
  const timestamp = (value: string) =>
    formatDate(locale, value, region.timeZone === 'auto' ? {} : { timeZone: region.timeZone }) +
    ' · ' +
    formatTimeOfDay(locale, region, value);
  const operation = (record: AuditRecord) => (
    <RouteLink
      target={route('audit.detail', {}, { query: { ...location(filters), id: record.id } })}
    >
      {t(`management.operations.${record.operation}`)}
    </RouteLink>
  );
  const status = (record: AuditRecord) => (
    <StatusPill tone={record.result === 'success' ? 'success' : 'danger'}>
      {t(`audit.${record.result}`)}
    </StatusPill>
  );
  const columns: readonly DataColumn<AuditRecord>[] = [
    { id: 'time', label: t('audit.time'), render: (record) => timestamp(record.createdAt) },
    { id: 'operation', label: t('audit.operation'), rowHeader: true, render: operation },
    { id: 'actor', label: t('audit.actor'), render: (record) => record.actorName },
    { id: 'object', label: t('audit.object'), render: (record) => record.objectName },
    { id: 'result', label: t('audit.result'), render: status },
  ];
  const pages = Math.max(1, Math.ceil((result.data?.total ?? 0) / filters.pageSize));
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
      <IdentityMutationError error={failure} />
      {result.error || !result.data ? (
        <IdentityQueryState error={result.error} retry={result.reload} />
      ) : (
        <Collection
          title={t('audit.records')}
          description={t('audit.readonly')}
          filters={
            <form
              className="grid min-w-0 gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                apply({ q: search, actor, object, from, to, page: 1 });
              }}
            >
              <SearchBox
                label={t('audit.search')}
                placeholder={t('audit.search')}
                value={search}
                onValueChange={setSearch}
              />
              <details
                className="min-w-0"
                onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
              >
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  {t('audit.filters')}
                </summary>
                <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <TextField
                    label={t('audit.actor')}
                    value={actor}
                    onChange={(event) => setActor(event.target.value)}
                  />
                  <TextField
                    label={t('audit.object')}
                    value={object}
                    onChange={(event) => setObject(event.target.value)}
                  />
                  {filtersOpen ? (
                    <Suspense fallback={<BusyIndicator label={t('identityProduct.loading')} />}>
                      <DatePickerField
                        label={t('audit.from')}
                        value={from ? from.slice(0, 10) : null}
                        calendarLabel={t('audit.calendar')}
                        hint={from ? timestamp(from) : t('audit.utcHint')}
                        onValueChange={(value) => setFrom(value ? value + 'T00:00:00.000Z' : '')}
                      />
                      <DatePickerField
                        label={t('audit.to')}
                        value={to ? to.slice(0, 10) : null}
                        calendarLabel={t('audit.calendar')}
                        hint={to ? timestamp(to) : t('audit.utcHint')}
                        onValueChange={(value) => setTo(value ? value + 'T23:59:59.999Z' : '')}
                      />
                    </Suspense>
                  ) : null}
                  <SelectField
                    label={t('audit.operation')}
                    value={filters.operation}
                    options={[
                      { value: 'all', label: t('identityProduct.all') },
                      ...auditOperations.map((value) => ({
                        value,
                        label: t(`management.operations.${value}`),
                      })),
                    ]}
                    onValueChange={(value) => {
                      const operation = auditOperations.find((item) => item === value);
                      if (operation || value === 'all')
                        apply({ operation: operation ?? 'all', page: 1 });
                    }}
                  />
                  <SelectField
                    label={t('audit.result')}
                    value={filters.result}
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
              </details>
              <div className="flex flex-wrap gap-3">
                <Action type="submit">{t('identityProduct.search')}</Action>
                <Action variant="quiet" onPress={() => navigation.navigate(route('audit'))}>
                  {t('identityProduct.clear')}
                </Action>
              </div>
            </form>
          }
          content={
            <Suspense fallback={<BusyIndicator label={t('identityProduct.loading')} />}>
              <AuditTable columns={columns} rows={result.data.items} />
            </Suspense>
          }
          narrowContent={
            <ul data-reveal-items className="divide-y divide-border">
              {result.data.items.map((record) => (
                <li key={record.id} className="grid min-w-0 gap-3 p-5">
                  <p className="text-xs text-ink-muted">{timestamp(record.createdAt)}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {operation(record)}
                    {status(record)}
                  </div>
                  <p className="break-words text-sm">
                    {t('audit.actor')}: {record.actorName} · {t('audit.object')}:{' '}
                    {record.objectName}
                  </p>
                </li>
              ))}
              {!result.data.items.length ? (
                <li className="p-5 text-ink-muted">{t('audit.empty')}</li>
              ) : null}
            </ul>
          }
          pagination={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Action
                variant="secondary"
                disabled={filters.page <= 1 || result.loading}
                onPress={() => apply({ page: filters.page - 1 })}
              >
                {t('management.previous')}
              </Action>
              <p className="text-sm text-ink-muted">
                {t('management.pagination', {
                  page: formatNumber(locale, filters.page),
                  pages: formatNumber(locale, pages),
                  total: formatNumber(locale, result.data.total),
                })}
              </p>
              <Action
                variant="secondary"
                disabled={filters.page >= pages || result.loading}
                onPress={() => apply({ page: filters.page + 1 })}
              >
                {t('management.next')}
              </Action>
            </div>
          }
        />
      )}
    </Page>
  );
}
