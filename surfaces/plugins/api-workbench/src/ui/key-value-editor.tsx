'use client';

import { useFrontendTranslation } from '@community-go/i18n';
import type { KeyValueEntry } from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { IconAction } from '@community-go/ui-adapter/icon-action';
import { CheckboxField, TextField } from '@community-go/ui-adapter/form-field';
import { Plus, Trash2 } from 'lucide-react';

export type KeyValueEditorProps = Readonly<{
  entries: readonly KeyValueEntry[];
  onChange: (entries: readonly KeyValueEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showDescription?: boolean;
}>;

export function KeyValueEditor({
  entries,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  showDescription = false,
}: KeyValueEditorProps) {
  const { t } = useFrontendTranslation();

  const handleToggle = (id: string, enabled: boolean) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, enabled } : e)));
  };

  const handleUpdate = (id: string, patch: Partial<KeyValueEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const handleDelete = (id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  };

  const handleAdd = () => {
    const newEntry: KeyValueEntry = {
      id: `kv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      key: '',
      value: '',
      enabled: true,
      description: showDescription ? '' : undefined,
    };
    onChange([...entries, newEntry]);
  };

  return (
    <div className="grid gap-2">
      {entries.length === 0 ? (
        <p className="py-4 text-center text-xs text-ink-muted">
          {t('apiWorkbench.keyValues.empty')}
        </p>
      ) : (
        <div className="grid gap-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex min-w-0 items-center gap-2 rounded-panel border border-border bg-surface-muted p-2"
            >
              <CheckboxField
                checked={entry.enabled}
                onCheckedChange={(checked: boolean) => handleToggle(entry.id, checked)}
                label={entry.key || '启用'}
              />
              <div className="min-w-0 flex-1">
                <TextField
                  label={keyPlaceholder ?? t('apiWorkbench.keyValues.key')}
                  placeholder={keyPlaceholder ?? t('apiWorkbench.keyValues.key')}
                  value={entry.key}
                  onChange={(e) => handleUpdate(entry.id, { key: e.target.value })}
                />
              </div>
              <div className="min-w-0 flex-1">
                <TextField
                  label={valuePlaceholder ?? t('apiWorkbench.keyValues.value')}
                  placeholder={valuePlaceholder ?? t('apiWorkbench.keyValues.value')}
                  value={entry.value}
                  onChange={(e) => handleUpdate(entry.id, { value: e.target.value })}
                />
              </div>
              {showDescription && (
                <div className="min-w-0 flex-1">
                  <TextField
                    label={t('apiWorkbench.keyValues.description')}
                    placeholder={t('apiWorkbench.keyValues.description')}
                    value={entry.description ?? ''}
                    onChange={(e) => handleUpdate(entry.id, { description: e.target.value })}
                  />
                </div>
              )}
              <IconAction
                label={t('apiWorkbench.keyValues.delete')}
                onPress={() => handleDelete(entry.id)}
                size="sm"
              >
                <Trash2 className="size-4 text-danger" />
              </IconAction>
            </div>
          ))}
        </div>
      )}

      <div>
        <Action variant="secondary" onPress={handleAdd}>
          <Plus className="mr-1.5 size-4" />
          {t('apiWorkbench.keyValues.add')}
        </Action>
      </div>
    </div>
  );
}
