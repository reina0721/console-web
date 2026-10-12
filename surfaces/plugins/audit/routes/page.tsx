'use client';
import { useSearchParams } from 'next/navigation';
import { auditQuerySchema, defaultAuditQuery } from '@community-go/surface/identity';
import { AuditPage } from '../src/audit-page';
export default function AuditRoute() {
  const params = useSearchParams();
  const query = auditQuerySchema.safeParse({
    q: params.get('q') ?? '',
    operation: params.get('operation') ?? 'all',
    result: params.get('result') ?? 'all',
    page: params.has('page') ? Number(params.get('page')) : defaultAuditQuery.page,
    pageSize: params.has('pageSize') ? Number(params.get('pageSize')) : defaultAuditQuery.pageSize,
  });
  return <AuditPage key={params.toString()} query={query.success ? query.data : null} />;
}
