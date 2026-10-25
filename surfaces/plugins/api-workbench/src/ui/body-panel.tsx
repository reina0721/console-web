'use client';

import { useFrontendTranslation } from '@community-go/i18n';
import type { RequestBody } from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { SelectField, type SelectOption, TextAreaField } from '@community-go/ui-adapter/form-field';
import { KeyValueEditor } from './key-value-editor';

export type BodyPanelProps = Readonly<{
  body: RequestBody;
  onChange: (body: RequestBody) => void;
}>;

export function BodyPanel({ body, onChange }: BodyPanelProps) {
  const { t } = useFrontendTranslation();

  const bodyOptions: readonly SelectOption[] = [
    { value: 'none', label: t('apiWorkbench.body.none') },
    { value: 'json', label: t('apiWorkbench.body.json') },
    { value: 'text', label: t('apiWorkbench.body.text') },
    { value: 'xml', label: t('apiWorkbench.body.xml') },
    { value: 'form-urlencoded', label: t('apiWorkbench.body.formUrlencoded') },
    { value: 'form-data', label: t('apiWorkbench.body.formData') },
  ];

  const handleTypeChange = (typeId: string) => {
    if (typeId === 'json' || typeId === 'text' || typeId === 'xml') {
      const priorContent =
        body.type === 'json' || body.type === 'text' || body.type === 'xml' ? body.content : '';
      onChange({ type: typeId, content: priorContent });
    } else if (typeId === 'form-urlencoded' || typeId === 'form-data') {
      const priorEntries =
        body.type === 'form-urlencoded' || body.type === 'form-data' ? body.entries : [];
      onChange({ type: typeId, entries: priorEntries });
    } else {
      onChange({ type: 'none' });
    }
  };

  const handlePrettify = () => {
    if (body.type === 'json' && body.content) {
      try {
        const parsed: unknown = JSON.parse(body.content);
        onChange({ ...body, content: JSON.stringify(parsed, null, 2) });
      } catch {
        // invalid JSON
      }
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-60">
          <SelectField
            label={t('apiWorkbench.body.type')}
            options={bodyOptions}
            value={body.type}
            onValueChange={(id: string) => handleTypeChange(id)}
          />
        </div>
        {body.type === 'json' && (
          <Action variant="secondary" onPress={handlePrettify}>
            {t('apiWorkbench.body.prettify')}
          </Action>
        )}
      </div>

      {(body.type === 'json' || body.type === 'text' || body.type === 'xml') && (
        <TextAreaField
          label={t('apiWorkbench.body.content')}
          content="code"
          rows={10}
          placeholder={body.type === 'json' ? '{\n  "key": "value"\n}' : 'Request body payload...'}
          value={body.content}
          onChange={(e) => onChange({ ...body, content: e.target.value })}
        />
      )}

      {(body.type === 'form-urlencoded' || body.type === 'form-data') && (
        <KeyValueEditor
          entries={body.entries}
          onChange={(entries) => onChange({ ...body, entries })}
        />
      )}
    </div>
  );
}
