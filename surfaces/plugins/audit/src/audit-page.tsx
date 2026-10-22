'use client';
import { lazy, Suspense, useState } from 'react';
import {
  useFrontendTranslation,
  formatDate,
  formatTimeOfDay,
  formatNumber,
} from '@community-go/i18n';
import { Page, PageHeader } from '@community-go/surface-foundation/layout';
import {
  Collection,
  CollectionPagination,
  CollectionQuery,
} from '@community-go/surface-foundation/collection';
import type { DataColumn } from '@community-go/ui-adapter/data-display';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { SelectField, TextField } from '@community-go/ui-adapter/form-field';
import { BusyIndicator } from '@community-go/ui-adapter/busy-indicator';
import { Action } from '@community-go/ui-adapter/action';
import { IconAction } from '@community-go/ui-adapter/icon-action';
import { PaginationControl } from '@community-go/ui-adapter/navigation';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { route, RouteLink, usePluginNavigation } from '@community-go/plugin-framework/plugin';
import { usePreferencesPort } from '@community-go/plugin-framework/preferences';
import type { Preferences } from '@community-go/surface/preferences-model';
import { Filter, RefreshCw } from '../../../src/action-icons';
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
  IdentityEmptyState,
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
      <PageHeader title={t('audit.nav')} description={t('audit.description')} />
      <IdentityModeNotice mode={port.mode} />
      <IdentityMutationError error={failure} />
      {result.error || !result.data ? (
        <IdentityQueryState error={result.error} retry={result.reload} />
      ) : (
        <Collection
          title={t('audit.records')}
          count={formatNumber(locale, result.data.total)}
          description={t('audit.readonly')}
          tools={
            <IconAction
              label={t('identityProduct.refresh')}
              tooltip
              loading={result.loading}
              onPress={result.reload}
            >
              <RefreshCw className="size-4" />
            </IconAction>
          }
          query={
            <CollectionQuery
              search={
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    apply({ q: search, page: 1 });
                  }}
                >
                  <SearchBox
                    label={t('audit.search')}
                    placeholder={t('audit.search')}
                    value={search}
                    onValueChange={(val) => {
                      setSearch(val);
                      if (!val && filters.q) {
                        apply({ q: '', page: 1 });
                      }
                    }}
                  />
                </form>
              }
              filters={
                <>
                  <SelectField
                    presentation="toolbar"
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
                    presentation="toolbar"
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
                </>
              }
              advanced={
                <details
                  className="min-w-0"
                  open={filtersOpen}
                  onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
                >
                  <summary className="cursor-pointer text-sm font-semibold text-ink inline-flex items-center gap-1.5 py-1">
                    <Filter className="size-3.5 text-ink-muted" />
                    <span>{t('audit.filters')}</span>
                  </summary>
                  <form
                    className="mt-3 grid gap-3 rounded-panel border border-border bg-surface p-4 text-sm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      apply({ q: search, actor, object, from, to, page: 1 });
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                      <Action
                        variant="quiet"
                        size="sm"
                        onPress={() => {
                          setSearch('');
                          setActor('');
                          setObject('');
                          setFrom('');
                          setTo('');
                          setFiltersOpen(false);
                          navigation.navigate(route('audit'));
                        }}
                      >
                        {t('identityProduct.clear')}
                      </Action>
                      <Action type="submit" size="sm">
                        {t('identityProduct.search')}
                      </Action>
                    </div>
                  </form>
                </details>
              }
            />
          }
          content={
            <Suspense fallback={<BusyIndicator label={t('identityProduct.loading')} />}>
              <AuditTable columns={columns} rows={result.data.items} />
            </Suspense>
          }
          narrowContent={
            <ul data-reveal-items className="divide-y divide-border">
              {result.data.items.map((record) => (
                <li key={record.id} className="grid min-w-0 gap-2.5 p-4">
                  <p className="text-xs tabular-nums text-ink-muted">
                    {timestamp(record.createdAt)}
                  </p>
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
                <li className="p-6">
                  <IdentityEmptyState title={t('audit.empty')} description={t('audit.readonly')} />
                </li>
              ) : null}
            </ul>
          }
          pagination={
            <CollectionPagination
              summary={t('management.pagination', {
                page: formatNumber(locale, filters.page),
                pages: formatNumber(locale, pages),
                total: formatNumber(locale, result.data.total),
              })}
              pager={
                <PaginationControl
                  label={t('audit.records')}
                  page={filters.page}
                  totalPages={pages}
                  disabled={result.loading}
                  previousLabel={t('management.previous')}
                  nextLabel={t('management.next')}
                  getPageLabel={(p) => formatNumber(locale, p)}
                  onPageChange={(p) => apply({ page: p })}
                />
              }
            />
          }
        />
      )}
    </Page>
  );
}
