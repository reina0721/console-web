'use client';
import { useFrontendTranslation } from '@community-go/i18n';
import type { Extractor } from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { IconAction } from '@community-go/ui-adapter/icon-action';
import { SelectField, TextField } from '@community-go/ui-adapter/form-field';
import { Plus, Trash2 } from 'lucide-react';
export type ExtractorsPanelProps = Readonly<{
  extractors: readonly Extractor[];
  onChange: (extractors: readonly Extractor[]) => void;
}>;
export function ExtractorsPanel({ extractors, onChange }: ExtractorsPanelProps) {
  const { t } = useFrontendTranslation();
  const update = (id: string, patch: Partial<Extractor>) =>
    onChange(extractors.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  return (
    <div className="@container/editor grid min-w-0 gap-4">
      <p className="text-sm leading-6 text-ink-muted">{t('apiWorkbench.extractors.title')}</p>
      {extractors.length === 0 && (
        <p className="py-4 text-sm text-ink-muted">{t('apiWorkbench.extractors.empty')}</p>
      )}
      {extractors.map((ext) => (
        <div key={ext.id} className="grid min-w-0 gap-3 border-b border-border pb-4">
          <div className="flex justify-end">
            <IconAction
              label={t('apiWorkbench.keyValues.delete')}
              onPress={() => onChange(extractors.filter((item) => item.id !== ext.id))}
              size="sm"
            >
              <Trash2 className="size-4 text-danger" />
            </IconAction>
          </div>
          <div className="grid min-w-0 gap-3 @lg/editor:grid-cols-2">
            <TextField
              label={t('apiWorkbench.extractors.varName')}
              placeholder="authToken"
              value={ext.variable}
              onChange={(event) => update(ext.id, { variable: event.target.value })}
            />
            <SelectField
              label={t('apiWorkbench.extractors.source')}
              value={ext.source}
              options={[
                { value: 'body-json', label: t('apiWorkbench.extractors.sourceJson') },
                { value: 'header', label: t('apiWorkbench.extractors.sourceHeader') },
                { value: 'status', label: t('apiWorkbench.extractors.sourceStatus') },
              ]}
              onValueChange={(value) =>
                update(ext.id, {
                  source:
                    value === 'header' ? 'header' : value === 'status' ? 'status' : 'body-json',
                })
              }
            />
            <TextField
              label={t('apiWorkbench.extractors.expression')}
              value={ext.expression}
              placeholder={ext.source === 'body-json' ? '$.data.token' : 'X-Auth-Token'}
              disabled={ext.source === 'status'}
              onChange={(event) => update(ext.id, { expression: event.target.value })}
            />
            <SelectField
              label={t('apiWorkbench.extractors.scope')}
              value={ext.scope}
              options={[
                { value: 'env', label: t('apiWorkbench.extractors.scopeEnv') },
                { value: 'global', label: t('apiWorkbench.extractors.scopeGlobal') },
              ]}
              onValueChange={(value) =>
                update(ext.id, { scope: value === 'global' ? 'global' : 'env' })
              }
            />
          </div>
        </div>
      ))}
      <div>
        <Action
          variant="secondary"
          size="sm"
          leadingIcon={<Plus className="size-4" />}
          onPress={() =>
            onChange([
              ...extractors,
              {
                id: `ext_${Date.now().toString(36)}`,
                variable: '',
                source: 'body-json',
                expression: '',
                scope: 'env',
              },
            ])
          }
        >
          {t('apiWorkbench.extractors.add')}
        </Action>
      </div>
    </div>
  );
}
