'use client';
import { useState } from 'react';
import { formatDate, formatNumber, useFrontendTranslation } from '@community-go/i18n';
import { Page, PageHeader } from '@community-go/surface-foundation/layout';
import {
  BulkActionBar,
  Collection,
  CollectionPagination,
  CollectionQuery,
} from '@community-go/surface-foundation/collection';
import { Action } from '@community-go/ui-adapter/action';
import { IconAction } from '@community-go/ui-adapter/icon-action';
import { PaginationControl } from '@community-go/ui-adapter/navigation';
import { DataTable, type DataColumn } from '@community-go/ui-adapter/data-display';
import { SelectField, CheckboxField } from '@community-go/ui-adapter/form-field';
import { ConfirmDialog } from '@community-go/ui-adapter/overlays';
import { useRef } from 'react';
import type { BatchStatusResult } from '@community-go/surface/identity/runtime';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { StateSurface } from '@community-go/ui-adapter/state-surface';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { NavigationIcon } from '@community-go/surface/icon-presentation';
import { ArrowUpDown, Plus, RefreshCw, UserCheck, UserX, X } from '../../../src/action-icons';
import {
  useIdentityPort,
  IdentityError,
  defaultUserQuery,
  type UserQuery,
  type DirectoryUser,
} from '@community-go/surface/identity/runtime';
import { route, RouteLink, usePluginNavigation } from '@community-go/plugin-framework/plugin';
import { usePreferencesPort } from '@community-go/plugin-framework/preferences';
import type { Preferences } from '@community-go/surface/preferences-model';
import { useIdentityQuery } from '../../../src/identity/use-query';
import {
  IdentityQueryState,
  IdentityModeNotice,
  IdentityMutationError,
} from '../../../src/identity/query-state';

