import type { ApiWorkbenchPort } from '@community-go/surface/api-workbench';
import { readAuthConfig } from '../auth/config';

/** Resolve the runtime implementation only when the workbench is used. */
export async function resolveService(): Promise<ApiWorkbenchPort> {
  const config = readAuthConfig();
  if (config.mode === 'backend' && config.apiBaseUrl) {
    const { createBackendApiWorkbenchService } = await import('./backend-service');
    return createBackendApiWorkbenchService(config.apiBaseUrl);
  }
  const { createMockApiWorkbenchService } = await import('./mock-service');
  return createMockApiWorkbenchService();
}
