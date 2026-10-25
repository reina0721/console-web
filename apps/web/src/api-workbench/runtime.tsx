'use client';

import { useState, type ReactNode } from 'react';
import {
  ApiWorkbenchProvider,
  type ApiWorkbenchPort,
  type ResolvedRequest,
  type TaskDefinition,
  type WorkspaceSnapshot,
} from '@community-go/surface/api-workbench';

export function ApiWorkbenchRuntime({ children }: Readonly<{ children: ReactNode }>) {
  const [port] = useState<ApiWorkbenchPort>(() => {
    let servicePromise: Promise<ApiWorkbenchPort> | null = null;
    const getService = () => {
      if (!servicePromise) {
        servicePromise = (async () => {
          try {
            const { readAuthConfig } = await import('../auth/config');
            const config = readAuthConfig();
            if (config.mode === 'backend' && config.apiBaseUrl) {
              const { createBackendApiWorkbenchService } = await import('./backend-service');
              return createBackendApiWorkbenchService(config.apiBaseUrl);
            }
          } catch {
            // Fallback to mock
          }
          const { createMockApiWorkbenchService } = await import('./mock-service');
          return createMockApiWorkbenchService();
        })();
      }
      return servicePromise;
    };

    return {
      capabilities: {
        mode: 'mock',
        disguise: false,
        corsFree: false,
        persistentTasks: false,
      },
      workspace: {
        load: async (): Promise<WorkspaceSnapshot> => (await getService()).workspace.load(),
        save: async (snap: WorkspaceSnapshot): Promise<void> =>
          (await getService()).workspace.save(snap),
        clearHistory: async (): Promise<void> => (await getService()).workspace.clearHistory(),
        getUsage: async () => (await getService()).workspace.getUsage(),
      },
      transport: {
        execute: async (req: ResolvedRequest, signal?: AbortSignal) =>
          (await getService()).transport.execute(req, signal),
      },
      tasks: {
        list: async (): Promise<readonly TaskDefinition[]> => (await getService()).tasks.list(),
        upsert: async (task: TaskDefinition): Promise<void> =>
          (await getService()).tasks.upsert(task),
        remove: async (id: string): Promise<void> => (await getService()).tasks.remove(id),
      },
    };
  });

  return <ApiWorkbenchProvider port={port}>{children}</ApiWorkbenchProvider>;
}
