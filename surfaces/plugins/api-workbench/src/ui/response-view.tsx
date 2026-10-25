'use client';

import { useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import type {
  ExecutedResponse,
  ExecutionFailure,
  RequestHistoryItem,
  ScriptExecutionResult,
} from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { IconAction } from '@community-go/ui-adapter/icon-action';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { TabsView, type TabsViewItem } from '@community-go/ui-adapter/data-display';
import { AlertBanner } from '@community-go/ui-adapter/feedback';
import { CheckCheck, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { useWorkbenchStore, type ResponseSubtab } from '../../stores/workbench';

export type ResponseViewProps = Readonly<{
  response: ExecutedResponse | null;
  failure: ExecutionFailure | null;
  scriptResult: ScriptExecutionResult | null;
  history: readonly RequestHistoryItem[];
  onClearHistory: () => void;
  onSelectHistoryUrl?: (method: string, url: string) => void;
}>;

export function ResponseView({
  response,
  failure,
  scriptResult,
  history,
  onClearHistory,
  onSelectHistoryUrl,
}: ResponseViewProps) {
  const { t } = useFrontendTranslation();
  const [copied, setCopied] = useState(false);
  const activeSubtab = useWorkbenchStore((s) => s.activeResponseSubtab);
  const setActiveSubtab = useWorkbenchStore((s) => s.setActiveResponseSubtab);

  const handleCopy = async () => {
    if (!response?.body) return;
    try {
      await navigator.clipboard.writeText(response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getStatusTone = (status: number) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'info';
    if (status >= 400 && status < 500) return 'warning';
    return 'danger';
  };

  let prettyBody = '';
  if (response?.body) {
    try {
      prettyBody = JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      prettyBody = response.body;
    }
  }

  const subtabItems: readonly TabsViewItem[] = [
    {
      id: 'pretty',
      label: t('apiWorkbench.response.pretty'),
      content: (
        <div className="relative mt-2">
          {response && (
            <div className="absolute right-2 top-2 z-10">
              <IconAction
                label={copied ? t('apiWorkbench.response.copied') : t('apiWorkbench.response.copy')}
                onPress={() => void handleCopy()}
                size="sm"
              >
                {copied ? (
                  <CheckCheck className="size-4 text-success" />
                ) : (
                  <Copy className="size-4 text-ink-muted" />
                )}
              </IconAction>
            </div>
          )}
          <pre className="max-h-80 overflow-auto rounded-panel border border-border bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink">
            {prettyBody || '// Empty response body'}
          </pre>
        </div>
      ),
    },
    {
      id: 'raw',
      label: t('apiWorkbench.response.raw'),
      content: (
        <div className="mt-2">
          <pre className="max-h-80 overflow-auto rounded-panel border border-border bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink">
            {response?.body || '// Empty response body'}
          </pre>
        </div>
      ),
    },
    {
      id: 'headers',
      label: t('apiWorkbench.response.headers'),
      content: (
        <div className="mt-2 max-h-80 overflow-auto rounded-panel border border-border">
          {response?.headers && response.headers.length > 0 ? (
            <div className="divide-y divide-border text-xs">
              {response.headers.map(([key, val], idx) => (
                <div key={idx} className="flex gap-4 p-2.5 hover:bg-surface-muted">
                  <span className="w-40 shrink-0 font-mono font-medium text-ink-muted">{key}</span>
                  <span className="min-w-0 flex-1 break-all font-mono text-ink">{val}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-center text-xs text-ink-muted">暂无响应头信息</p>
          )}
        </div>
      ),
    },
    {
      id: 'history',
      label: t('apiWorkbench.response.history'),
      content: (
        <div className="mt-2 grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">最近 50 条请求记录</span>
            {history.length > 0 && (
              <Action variant="secondary" size="sm" onPress={onClearHistory}>
                <Trash2 className="mr-1 size-3 text-danger" />
                {t('apiWorkbench.response.clearHistory')}
              </Action>
            )}
          </div>
          {history.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-muted">
              {t('apiWorkbench.response.noHistory')}
            </p>
          ) : (
            <div className="max-h-80 divide-y divide-border overflow-auto rounded-panel border border-border">
              {history.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onSelectHistoryUrl?.(item.method, item.url)}
                  className="flex w-full items-center justify-between gap-3 p-2.5 text-left text-xs transition-colors hover:bg-surface-muted/60"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <StatusPill tone={getStatusTone(item.status)}>{item.status}</StatusPill>
                    <span className="font-mono font-bold text-ink">{item.method}</span>
                    <span className="truncate font-mono text-ink-muted">{item.url}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-ink-muted">
                    <span>{item.durationMs}ms</span>
                    <span>{formatBytes(item.sizeBytes)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-3">
      {/* Response Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        {response ? (
          <div className="flex items-center gap-2">
            <StatusPill tone={getStatusTone(response.status)}>
              {response.status} {response.statusText}
            </StatusPill>
            <span className="text-xs text-ink-muted">{response.durationMs}ms</span>
            <span className="text-xs text-ink-muted">{formatBytes(response.sizeBytes)}</span>
          </div>
        ) : failure ? (
          <div className="flex items-center gap-2">
            <StatusPill tone="danger">{t('apiWorkbench.response.failed')}</StatusPill>
            <span className="text-xs text-danger font-medium">{failure.kind.toUpperCase()}</span>
          </div>
        ) : (
          <span className="text-xs text-ink-muted">{t('apiWorkbench.response.noResponse')}</span>
        )}

        {/* Assertion test badges if executed */}
        {scriptResult?.tests && scriptResult.tests.length > 0 && (
          <div className="flex items-center gap-1.5">
            {scriptResult.tests.filter((t) => t.passed).length > 0 && (
              <StatusPill tone="success">
                {scriptResult.tests.filter((t) => t.passed).length}{' '}
                {t('apiWorkbench.response.testsPassed')}
              </StatusPill>
            )}
            {scriptResult.tests.filter((t) => !t.passed).length > 0 && (
              <StatusPill tone="danger">
                {scriptResult.tests.filter((t) => !t.passed).length}{' '}
                {t('apiWorkbench.response.testsFailed')}
              </StatusPill>
            )}
          </div>
        )}
      </div>

      {/* Failure Banner */}
      {failure && (
        <AlertBanner
          tone="danger"
          icon={<RefreshCw className="size-5 shrink-0 text-danger" />}
          title={failure.message ?? t('apiWorkbench.response.failed')}
          description={
            failure.details ??
            (failure.kind === 'cors'
              ? t('apiWorkbench.response.corsNotice')
              : '网络请求未能建立，请检查 URL 是否正确。')
          }
        />
      )}

      {/* Assertion details list */}
      {scriptResult?.tests && scriptResult.tests.length > 0 && (
        <div className="grid gap-1.5 rounded-panel border border-border bg-surface-muted p-2 text-xs">
          {scriptResult.tests.map((test, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className={test.passed ? 'text-success' : 'text-danger font-bold'}>
                {test.passed ? '✓' : '✗'}
              </span>
              <span className="text-ink">{test.title}</span>
              {test.error && <span className="text-danger truncate">({test.error})</span>}
            </div>
          ))}
        </div>
      )}

      {/* Response Subtabs */}
      <TabsView
        label={t('apiWorkbench.views.response')}
        items={subtabItems}
        selectedId={activeSubtab}
        onSelectionChange={(id: string) => setActiveSubtab(id as ResponseSubtab)}
      />
    </div>
  );
}
