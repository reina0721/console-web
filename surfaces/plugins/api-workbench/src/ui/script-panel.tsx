'use client';

import { useFrontendTranslation } from '@community-go/i18n';
import { TextAreaField } from '@community-go/ui-adapter/form-field';

export type ScriptPanelProps = Readonly<{
  preScript: string;
  postScript: string;
  onPreScriptChange: (val: string) => void;
  onPostScriptChange: (val: string) => void;
}>;

export function ScriptPanel({
  preScript,
  postScript,
  onPreScriptChange,
  onPostScriptChange,
}: ScriptPanelProps) {
  const { t } = useFrontendTranslation();

  return (
    <div className="grid gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">
          {t('apiWorkbench.scripts.preTitle')}
        </label>
        <TextAreaField
          label=""
          content="code"
          rows={6}
          placeholder={`// 前置脚本示例\nconst ts = toapi.timestamp();\ntoapi.request.setHeader('X-Sign', toapi.md5('secret' + ts));`}
          value={preScript}
          onChange={(e) => onPreScriptChange(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">
          {t('apiWorkbench.scripts.postTitle')}
        </label>
        <TextAreaField
          label=""
          content="code"
          rows={6}
          placeholder={`// 后置脚本示例\ntoapi.test('状态 200', () => {\n  toapi.expect(toapi.response.status).toBe(200);\n});`}
          value={postScript}
          onChange={(e) => onPostScriptChange(e.target.value)}
        />
      </div>

      <div className="rounded-panel border border-border bg-surface-muted/60 p-3 text-xs leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">可用 API：</span>
        <code className="font-mono text-ink-muted">
          toapi.request.setHeader/setBody/skip/send · toapi.vars/env/globals ·
          toapi.fake.ua/header/proxy/timeout · toapi.test/expect ·
          toapi.md5/sha256/hmacSha256/base64Encode/uuid/timestamp/sleep
        </code>
      </div>
    </div>
  );
}
