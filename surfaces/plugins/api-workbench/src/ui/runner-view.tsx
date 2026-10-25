'use client';

import { useFrontendTranslation } from '@community-go/i18n';
import type {
  ApiCollection,
  ApiRequestDefinition,
  RequestTransport,
} from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { ProgressMeter } from '@community-go/ui-adapter/progress-meter';
import { SelectField, type SelectOption } from '@community-go/ui-adapter/form-field';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { Play } from 'lucide-react';
import { runCollectionBatch } from '../model/runner';
import { useWorkbenchStore } from '../../stores/workbench';

export type RunnerViewProps = Readonly<{
  collections: readonly ApiCollection[];
  requests: readonly ApiRequestDefinition[];
  transport: RequestTransport;
  envVars: Record<string, string>;
  globalVars: Record<string, string>;
}>;

export function RunnerView({
  collections,
  requests,
  transport,
  envVars,
  globalVars,
}: RunnerViewProps) {
  const { t } = useFrontendTranslation();
  const selectedColId = useWorkbenchStore((s) => s.selectedCollectionIdForRunner);
  const setSelectedColId = useWorkbenchStore((s) => s.setSelectedCollectionIdForRunner);
  const runnerState = useWorkbenchStore((s) => s.runnerState);
  const setRunnerState = useWorkbenchStore((s) => s.setRunnerState);

  const collectionOptions: readonly SelectOption[] = collections.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const targetRequests = requests.filter((r) => r.collectionId === selectedColId);

  const handleRun = async () => {
    if (targetRequests.length === 0) return;

    setRunnerState({
      isRunning: true,
      currentProgress: 0,
      total: targetRequests.length,
      result: null,
    });

    const result = await runCollectionBatch(
      targetRequests,
      envVars,
      globalVars,
      transport,
      (_step, index, total) => {
        setRunnerState({
          currentProgress: index,
          total,
        });
      },
    );

    setRunnerState({
      isRunning: false,
      result,
    });
  };

  const percent =
    runnerState.total > 0 ? Math.round((runnerState.currentProgress / runnerState.total) * 100) : 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-60">
          <SelectField
            label={t('apiWorkbench.runner.selectCollection')}
            options={collectionOptions}
            value={selectedColId ?? null}
            onValueChange={(id: string) => setSelectedColId(id)}
          />
        </div>
        <Action
          variant="primary"
          onPress={() => void handleRun()}
          disabled={runnerState.isRunning || targetRequests.length === 0}
        >
          <Play className="mr-1.5 size-4" />
          {runnerState.isRunning
            ? t('apiWorkbench.runner.running')
            : `${t('apiWorkbench.runner.run')} (${targetRequests.length})`}
        </Action>
      </div>

      {runnerState.isRunning && (
        <ProgressMeter
          label={`${runnerState.currentProgress} / ${runnerState.total} 请求完成`}
          value={percent}
        />
      )}

      {runnerState.result && (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-panel border border-border bg-surface-muted/60 p-3 text-xs">
            <span className="font-semibold text-ink">{t('apiWorkbench.runner.summary')}</span>
            <div className="flex items-center gap-3">
              <span>
                {t('apiWorkbench.runner.total')}: <b>{runnerState.result.total}</b>
              </span>
              <span className="text-success font-medium">
                {t('apiWorkbench.runner.passed')}: <b>{runnerState.result.passed}</b>
              </span>
              <span className="text-danger font-medium">
                {t('apiWorkbench.runner.failed')}: <b>{runnerState.result.failed}</b>
              </span>
              <span className="text-ink-muted">耗时: {runnerState.result.durationMs}ms</span>
            </div>
          </div>

          <div className="divide-y divide-border rounded-panel border border-border overflow-hidden">
            {runnerState.result.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-surface-muted/40"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <StatusPill tone={item.passed ? 'success' : 'danger'}>
                    {item.passed ? 'PASS' : 'FAIL'}
                  </StatusPill>
                  <span className="font-mono font-bold text-ink">{item.method}</span>
                  <span className="font-medium text-ink truncate">{item.requestName}</span>
                  <span className="font-mono text-ink-muted truncate">{item.url}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {item.status && <span className="font-mono text-ink">{item.status}</span>}
                  <span className="text-ink-muted">{item.durationMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!runnerState.result && !runnerState.isRunning && (
        <p className="py-8 text-center text-xs text-ink-muted">
          {targetRequests.length === 0
            ? t('apiWorkbench.runner.empty')
            : '点击「运行集合测试」开始按序执行集合中的所有接口与断言。'}
        </p>
      )}
    </div>
  );
}
