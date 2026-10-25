import { createAppStore } from '@community-go/state-foundation';
import type {
  ApiCollection,
  ApiEnvironment,
  ApiProject,
  ApiRequestDefinition,
  ExecutedResponse,
  ExecutionFailure,
  KeyValueEntry,
  RequestHistoryItem,
  ScriptExecutionResult,
  WorkspaceSnapshot,
} from '@community-go/surface/api-workbench';
import type { RunnerBatchResult } from '../src/model/runner';

export type RightTab = 'response' | 'runner' | 'tasks';
export type RequestTab =
  'params' | 'headers' | 'auth' | 'disguise' | 'body' | 'extractors' | 'scripts';
export type ResponseSubtab = 'pretty' | 'raw' | 'headers' | 'history';

export type WorkbenchStoreState = {
  snapshot: WorkspaceSnapshot | null;
  selectedRequestId: string | null;
  activeRightTab: RightTab;
  activeRequestTab: RequestTab;
  activeResponseSubtab: ResponseSubtab;
  draftRequest: ApiRequestDefinition | null;
  isDraftDirty: boolean;
  lastResponse: ExecutedResponse | null;
  lastFailure: ExecutionFailure | null;
  lastScriptResult: ScriptExecutionResult | null;
  isExecuting: boolean;
  isEnvDrawerOpen: boolean;
  selectedCollectionIdForRunner: string | null;
  runnerState: {
    isRunning: boolean;
    currentProgress: number;
    total: number;
    result: RunnerBatchResult | null;
  };

  // Actions
  setSnapshot: (snapshot: WorkspaceSnapshot) => void;
  selectRequest: (id: string) => void;
  updateDraft: (patch: Partial<ApiRequestDefinition>) => void;
  setActiveRightTab: (tab: RightTab) => void;
  setActiveRequestTab: (tab: RequestTab) => void;
  setActiveResponseSubtab: (tab: ResponseSubtab) => void;
  setExecuting: (isExecuting: boolean) => void;
  setExecutionResult: (res: {
    response?: ExecutedResponse;
    failure?: ExecutionFailure;
    script?: ScriptExecutionResult;
  }) => void;
  setIsEnvDrawerOpen: (open: boolean) => void;
  setSelectedCollectionIdForRunner: (colId: string | null) => void;
  setRunnerState: (patch: Partial<WorkbenchStoreState['runnerState']>) => void;

  // Domain Actions (pure snapshot modifiers)
  saveCurrentDraft: () => WorkspaceSnapshot | null;
  createProject: (name: string) => WorkspaceSnapshot | null;
  createCollection: (projectId: string, name: string) => WorkspaceSnapshot | null;
  createRequest: (
    collectionId: string,
    name: string,
  ) => {
    snapshot: WorkspaceSnapshot;
    createdRequestId: string;
  } | null;
  deleteEntity: (
    kind: 'project' | 'collection' | 'request',
    id: string,
  ) => WorkspaceSnapshot | null;
  switchEnvironment: (envId: string | undefined) => WorkspaceSnapshot | null;
  updateEnvironmentVariables: (
    envId: string,
    variables: readonly KeyValueEntry[],
  ) => WorkspaceSnapshot | null;
  updateGlobals: (globals: readonly KeyValueEntry[]) => WorkspaceSnapshot | null;
  createEnvironment: (name: string) => WorkspaceSnapshot | null;
  deleteEnvironment: (envId: string) => WorkspaceSnapshot | null;
  addHistoryRecord: (item: RequestHistoryItem) => WorkspaceSnapshot | null;
  clearHistory: () => WorkspaceSnapshot | null;
};