export function UsersPage({ query }: Readonly<{ query: UserQuery | null }>) {
  const port = useIdentityPort();
  const { t, locale } = useFrontendTranslation();
  const navigation = usePluginNavigation();
  const preferences = usePreferencesPort<Preferences>().getSnapshot();
  const [filterError, setFilterError] = useState<IdentityError | null>(null);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [batchNames, setBatchNames] = useState<ReadonlyMap<string, string>>(new Map());
  const [batchResult, setBatchResult] = useState<BatchStatusResult | null>(null);
  const [batchTarget, setBatchTarget] = useState<'active' | 'disabled' | null>(null);
  const [batchPending, setBatchPending] = useState(false);
  const batchLock = useRef(false);
  const [search, setSearch] = useState(query?.q ?? '');
  const result = useIdentityQuery(`users:${JSON.stringify(query)}`, async (service) => {
    if (!query) throw new IdentityError('validation');
    const access = await service.access();
    if (!access.permissions.includes('users.read')) throw new IdentityError('forbidden');
    const [page, roles] = await Promise.all([service.list(query), service.roles()]);
    return { access, page, roles };
  });
  function apply(patch: Partial<UserQuery>) {
    setFilterError(null);
    void (async () => {
      const { userQuerySchema } = await import('../../../src/identity/model');
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
    })().catch((error: unknown) => {
      setFilterError(error instanceof IdentityError ? error : new IdentityError('unavailable'));
    });
  }
  const clear = () => navigation.navigate(route('users'));
  const data = result.data;
  const selectedUsers = data?.page.items.filter((user) => selected.includes(user.id)) ?? [];
  async function submitBatch() {
    if (!batchTarget || batchLock.current || !selectedUsers.length) return;
    batchLock.current = true;
    setBatchPending(true);
    setBatchNames(new Map(selectedUsers.map((user) => [user.id, user.name])));
    try {
      const response = await port.batchStatus({
        status: batchTarget,
        items: selectedUsers.map(({ id, version }) => ({ id, version })),
      });
      setBatchResult(response);
      setSelected(response.items.filter((item) => !item.success).map((item) => item.id));
      setBatchTarget(null);
      result.reload();
    } catch (error) {
      setFilterError(error instanceof IdentityError ? error : new IdentityError('unavailable'));
      throw error;
    } finally {
      batchLock.current = false;
      setBatchPending(false);
    }
  }
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
            <RouteLink
              target={route('users.create')}
              presentation="action"
              variant="primary"
              leadingIcon={<Plus className="size-4" />}
            >
              {t('users.create')}
            </RouteLink>
          ) : undefined
        }
      />
      <IdentityModeNotice mode={port.mode} />
      <IdentityMutationError error={filterError} />
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
          count={formatNumber(locale, data.page.total)}
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
                    label={t('users.search')}
                    placeholder={t('users.searchPlaceholder')}
                    value={search}
                    onValueChange={(val) => {
                      setSearch(val);
                      if (!val && query.q) {
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
                    presentation="toolbar"
                    label={t('identityProduct.roles')}
                    value={query.roleId}
                    options={[
                      { value: 'all', label: t('identityProduct.all') },
                      ...data.roles.map((role) => ({ value: role.id, label: roleLabel(role.id) })),
                    ]}
                    onValueChange={(roleId) => apply({ roleId, page: 1 })}
                  />
                </>
              }
              view={
                <div className="flex items-center gap-1.5 md:hidden">
                  <SelectField
                    presentation="toolbar"
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
                  <IconAction
                    label={query.direction === 'asc' ? t('users.ascending') : t('users.descending')}
                    tooltip
                    size="sm"
                    onPress={() =>
                      apply({ direction: query.direction === 'asc' ? 'desc' : 'asc', page: 1 })
                    }
                  >
                    <ArrowUpDown className="size-3.5" />
                  </IconAction>
                </div>
              }
              reset={
                query.q || query.status !== 'all' || query.roleId !== 'all' ? (
                  <Action
                    variant="quiet"
                    size="sm"
                    leadingIcon={<X className="size-3.5" />}
                    onPress={clear}
                  >
                    {t('identityProduct.clear')}
                  </Action>
                ) : null
              }
            />
          }
          bulk={
            data.access.permissions.includes('users.status') ? (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-muted/30 px-4 py-2">
                <div className="flex items-center gap-3">
                  <CheckboxField
                    label={t('users.selectPage')}
                    checked={
                      Boolean(data.page.items.length) &&
                      selectedUsers.length === data.page.items.length
                    }
                    disabled={batchPending || !data.page.items.length}
                    onCheckedChange={(checked) =>
                      setSelected(checked ? data.page.items.map((u) => u.id) : [])
                    }
                  />
                  {selectedUsers.length ? (
                    <span className="text-xs font-medium text-ink-muted">
                      {t('users.selected', { count: selectedUsers.length })}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {selectedUsers.length ? (
                    <Action size="sm" variant="quiet" onPress={() => setSelected([])}>
                      {t('identityProduct.clear')}
                    </Action>
                  ) : null}
                  <Action
                    size="sm"
                    variant="secondary"
                    disabled={!selectedUsers.length || batchPending}
                    leadingIcon={<UserCheck className="size-3.5" />}
                    onPress={() => setBatchTarget('active')}
                  >
                    {t('users.batchEnable')}
                  </Action>
                  <Action
                    size="sm"
                    variant="secondary"
                    disabled={!selectedUsers.length || batchPending}
                    leadingIcon={<UserX className="size-3.5" />}
                    onPress={() => setBatchTarget('disabled')}
                  >
                    {t('users.batchDisable')}
                  </Action>
                </div>
              </div>
            ) : null
          }
          content={
            <div aria-busy={result.loading || undefined}>
              {batchResult ? (
                <div className="border-b border-border bg-surface-muted/30 p-3 text-sm">
                  <ul aria-live="polite" className="grid gap-1">
                    {batchResult.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <span className="font-medium">{batchNames.get(item.id) ?? item.id}:</span>
                        <span className={item.success ? 'text-success' : 'text-danger'}>
                          {item.success
                            ? t('users.batchSuccess')
                            : t(
                                item.reason
                                  ? `identityProduct.reasons.${item.reason}`
                                  : `identityProduct.errors.${item.code}`,
                              )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <DataTable
                label={t('users.collection')}
                columns={columns}
                rows={data.page.items}
                {...(data.access.permissions.includes('users.status')
                  ? {
                      selection: {
                        mode: 'multiple' as const,
                        selectedIds: selected,
                        onSelectionChange: (ids: readonly string[]) => {
                          if (!batchPending) setSelected(ids);
                        },
                      },
                    }
                  : {})}
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
                  <li key={user.id} className="flex items-start gap-3 p-4">
                    {data.access.permissions.includes('users.status') ? (
                      <div className="pt-0.5">
                        <CheckboxField
                          label={t('users.selectUser', { name: user.name })}
                          checked={selected.includes(user.id)}
                          disabled={batchPending}
                          onCheckedChange={(checked) =>
                            setSelected((prior) =>
                              checked ? [...prior, user.id] : prior.filter((id) => id !== user.id),
                            )
                          }
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1 grid gap-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{detailLink(user)}</span>
                        {status(user)}
                      </div>
                      <p className="break-words text-sm text-ink-muted">{user.email}</p>
                      <p className="text-sm text-ink-muted">
                        {user.roleIds.map(roleLabel).join(' / ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              empty
            )
          }
          pagination={
            <CollectionPagination
              summary={t('users.page', {
                page: formatNumber(locale, query.page),
                pages: formatNumber(locale, pages),
              })}
              pageSize={
                <SelectField
                  presentation="toolbar"
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
              }
              pager={
                <PaginationControl
                  label={t('users.collection')}
                  page={query.page}
                  totalPages={pages}
                  disabled={result.loading}
                  previousLabel={t('users.previous')}
                  nextLabel={t('users.next')}
                  getPageLabel={(p) => formatNumber(locale, p)}
                  onPageChange={(p) => apply({ page: p })}
                />
              }
            />
          }
        />
      )}
      <ConfirmDialog
        triggerLabel=""
        title={t('users.batchConfirm')}
        description={t('users.batchDescription', {
          count: selectedUsers.length,
          status: t(`identityProduct.${batchTarget ?? 'active'}`),
        })}
        impact={t('users.batchProtection')}
        cancelLabel={t('users.batchCancel')}
        confirmLabel={t('users.batchApply')}
        failureMessage={t('users.batchFailure')}
        isOpen={batchTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBatchTarget(null);
        }}
        onConfirm={submitBatch}
      />
    </Page>
  );
}
