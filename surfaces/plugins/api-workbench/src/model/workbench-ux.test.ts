import { beforeEach, describe, expect, it } from 'vitest';
import type { WorkspaceSnapshot } from '@community-go/surface/api-workbench';
import { useWorkbenchStore } from '../../stores/workbench';
import { createRequest, mergeExecutionVariables, removeWorkspaceEntity } from './workspace-actions';
import { isValidSchedule } from './schedule';
import { executeWorkbenchRequest } from './execute-request';
import { runCollectionBatch } from './runner';

const request = createRequest('request', 'collection', 'Request');
const secondRequest = createRequest('second', 'collection', 'Second request');
const snapshot: WorkspaceSnapshot = {
  version: 1,
  projects: [{ id: 'project', name: 'Project' }],
  collections: [{ id: 'collection', projectId: 'project', name: 'Collection' }],
  requests: [request, secondRequest],
  environments: [],
  globals: [],
  history: [],
  tasks: [
    {
      id: 'task',
      name: 'Task',
      targetCollectionId: 'collection',
      cronOrInterval: '5m',
      enabled: false,
    },
  ],
};

describe('Workbench draft and persistence boundaries', () => {
  beforeEach(() => useWorkbenchStore.getState().setSnapshot(snapshot, true));
  it('restores per-request drafts without modifying saved definitions', () => {
    const store = useWorkbenchStore.getState();
    store.selectRequest('request');
    store.updateDraft({ url: 'mock://draft' });
    store.selectRequest('second');
    store.selectRequest('request');
    expect(useWorkbenchStore.getState().draftRequest?.url).toBe('mock://draft');
    expect(useWorkbenchStore.getState().snapshot?.requests[0]?.url).toBe('{{baseUrl}}');
    expect(useWorkbenchStore.getState().isDraftDirty).toBe(true);
  });
  it('preparing a save does not mark it saved and reverting edits clears dirty state', () => {
    const store = useWorkbenchStore.getState();
    store.updateDraft({ url: 'mock://draft' });
    const pending = store.prepareDraftSave();
    expect(pending?.requests[0]?.url).toBe('mock://draft');
    expect(useWorkbenchStore.getState().isDraftDirty).toBe(true);
    store.updateDraft({ url: request.url });
    expect(useWorkbenchStore.getState().isDraftDirty).toBe(false);
  });
  it('an older save acknowledgement cannot erase edits made while saving', () => {
    const store = useWorkbenchStore.getState();
    store.updateDraft({ url: 'mock://first' });
    const pending = store.prepareDraftSave();
    store.updateDraft({ url: 'mock://newer' });
    if (!pending) throw new Error('Expected a save candidate');
    store.setSnapshot(pending);
    expect(useWorkbenchStore.getState().draftRequest?.url).toBe('mock://newer');
    expect(useWorkbenchStore.getState().snapshot?.requests[0]?.url).toBe('mock://first');
    expect(useWorkbenchStore.getState().isDraftDirty).toBe(true);
  });
  it('variable commits preserve drafts and late results cannot paint another request', () => {
    const store = useWorkbenchStore.getState();
    store.updateDraft({ url: 'mock://draft' });
    store.setSnapshot({
      ...snapshot,
      globals: [{ id: 'v', key: 'token', value: 'new', enabled: true }],
    });
    expect(useWorkbenchStore.getState().draftRequest?.url).toBe('mock://draft');
    store.selectRequest('second');
    store.setExecutionResult({ requestId: 'request', failure: { kind: 'timeout' } });
    expect(useWorkbenchStore.getState().lastFailure).toBeNull();
  });
});

describe('Workbench execution and configuration', () => {
  it('single and batch execution share variable propagation and HTTP / assertion semantics', async () => {
    const definition = {
      ...request,
      url: 'mock://status/404',
      postScript:
        "toapi.test('Expected 404', () => toapi.expect(toapi.response.status).toBe(404)); toapi.globals.set('status', '404');",
    };
    const transport = {
      execute: () =>
        Promise.resolve({
          ok: true as const,
          response: {
            status: 404,
            statusText: 'Not Found',
            durationMs: 1,
            sizeBytes: 2,
            headers: [],
            body: '{}',
          },
        }),
    };
    const single = await executeWorkbenchRequest(definition, {}, {}, transport);
    const batch = await runCollectionBatch([definition], {}, {}, transport);
    expect(single.kind).toBe('response');
    expect(single.script.tests[0]?.passed).toBe(true);
    expect(single.globalVars['status']).toBe('404');
    expect(batch.items[0]?.tests[0]?.passed).toBe(true);
    expect(batch.failed).toBe(1);
  });
  it('execution variable merges preserve unrelated concurrent changes', () => {
    const entries = [{ id: 'a', key: 'unchanged', value: 'edited-concurrently', enabled: true }];
    const result = mergeExecutionVariables(
      entries,
      { unchanged: 'old' },
      { unchanged: 'old', token: 'new' },
    );
    expect(result.find((item) => item.key === 'unchanged')?.value).toBe('edited-concurrently');
    expect(result.find((item) => item.key === 'token')?.value).toBe('new');
  });
  it('project deletion also removes its request and scheduled task ownership', () => {
    const result = removeWorkspaceEntity(snapshot, 'project', 'project');
    expect(result.projects).toEqual([]);
    expect(result.collections).toEqual([]);
    expect(result.requests).toEqual([]);
    expect(result.tasks).toEqual([]);
  });
  it.each(['*/5 * * * *', '0 8 * * 1-5', '0,30 9-17 * * *', '5m', '100ms'])(
    'accepts schedule %s',
    (value) => expect(isValidSchedule(value)).toBe(true),
  );
  it.each([
    '',
    '0m',
    '60 * * * *',
    '* 24 * * *',
    '* * 0 * *',
    '* * * 13 *',
    '*/0 * * * *',
    'random',
  ])('rejects schedule %s', (value) => expect(isValidSchedule(value)).toBe(false));
});