export const useWorkbenchStore = createAppStore<WorkbenchStoreState>((set, get) => ({
  snapshot: null,
  selectedRequestId: null,
  activeRightTab: 'response',
  activeRequestTab: 'params',
  activeResponseSubtab: 'pretty',
  draftRequest: null,
  isDraftDirty: false,
  lastResponse: null,
  lastFailure: null,
  lastScriptResult: null,
  isExecuting: false,
  isEnvDrawerOpen: false,
  selectedCollectionIdForRunner: null,
  runnerState: {
    isRunning: false,
    currentProgress: 0,
    total: 0,
    result: null,
  },

  setSnapshot: (snapshot) => {
    const currentSelected = get().selectedRequestId;
    let nextSelected = currentSelected;

    // Verify selected request still exists
    if (!snapshot.requests.some((r) => r.id === currentSelected)) {
      nextSelected = snapshot.requests[0]?.id ?? null;
    }

    const draft = nextSelected
      ? (snapshot.requests.find((r) => r.id === nextSelected) ?? null)
      : null;

    set({
      snapshot,
      selectedRequestId: nextSelected,
      draftRequest: draft ? { ...draft } : null,
      isDraftDirty: false,
      selectedCollectionIdForRunner:
        get().selectedCollectionIdForRunner || (snapshot.collections[0]?.id ?? null),
    });
  },

  selectRequest: (id) => {
    const { snapshot, selectedRequestId, draftRequest, isDraftDirty } = get();
    if (id === selectedRequestId) return;

    let updatedSnapshot = snapshot;
    // Auto-save prior draft if dirty
    if (isDraftDirty && draftRequest && snapshot) {
      updatedSnapshot = {
        ...snapshot,
        requests: snapshot.requests.map((r) => (r.id === draftRequest.id ? draftRequest : r)),
      };
    }

    const nextDraft = updatedSnapshot?.requests.find((r) => r.id === id) ?? null;
    set({
      snapshot: updatedSnapshot,
      selectedRequestId: id,
      draftRequest: nextDraft ? { ...nextDraft } : null,
      isDraftDirty: false,
      lastResponse: null,
      lastFailure: null,
      lastScriptResult: null,
    });
  },

  updateDraft: (patch) => {
    const { draftRequest } = get();
    if (!draftRequest) return;
    set({
      draftRequest: { ...draftRequest, ...patch },
      isDraftDirty: true,
    });
  },

  saveCurrentDraft: () => {
    const { snapshot, draftRequest } = get();
    if (!snapshot || !draftRequest) return null;

    const updatedRequests = snapshot.requests.map((r) =>
      r.id === draftRequest.id ? draftRequest : r,
    );
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      requests: updatedRequests,
    };
    set({
      snapshot: newSnapshot,
      isDraftDirty: false,
    });
    return newSnapshot;
  },

  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
  setActiveRequestTab: (activeRequestTab) => set({ activeRequestTab }),
  setActiveResponseSubtab: (activeResponseSubtab) => set({ activeResponseSubtab }),
  setExecuting: (isExecuting) => set({ isExecuting }),
  setExecutionResult: ({ response, failure, script }) => {
    set({
      lastResponse: response ?? null,
      lastFailure: failure ?? null,
      lastScriptResult: script ?? null,
      isExecuting: false,
      activeRightTab: 'response',
      activeResponseSubtab: response ? 'pretty' : 'raw',
    });
  },
  setIsEnvDrawerOpen: (isEnvDrawerOpen) => set({ isEnvDrawerOpen }),
  setSelectedCollectionIdForRunner: (selectedCollectionIdForRunner) =>
    set({ selectedCollectionIdForRunner }),
  setRunnerState: (patch) => set((state) => ({ runnerState: { ...state.runnerState, ...patch } })),

  createProject: (name) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    const newProj: ApiProject = {
      id: `proj_${Date.now().toString(36)}`,
      name: name.trim() || '新项目',
    };
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      projects: [...snapshot.projects, newProj],
    };
    set({ snapshot: newSnapshot });
    return newSnapshot;
  },

  createCollection: (projectId, name) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    const newCol: ApiCollection = {
      id: `col_${Date.now().toString(36)}`,
      projectId,
      name: name.trim() || '新集合',
    };
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      collections: [...snapshot.collections, newCol],
    };
    set({
      snapshot: newSnapshot,
      selectedCollectionIdForRunner: get().selectedCollectionIdForRunner || newCol.id,
    });
    return newSnapshot;
  },

  createRequest: (collectionId, name) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    const newReqId = `req_${Date.now().toString(36)}`;
    const newReq: ApiRequestDefinition = {
      id: newReqId,
      collectionId,
      name: name.trim() || '新接口',
      method: 'GET',
      url: '{{baseUrl}}',
      params: [],
      headers: [],
      auth: { type: 'none' },
      body: { type: 'none' },
      disguise: { timeoutMs: 10000 },
      extractors: [],
      preScript: '',
      postScript: '',
    };

    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      requests: [...snapshot.requests, newReq],
    };

    set({
      snapshot: newSnapshot,
      selectedRequestId: newReqId,
      draftRequest: { ...newReq },
      isDraftDirty: false,
    });

    return { snapshot: newSnapshot, createdRequestId: newReqId };
  },

  deleteEntity: (kind, id) => {
    const { snapshot, selectedRequestId } = get();
    if (!snapshot) return null;

    let newProjects = snapshot.projects;
    let newCollections = snapshot.collections;
    let newRequests = snapshot.requests;

    if (kind === 'project') {
      const removedColIds = new Set(
        snapshot.collections.filter((c) => c.projectId === id).map((c) => c.id),
      );
      newProjects = snapshot.projects.filter((p) => p.id !== id);
      newCollections = snapshot.collections.filter((c) => c.projectId !== id);
      newRequests = snapshot.requests.filter((r) => !removedColIds.has(r.collectionId));
    } else if (kind === 'collection') {
      newCollections = snapshot.collections.filter((c) => c.id !== id);
      newRequests = snapshot.requests.filter((r) => r.collectionId !== id);
    } else if (kind === 'request') {
      newRequests = snapshot.requests.filter((r) => r.id !== id);
    }

    let nextSelected = selectedRequestId;
    if (selectedRequestId === id || !newRequests.some((r) => r.id === selectedRequestId)) {
      nextSelected = newRequests[0]?.id ?? null;
    }

    const nextDraft = nextSelected
      ? (newRequests.find((r) => r.id === nextSelected) ?? null)
      : null;

    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      projects: newProjects,
      collections: newCollections,
      requests: newRequests,
    };

    set({
      snapshot: newSnapshot,
      selectedRequestId: nextSelected,
      draftRequest: nextDraft ? { ...nextDraft } : null,
      isDraftDirty: false,
    });

    return newSnapshot;
  },

  switchEnvironment: (envId) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      activeEnvironmentId: envId,
    };
    set({ snapshot: newSnapshot });
    return newSnapshot;
  },

  updateEnvironmentVariables: (envId, variables) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      environments: snapshot.environments.map((e) => (e.id === envId ? { ...e, variables } : e)),
    };
    set({ snapshot: newSnapshot });
    return newSnapshot;
  },

  updateGlobals: (globals) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      globals,
    };
    set({ snapshot: newSnapshot });
    return newSnapshot;
  },

  createEnvironment: (name) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    const newEnv: ApiEnvironment = {
      id: `env_${Date.now().toString(36)}`,
      name: name.trim() || '新环境',
      variables: [],
    };
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      environments: [...snapshot.environments, newEnv],
      activeEnvironmentId: snapshot.activeEnvironmentId || newEnv.id,
    };
    set({ snapshot: newSnapshot });
    return newSnapshot;
  },

  deleteEnvironment: (envId) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    const newEnvs = snapshot.environments.filter((e) => e.id !== envId);
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      environments: newEnvs,
      activeEnvironmentId:
        snapshot.activeEnvironmentId === envId
          ? (newEnvs[0]?.id ?? undefined)
          : snapshot.activeEnvironmentId,
    };
    set({ snapshot: newSnapshot });
    return newSnapshot;
  },

  addHistoryRecord: (item) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    // Keep last 50 items
    const newHistory = [item, ...snapshot.history].slice(0, 50);
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      history: newHistory,
    };
    set({ snapshot: newSnapshot });
    return newSnapshot;
  },

  clearHistory: () => {
    const { snapshot } = get();
    if (!snapshot) return null;
    const newSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      history: [],
    };
    set({ snapshot: newSnapshot });
    return newSnapshot;
  },
}));
