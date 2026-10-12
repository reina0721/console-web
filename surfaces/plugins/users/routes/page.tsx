'use client';
import { useSearchParams } from 'next/navigation';
import { IdentityError, defaultUserQuery } from '@community-go/surface/identity/runtime';
import { useIdentityQuery } from '../../../src/identity/use-query';
import { IdentityQueryState } from '../../../src/identity/query-state';
import { Page, PageHeader } from '@community-go/surface-foundation/layout';
import { useFrontendTranslation } from '@community-go/i18n';
import { UsersPage } from '../src/users-page';
export default function UsersRoute() {
  const params = useSearchParams();
  const { t } = useFrontendTranslation();
  const parsed = useIdentityQuery(`users.params:${params.toString()}`, async () => {
    const { userQuerySchema } = await import('../../../src/identity/model');
    const query = userQuerySchema.safeParse({
      q: params.get('q') ?? '',
      status: params.get('status') ?? 'all',
      roleId: params.get('roleId') ?? 'all',
      sort: params.get('sort') ?? 'name',
      direction: params.get('direction') ?? 'asc',
      page: params.has('page') ? Number(params.get('page')) : defaultUserQuery.page,
      pageSize: params.has('pageSize') ? Number(params.get('pageSize')) : defaultUserQuery.pageSize,
    });
    if (!query.success) throw new IdentityError('validation');
    return query.data;
  });
  return parsed.data ? (
    <UsersPage key={params.toString()} query={parsed.data} />
  ) : (
    <Page>
      <PageHeader title={t('users.title')} description={t('users.description')} />
      <IdentityQueryState error={parsed.error} retry={parsed.reload} />
    </Page>
  );
}
