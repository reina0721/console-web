'use client';
import { DataTable, type DataColumn } from '@community-go/ui-adapter/data-display';
import { useFrontendTranslation } from '@community-go/i18n';
import type { AuditRecord } from '@community-go/surface/identity/runtime';

export function AuditTable({
  columns,
  rows,
}: Readonly<{
  columns: readonly DataColumn<AuditRecord>[];
  rows: readonly AuditRecord[];
}>) {
  const { t } = useFrontendTranslation();
  return (
    <DataTable
      label={t('audit.nav')}
      columns={columns}
      rows={rows}
      emptyContent={<p className="p-5 text-ink-muted">{t('audit.empty')}</p>}
    />
  );
}
