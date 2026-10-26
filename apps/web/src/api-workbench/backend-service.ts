/**
 * Backend Service Adapter for API Workbench.
 *
 * Communicates with backend endpoints:
 * - GET  /api-workbench/workspace
 * - PUT  /api-workbench/workspace
 * - POST /api-workbench/execute (Relay, bypasses CORS, executes disguise)
 * - GET  /api-workbench/tasks
 * - POST /api-workbench/tasks
 * - DELETE /api-workbench/tasks/:id
 */

import { browserWorkspaceTransfer } from './transfer';

import type {
  ApiWorkbenchPort,
  ExecutionResult,
  ResolvedRequest,
  TaskDefinition,
  WorkspaceSnapshot,
} from '@community-go/surface/api-workbench';

export function createBackendApiWorkbenchService(apiBaseUrl: string): ApiWorkbenchPort {
  const base = apiBaseUrl.replace(/\/$/, '');

  const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`Backend API error: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  };

  return {
    transfer: browserWorkspaceTransfer,
    capabilities: {
      mode: 'backend',
      disguise: true,
      corsFree: true,
      persistentTasks: true,
    },

    workspace: {
      load: () => request<WorkspaceSnapshot>('/api-workbench/workspace'),
      save: (snapshot: WorkspaceSnapshot) =>
        request<void>('/api-workbench/workspace', {
          method: 'PUT',
          body: JSON.stringify(snapshot),
        }),
      clearHistory: () =>
        request<void>('/api-workbench/workspace/history', {
          method: 'DELETE',
        }),
      getUsage: () =>
        request<{ dbSizeFormatted: string; count: number }>('/api-workbench/workspace/usage'),
    },

    transport: {
      execute: async (req: ResolvedRequest, signal?: AbortSignal): Promise<ExecutionResult> => {
        try {
          return await request<ExecutionResult>('/api-workbench/execute', {
            method: 'POST',
            body: JSON.stringify(req),
            ...(signal ? { signal } : {}),
          });
        } catch (error) {
          return {
            ok: false,
            failure: {
              kind: 'network',
              message: error instanceof Error ? error.message : 'Backend relay execution failed',
            },
          };
        }
      },
    },

    tasks: {
      list: () => request<readonly TaskDefinition[]>('/api-workbench/tasks'),
      upsert: (task: TaskDefinition) =>
        request<void>('/api-workbench/tasks', {
          method: 'POST',
          body: JSON.stringify(task),
        }),
      remove: (id: string) =>
        request<void>(`/api-workbench/tasks/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
    },
  };
}
