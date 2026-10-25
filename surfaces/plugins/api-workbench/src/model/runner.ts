import type {
  ApiRequestDefinition,
  ExecutedResponse,
  HttpMethod,
  RequestTransport,
  TestResult,
} from '@community-go/surface/api-workbench';
import { buildResolvedRequest } from './build-request';
import { runExtractors } from './extractors';
import { runScriptSandbox } from '../script/sandbox';

export type RunnerItemResult = {
  requestId: string;
  requestName: string;
  method: HttpMethod;
  url: string;
  status?: number;
  durationMs: number;
  passed: boolean;
  tests: readonly TestResult[];
  error?: string;
  skipped?: boolean;
};

export type RunnerBatchResult = {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  items: readonly RunnerItemResult[];
};

export async function runCollectionBatch(
  requests: readonly ApiRequestDefinition[],
  initialEnvVars: Record<string, string>,
  initialGlobalVars: Record<string, string>,
  transport: RequestTransport,
  onStep?: (item: RunnerItemResult, index: number, total: number) => void,
): Promise<RunnerBatchResult> {
  const startTime = Date.now();
  const currentEnv = { ...initialEnvVars };
  const currentGlobals = { ...initialGlobalVars };
  const items: RunnerItemResult[] = [];

  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    if (!req) continue;

    const mergedVars = { ...currentGlobals, ...currentEnv };
    const resolved = buildResolvedRequest(req, mergedVars);

    // 1. Pre-script
    let requestToExecute = resolved;
    let isSkipped = false;
    if (req.preScript.trim()) {
      const preResult = await runScriptSandbox(req.preScript, {
        request: {
          headers: { ...resolved.headers },
          body: resolved.body,
          timeoutMs: resolved.timeoutMs,
        },
        envVariables: currentEnv,
        globalVariables: currentGlobals,
      });

      if (preResult.skipped) {
        isSkipped = true;
      }
      if (preResult.mutatedRequest) {
        requestToExecute = {
          ...resolved,
          headers: preResult.mutatedRequest.headers,
          body: preResult.mutatedRequest.body,
          timeoutMs: preResult.mutatedRequest.timeoutMs ?? resolved.timeoutMs,
        };
      }
      for (const v of preResult.setVariables) {
        if (v.scope === 'env') currentEnv[v.key] = v.value;
        else currentGlobals[v.key] = v.value;
      }
    }

    if (isSkipped) {
      const skippedItem: RunnerItemResult = {
        requestId: req.id,
        requestName: req.name,
        method: req.method,
        url: requestToExecute.url,
        durationMs: 0,
        passed: true,
        tests: [],
        skipped: true,
      };
      items.push(skippedItem);
      onStep?.(skippedItem, i + 1, requests.length);
      continue;
    }

    // 2. Transport Execute
    const execResult = await transport.execute(requestToExecute);

    if (!execResult.ok) {
      const failedItem: RunnerItemResult = {
        requestId: req.id,
        requestName: req.name,
        method: req.method,
        url: requestToExecute.url,
        durationMs: 0,
        passed: false,
        tests: [],
        error: execResult.failure.message || 'Request execution failed',
      };
      items.push(failedItem);
      failedCount++;
      onStep?.(failedItem, i + 1, requests.length);
      continue;
    }

    const response: ExecutedResponse = execResult.response;

    // 3. Post-script
    let itemTests: TestResult[] = [];
    if (req.postScript.trim()) {
      const postResult = await runScriptSandbox(req.postScript, {
        response,
        envVariables: currentEnv,
        globalVariables: currentGlobals,
      });
      itemTests = [...postResult.tests];
      for (const v of postResult.setVariables) {
        if (v.scope === 'env') currentEnv[v.key] = v.value;
        else currentGlobals[v.key] = v.value;
      }
    }

    // 4. Extractors
    if (req.extractors.length > 0) {
      const extracted = runExtractors(req.extractors, response);
      for (const item of extracted) {
        if (item.scope === 'env') currentEnv[item.key] = item.value;
        else currentGlobals[item.key] = item.value;
      }
    }

    const allPassed = response.status < 400 && itemTests.every((t) => t.passed);
    if (allPassed) {
      passedCount++;
    } else {
      failedCount++;
    }

    const stepResult: RunnerItemResult = {
      requestId: req.id,
      requestName: req.name,
      method: req.method,
      url: requestToExecute.url,
      status: response.status,
      durationMs: response.durationMs,
      passed: allPassed,
      tests: itemTests,
    };
    items.push(stepResult);
    onStep?.(stepResult, i + 1, requests.length);
  }

  return {
    total: requests.length,
    passed: passedCount,
    failed: failedCount,
    durationMs: Date.now() - startTime,
    items,
  };
}
