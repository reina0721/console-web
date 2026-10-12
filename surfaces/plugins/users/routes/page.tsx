'use client';
import { useSearchParams } from 'next/navigation';
import { defaultUserQuery, userQuerySchema } from '@community-go/surface/identity';
import { UsersPage } from '../src/users-page';
export default function UsersRoute() {
  const params = useSearchParams();
  const query = userQuerySchema.safeParse({
    q: params.get('q') ?? '',
    status: params.get('status') ?? 'all',
    roleId: params.get('roleId') ?? 'all',
    sort: params.get('sort') ?? 'name',
    direction: params.get('direction') ?? 'asc',
    page: params.has('page') ? Number(params.get('page')) : defaultUserQuery.page,
    pageSize: params.has('pageSize') ? Number(params.get('pageSize')) : defaultUserQuery.pageSize,
  });
  return <UsersPage key={params.toString()} query={query.success ? query.data : null} />;
}
