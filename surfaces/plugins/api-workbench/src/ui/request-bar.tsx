'use client';

import { useFrontendTranslation } from '@community-go/i18n';
import type { ApiRequestDefinition, HttpMethod } from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { SelectField, type SelectOption, TextField } from '@community-go/ui-adapter/form-field';
import { CheckCheck, Save, Send } from 'lucide-react';
import { parseCurl } from '../model/curl';

export type RequestBarProps = Readonly<{
  request: ApiRequestDefinition;
  isExecuting: boolean;
  isDirty: boolean;
  onChange: (patch: Partial<ApiRequestDefinition>) => void;
  onSend: () => void;
  onSave: () => void;
}>;

const methodOptions: readonly SelectOption[] = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
];

export function RequestBar({
  request,
  isExecuting,
  isDirty,
  onChange,
  onSend,
  onSave,
}: RequestBarProps) {
  const { t } = useFrontendTranslation();

  const handleUrlChange = (value: string) => {
    // Check if user pasted a curl command
    if (value.trim().toLowerCase().startsWith('curl')) {
      const parsed = parseCurl(value);
      if (parsed) {
        onChange({
          method: parsed.method,
          url: parsed.url,
          headers: [...request.headers, ...parsed.headers],
          body: parsed.body,
        });
        return;
      }
    }
    onChange({ url: value });
  };

  const methodTone =
    request.method === 'GET'
      ? 'text-success border-success/30 bg-success-soft/30'
      : request.method === 'POST'
        ? 'text-info border-info/30 bg-info-soft/30'
        : request.method === 'DELETE'
          ? 'text-danger border-danger/30 bg-danger-soft/30'
          : 'text-warning border-warning/30 bg-warning-soft/30';

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight text-ink">{request.name}</h2>
        <Action
          variant={isDirty ? 'primary' : 'secondary'}
          size="sm"
          onPress={onSave}
          disabled={!isDirty}
        >
          {isDirty ? (
            <>
              <Save className="mr-1.5 size-4" />
              {t('apiWorkbench.requestBar.save')}
            </>
          ) : (
            <>
              <CheckCheck className="mr-1.5 size-4 text-success" />
              {t('apiWorkbench.requestBar.saved')}
            </>
          )}
        </Action>
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-32 rounded-panel border ${methodTone}`}>
          <SelectField
            label="HTTP 方法"
            options={methodOptions}
            value={request.method}
            onValueChange={(id: string) => onChange({ method: id as HttpMethod })}
          />
        </div>

        <div className="min-w-0 flex-1">
          <TextField
            label={t('apiWorkbench.requestBar.urlPlaceholder')}
            placeholder={t('apiWorkbench.requestBar.urlPlaceholder')}
            value={request.url}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
        </div>

        <Action variant="primary" onPress={onSend} disabled={isExecuting || !request.url.trim()}>
          <Send className="mr-1.5 size-4" />
          {isExecuting ? t('apiWorkbench.requestBar.sending') : t('apiWorkbench.requestBar.send')}
        </Action>
      </div>
    </div>
  );
}
