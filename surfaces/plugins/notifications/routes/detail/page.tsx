'use client';
import { useSearchParams } from 'next/navigation';
import { InboxPage } from '../../src/inbox-page';
import { inboxQuerySchema } from '../../src/query';
export default function NotificationDetailRoute() {
  const params = useSearchParams();
  const query = inboxQuerySchema.safeParse({
    q: params.get('q') ?? '',
    category: params.get('category') ?? 'all',
    read: params.get('read') ?? 'all',
    page: params.has('page') ? Number(params.get('page')) : 1,
  });
  return (
    <InboxPage
      key={params.toString()}
      id={params.get('id') ?? ''}
      query={query.success ? query.data : null}
    />
  );
}
