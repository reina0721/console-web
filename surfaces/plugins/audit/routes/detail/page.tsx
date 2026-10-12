'use client';
import { useSearchParams } from 'next/navigation';
import { AuditDetailPage } from '../../src/audit-detail-page';
export default function AuditDetailRoute() {
  return <AuditDetailPage id={useSearchParams().get('id')} />;
}
