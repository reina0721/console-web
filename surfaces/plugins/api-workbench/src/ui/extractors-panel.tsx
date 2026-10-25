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

  const handleUpdate = (id: string, patch: Partial<Extractor>) => {
    onChange(extractors.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const handleDelete = (id: string) => {
    onChange(extractors.filter((e) => e.id !== id));
  };

  const handleAdd = () => {
    const newExt: Extractor = {
      id: `ext_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      variable: '',
      source: 'body-json',
      expression: '',
      scope: 'env',
    };
    onChange([...extractors, newExt]);
  };

  return (
    <div className="grid gap-3">
      <p className="text-xs text-ink-muted">{t('apiWorkbench.extractors.title')}</p>

      {extractors.length === 0 ? (
        <p className="py-4 text-center text-xs text-ink-muted">
          {t('apiWorkbench.extractors.empty')}
        </p>
      ) : (
        <div className="grid gap-3">
          {extractors.map((ext) => (
            <div
              key={ext.id}
              className="flex flex-wrap items-end gap-3 rounded-panel border border-border bg-surface-muted p-3"
            >
              <div className="w-40">
                <TextField
                  label={t('apiWorkbench.extractors.varName')}
                  placeholder="token"
                  value={ext.variable}
                  onChange={(e) => handleUpdate(ext.id, { variable: e.target.value })}
                />
              </div>

              <div className="w-40">
                <SelectField
                  label={t('apiWorkbench.extractors.source')}
                  options={[
                    { value: 'body-json', label: t('apiWorkbench.extractors.sourceJson') },
                    { value: 'header', label: t('apiWorkbench.extractors.sourceHeader') },
                    { value: 'status', label: t('apiWorkbench.extractors.sourceStatus') },
                  ]}
                  value={ext.source}
                  onValueChange={(id: string) =>
                    handleUpdate(ext.id, {
                      source: id as 'body-json' | 'header' | 'status',
                    })
                  }
                />
              </div>

              <div className="min-w-40 flex-1">
                <TextField
                  label={t('apiWorkbench.extractors.expression')}
                  placeholder={ext.source === 'body-json' ? '$.data.token' : 'X-Auth-Token'}
                  value={ext.expression}
                  disabled={ext.source === 'status'}
                  onChange={(e) => handleUpdate(ext.id, { expression: e.target.value })}
                />
              </div>

              <div className="w-32">
                <SelectField
                  label={t('apiWorkbench.extractors.scope')}
                  options={[
                    { value: 'env', label: t('apiWorkbench.extractors.scopeEnv') },
                    { value: 'global', label: t('apiWorkbench.extractors.scopeGlobal') },
                  ]}
                  value={ext.scope}
                  onValueChange={(id: string) =>
                    handleUpdate(ext.id, { scope: id as 'env' | 'global' })
                  }
                />
              </div>

              <div className="flex w-full items-center justify-end">
                <IconAction
                  label={t('apiWorkbench.keyValues.delete')}
                  onPress={() => handleDelete(ext.id)}
                  size="sm"
                >
                  <Trash2 className="size-4 text-danger" />
                </IconAction>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <Action variant="secondary" onPress={handleAdd}>
          <Plus className="mr-1.5 size-4" />
          {t('apiWorkbench.extractors.add')}
        </Action>
      </div>
    </div>
  );
}
