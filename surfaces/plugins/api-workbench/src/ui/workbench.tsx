'use client';

import { useEffect, useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import {
  safeParseWorkspaceSnapshot,
  useApiWorkbenchPort,
  type KeyValueEntry,
  type RequestHistoryItem,
  type TaskDefinition,
  type TestResult,
} from '@community-go/surface/api-workbench';
import { Panel } from '@community-go/ui-adapter/panel';
import { TabsView, type TabsViewItem } from '@community-go/ui-adapter/data-display';
import { Skeleton } from '@community-go/ui-adapter/skeleton';
import { buildResolvedRequest } from '../model/build-request';
import { resolveVariableMap } from '../model/interpolate';
import { runExtractors } from '../model/extractors';
import { runScriptSandbox } from '../script/sandbox';
import { useWorkbenchStore, type RightTab } from '../../stores/workbench';
import { EnvironmentDrawer } from './environment-drawer';
import { ProjectTree } from './project-tree';
import { RequestBar } from './request-bar';
import { RequestTabs } from './request-tabs';
import { ResponseView } from './response-view';
import { RunnerView } from './runner-view';
import { StatusBar } from './status-bar';
import { TasksView } from './tasks-view';

function createRandomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

function createIsoTimestamp(): string {
  return new Date().toISOString();
}

export function Workbench() {
  const { t } = useFrontendTranslation();
  const port = useApiWorkbenchPort();

  const [dbUsage, setDbUsage] = useState('DB 168.0 KB');
  const [isLoading, setIsLoading] = useState(true);

  // Store bindings
  const snapshot = useWorkbenchStore((s) => s.snapshot);
  const setSnapshot = useWorkbenchStore((s) => s.setSnapshot);
  const draftRequest = useWorkbenchStore((s) => s.draftRequest);
  const isDraftDirty = useWorkbenchStore((s) => s.isDraftDirty);
  const selectedRequestId = useWorkbenchStore((s) => s.selectedRequestId);
  const selectRequest = useWorkbenchStore((s) => s.selectRequest);
  const updateDraft = useWorkbenchStore((s) => s.updateDraft);
  const saveCurrentDraft = useWorkbenchStore((s) => s.saveCurrentDraft);

  const activeRightTab = useWorkbenchStore((s) => s.activeRightTab);
  const setActiveRightTab = useWorkbenchStore((s) => s.setActiveRightTab);

  const lastResponse = useWorkbenchStore((s) => s.lastResponse);
  const lastFailure = useWorkbenchStore((s) => s.lastFailure);
  const lastScriptResult = useWorkbenchStore((s) => s.lastScriptResult);
  const isExecuting = useWorkbenchStore((s) => s.isExecuting);
  const setExecuting = useWorkbenchStore((s) => s.setExecuting);
  const setExecutionResult = useWorkbenchStore((s) => s.setExecutionResult);

  const isEnvDrawerOpen = useWorkbenchStore((s) => s.isEnvDrawerOpen);
  const setIsEnvDrawerOpen = useWorkbenchStore((s) => s.setIsEnvDrawerOpen);

  const createProject = useWorkbenchStore((s) => s.createProject);
  const createCollection = useWorkbenchStore((s) => s.createCollection);
  const createRequest = useWorkbenchStore((s) => s.createRequest);
  const deleteEntity = useWorkbenchStore((s) => s.deleteEntity);
  const switchEnvironment = useWorkbenchStore((s) => s.switchEnvironment);
  const updateEnvironmentVariables = useWorkbenchStore((s) => s.updateEnvironmentVariables);
  const updateGlobals = useWorkbenchStore((s) => s.updateGlobals);
  const addHistoryRecord = useWorkbenchStore((s) => s.addHistoryRecord);
  const clearHistory = useWorkbenchStore((s) => s.clearHistory);

  // 1. Initial Load from Port
  useEffect(() => {
    let active = true;
    port.workspace
      .load()
      .then((snap) => {
        if (!active) return;
        setSnapshot(snap);
        setIsLoading(false);
        void port.workspace.getUsage().then((u) => setDbUsage(`DB ${u.dbSizeFormatted}`));
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [port, setSnapshot]);

  // Active Environment & Globals map
  const activeEnv = snapshot?.environments.find((e) => e.id === snapshot.activeEnvironmentId);
  const envVars: readonly KeyValueEntry[] = activeEnv?.variables ?? [];
  const globalVars: readonly KeyValueEntry[] = snapshot?.globals ?? [];
  const varMap = resolveVariableMap(envVars, globalVars);
  const baseUrlHint = varMap['baseUrl'] ?? 'mock://';

  // Persist helper
  const persist = async (newSnapshot: typeof snapshot) => {
    if (!newSnapshot) return;
    try {
      await port.workspace.save(newSnapshot);
      const usage = await port.workspace.getUsage();
      setDbUsage(`DB ${usage.dbSizeFormatted}`);
    } catch {
      // storage write fail handled gracefully
    }
  };

  const handleSave = async () => {
    const updated = saveCurrentDraft();
    if (updated) {
      await persist(updated);
    }
  };

  // Execute Request Pipeline
  const handleSend = async () => {
    if (!draftRequest || isExecuting) return;

    setExecuting(true);
    const resolved = buildResolvedRequest(draftRequest, varMap);

    // Step A: Pre-request Script
    let requestToExecute = resolved;
    let isSkipped = false;
    let preLogs: readonly string[] = [];
    if (draftRequest.preScript.trim()) {
      const preResult = await runScriptSandbox(draftRequest.preScript, {
        request: {
          headers: { ...resolved.headers },
          body: resolved.body,
          timeoutMs: resolved.timeoutMs,
        },
        envVariables: Object.fromEntries(envVars.map((v: KeyValueEntry) => [v.key, v.value])),
        globalVariables: Object.fromEntries(globalVars.map((v: KeyValueEntry) => [v.key, v.value])),
      });
      preLogs = preResult.logs;
      if (preResult.skipped) isSkipped = true;
      if (preResult.mutatedRequest) {
        requestToExecute = {
          ...resolved,
          headers: preResult.mutatedRequest.headers,
          body: preResult.mutatedRequest.body,
          timeoutMs: preResult.mutatedRequest.timeoutMs ?? resolved.timeoutMs,
        };
      }
      // Apply variable updates
      if (preResult.setVariables.length > 0 && activeEnv) {
        const updatedEnvVars = [...activeEnv.variables];
        for (const setVar of preResult.setVariables) {
          if (setVar.scope === 'env') {
            const idx = updatedEnvVars.findIndex((v) => v.key === setVar.key);
            if (idx >= 0) {
              const cur = updatedEnvVars[idx];
              if (cur) updatedEnvVars[idx] = { ...cur, value: setVar.value };
            } else {
              updatedEnvVars.push({
                id: createRandomId('v'),
                key: setVar.key,
                value: setVar.value,
                enabled: true,
              });
            }
          }
        }
        const updatedSnap = updateEnvironmentVariables(activeEnv.id, updatedEnvVars);
        void persist(updatedSnap);
      }
    }

    if (isSkipped) {
      setExecuting(false);
      return;
    }

    // Step B: Transport Execute
    const execResult = await port.transport.execute(requestToExecute);

    if (!execResult.ok) {
      setExecutionResult({ failure: execResult.failure });
      return;
    }

    const response = execResult.response;

    // Step C: Post-response Script (Assertions & Extractors)
    let postScriptResult: { tests: readonly TestResult[]; logs: readonly string[] } = {
      tests: [],
      logs: [],
    };

    if (draftRequest.postScript.trim()) {
      const postResult = await runScriptSandbox(draftRequest.postScript, {
        response,
        envVariables: Object.fromEntries(envVars.map((v: KeyValueEntry) => [v.key, v.value])),
        globalVariables: Object.fromEntries(globalVars.map((v: KeyValueEntry) => [v.key, v.value])),
      });
      postScriptResult = {
        tests: postResult.tests,
        logs: [...preLogs, ...postResult.logs],
      };
      if (postResult.setVariables.length > 0 && activeEnv) {
        const updatedEnvVars = [...activeEnv.variables];
        for (const setVar of postResult.setVariables) {
          if (setVar.scope === 'env') {
            const idx = updatedEnvVars.findIndex((v) => v.key === setVar.key);
            if (idx >= 0) {
              const cur = updatedEnvVars[idx];
              if (cur) updatedEnvVars[idx] = { ...cur, value: setVar.value };
            } else {
              updatedEnvVars.push({
                id: createRandomId('v'),
                key: setVar.key,
                value: setVar.value,
                enabled: true,
              });
            }
          }
        }
        const updatedSnap = updateEnvironmentVariables(activeEnv.id, updatedEnvVars);
        void persist(updatedSnap);
      }
    }

    // Step D: Extractors
    if (draftRequest.extractors.length > 0 && activeEnv) {
      const extracted = runExtractors(draftRequest.extractors, response);
      if (extracted.length > 0) {
        const updatedEnvVars = [...activeEnv.variables];
        for (const item of extracted) {
          if (item.scope === 'env') {
            const idx = updatedEnvVars.findIndex((v) => v.key === item.key);
            if (idx >= 0) {
              const cur = updatedEnvVars[idx];
              if (cur) updatedEnvVars[idx] = { ...cur, value: item.value };
            } else {
              updatedEnvVars.push({
                id: createRandomId('v'),
                key: item.key,
                value: item.value,
                enabled: true,
              });
            }
          }
        }
        const updatedSnap = updateEnvironmentVariables(activeEnv.id, updatedEnvVars);
        void persist(updatedSnap);
      }
    }

    // Step E: Record History
    const historyItem: RequestHistoryItem = {
      id: createRandomId('hist'),
      requestId: draftRequest.id,
      timestamp: createIsoTimestamp(),
      method: draftRequest.method,
      url: requestToExecute.url,
      status: response.status,
      durationMs: response.durationMs,
      sizeBytes: response.sizeBytes,
    };
    const updatedSnapWithHistory = addHistoryRecord(historyItem);
    void persist(updatedSnapWithHistory);

    setExecutionResult({
      response,
      script: {
        tests: postScriptResult.tests,
        logs: postScriptResult.logs,
        setVariables: [],
      },
    });
  };

  // Export / Import Workspace
  const handleExport = () => {
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toapi-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed: unknown = JSON.parse(text);
        const validation = safeParseWorkspaceSnapshot(parsed);
        if (validation.success) {
          setSnapshot(validation.data);
          await persist(validation.data);
        }
      } catch {
        // JSON syntax error
      }
    };
    input.click();
  };

  // Right Tabs
  const rightTabItems: readonly TabsViewItem[] = [
    {
      id: 'response',
      label: t('apiWorkbench.views.response'),
      content: (
        <ResponseView
          response={lastResponse}
          failure={lastFailure}
          scriptResult={lastScriptResult}
          history={snapshot?.history ?? []}
          onClearHistory={() => {
            const updated = clearHistory();
            void persist(updated);
          }}
          onSelectHistoryUrl={(method, url) => {
            if (draftRequest) {
              updateDraft({
                method: method as typeof draftRequest.method,
                url,
              });
            }
          }}
        />
      ),
    },
    {
      id: 'runner',
      label: t('apiWorkbench.views.runner'),
      content: (
        <RunnerView
          collections={snapshot?.collections ?? []}
          requests={snapshot?.requests ?? []}
          transport={port.transport}
          envVars={Object.fromEntries(envVars.map((v: KeyValueEntry) => [v.key, v.value]))}
          globalVars={Object.fromEntries(globalVars.map((v: KeyValueEntry) => [v.key, v.value]))}
        />
      ),
    },
    {
      id: 'tasks',
      label: t('apiWorkbench.views.tasks'),
      content: (
        <TasksView
          collections={snapshot?.collections ?? []}
          tasks={snapshot?.tasks ?? []}
          onTasksChange={(tasks: readonly TaskDefinition[]) => {
            if (!snapshot) return;
            const updated = { ...snapshot, tasks };
            setSnapshot(updated);
            void persist(updated);
          }}
        />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-128 flex-col gap-4 p-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-1 gap-4">
          <Skeleton className="h-full w-64" />
          <Skeleton className="h-full flex-1" />
          <Skeleton className="h-full flex-1" />
        </div>
      </div>
    );
  }

  return (
    <Panel
      aria-label="API 接口调试工作台"
      className="flex flex-col overflow-hidden border border-border bg-surface p-0"
    >
      {/* Main Responsive Layout */}
      <div className="flex min-h-96 flex-1 flex-col divide-y divide-border lg:flex-row lg:divide-x lg:divide-y-0">
        {/* Left Column: Project Tree */}
        <div className="w-full shrink-0 p-3 lg:w-72">
          <ProjectTree
            projects={snapshot?.projects ?? []}
            collections={snapshot?.collections ?? []}
            requests={snapshot?.requests ?? []}
            selectedRequestId={selectedRequestId}
            onSelectRequest={selectRequest}
            onCreateProject={(name) => {
              const updated = createProject(name);
              void persist(updated);
            }}
            onCreateCollection={(pId, name) => {
              const updated = createCollection(pId, name);
              void persist(updated);
            }}
            onCreateRequest={(cId, name) => {
              const res = createRequest(cId, name);
              if (res) void persist(res.snapshot);
            }}
            onDelete={(kind, id) => {
              const updated = deleteEntity(kind, id);
              void persist(updated);
            }}
          />
        </div>

        {/* Middle Column: Request Bar & Tabs */}
        <div className="min-w-0 flex-1 p-4">
          {draftRequest ? (
            <div className="grid gap-4">
              <RequestBar
                request={draftRequest}
                isExecuting={isExecuting}
                isDirty={isDraftDirty}
                onChange={updateDraft}
                onSend={() => void handleSend()}
                onSave={() => void handleSave()}
              />
              <RequestTabs request={draftRequest} onChange={updateDraft} />
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-ink-muted">
              请从左侧选择一个接口，或点击「+ 接口」开始调试
            </div>
          )}
        </div>

        {/* Right Column: Response / Runner / Tasks */}
        <div className="w-full shrink-0 p-4 lg:w-96">
          <TabsView
            label="右栏视图"
            items={rightTabItems}
            selectedId={activeRightTab}
            onSelectionChange={(id: string) => setActiveRightTab(id as RightTab)}
          />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        environments={snapshot?.environments ?? []}
        activeEnvironmentId={snapshot?.activeEnvironmentId}
        baseUrlHint={baseUrlHint}
        dbUsageText={dbUsage}
        onSelectEnvironment={(envId) => {
          const updated = switchEnvironment(envId);
          void persist(updated);
        }}
        onOpenManageEnvs={() => setIsEnvDrawerOpen(true)}
        onExport={handleExport}
        onImport={handleImportClick}
      />

      {/* Environment Drawer */}
      <EnvironmentDrawer
        isOpen={isEnvDrawerOpen}
        onOpenChange={setIsEnvDrawerOpen}
        environments={snapshot?.environments ?? []}
        globals={snapshot?.globals ?? []}
        onEnvironmentsChange={(envs) => {
          if (!snapshot) return;
          const updated = { ...snapshot, environments: envs };
          setSnapshot(updated);
          void persist(updated);
        }}
        onGlobalsChange={(globals) => {
          const updated = updateGlobals(globals);
          void persist(updated);
        }}
      />
    </Panel>
  );
}
