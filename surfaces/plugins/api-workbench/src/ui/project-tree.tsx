'use client';

import { useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import type {
  ApiCollection,
  ApiProject,
  ApiRequestDefinition,
} from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { DestructiveConfirmDialog } from '@community-go/ui-adapter/overlays';
import { IconAction } from '@community-go/ui-adapter/icon-action';
import { SearchBox } from '@community-go/ui-adapter/search-box';
import { TextField } from '@community-go/ui-adapter/form-field';
import { Folder, FolderPlus, Plus, Trash2 } from 'lucide-react';

export type ProjectTreeProps = Readonly<{
  projects: readonly ApiProject[];
  collections: readonly ApiCollection[];
  requests: readonly ApiRequestDefinition[];
  selectedRequestId: string | null;
  onSelectRequest: (id: string) => void;
  onCreateProject: (name: string) => void;
  onCreateCollection: (projectId: string, name: string) => void;
  onCreateRequest: (collectionId: string, name: string) => void;
  onDelete: (kind: 'project' | 'collection' | 'request', id: string) => void;
}>;

export function ProjectTree({
  projects,
  collections,
  requests,
  selectedRequestId,
  onSelectRequest,
  onCreateProject,
  onCreateCollection,
  onCreateRequest,
  onDelete,
}: ProjectTreeProps) {
  const { t } = useFrontendTranslation();
  const [filterQuery, setFilterQuery] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'project' | 'collection' | 'request';
    id: string;
    title: string;
  } | null>(null);

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim());
    setNewProjectName('');
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.url.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  return (
    <aside aria-label="项目与接口导航" className="flex h-full w-full flex-col gap-3">
      {/* Top: New Project Input */}
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <TextField
            label={t('apiWorkbench.sidebar.newProject')}
            placeholder={t('apiWorkbench.sidebar.newProject')}
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
        </div>
        <Action
          variant="secondary"
          size="sm"
          onPress={handleAddProject}
          disabled={!newProjectName.trim()}
        >
          <Plus className="size-4" />
        </Action>
      </div>

      {/* Filter box */}
      <div>
        <SearchBox
          label={t('apiWorkbench.sidebar.searchPlaceholder')}
          placeholder={t('apiWorkbench.sidebar.searchPlaceholder')}
          value={filterQuery}
          onValueChange={setFilterQuery}
        />
      </div>

      {/* Projects, Collections and Requests Tree */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1">
        {projects.map((project) => {
          const projectCollections = collections.filter((c) => c.projectId === project.id);

          return (
            <div key={project.id} className="mb-3">
              {/* Project Header */}
              <div className="flex items-center justify-between rounded-panel border border-border bg-surface-muted px-3 py-2">
                <span className="truncate font-semibold text-xs text-ink">{project.name}</span>
                <div className="flex items-center gap-1">
                  <IconAction
                    label="删除项目"
                    onPress={() =>
                      setDeleteTarget({
                        kind: 'project',
                        id: project.id,
                        title: project.name,
                      })
                    }
                    size="sm"
                  >
                    <Trash2 className="size-3.5 text-danger" />
                  </IconAction>
                </div>
              </div>

              {/* Action Buttons under Project */}
              <div className="my-2 flex items-center gap-2 px-1">
                <Action
                  variant="secondary"
                  size="sm"
                  onPress={() => onCreateCollection(project.id, '新建集合')}
                >
                  <FolderPlus className="mr-1 size-3.5 text-brand" />+{' '}
                  {t('apiWorkbench.sidebar.addCollection')}
                </Action>
                {projectCollections.length > 0 && (
                  <Action
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      const firstCol = projectCollections[0];
                      if (firstCol) {
                        onCreateRequest(firstCol.id, '新接口');
                      }
                    }}
                  >
                    <Plus className="mr-1 size-3.5 text-brand" />+{' '}
                    {t('apiWorkbench.sidebar.addRequest')}
                  </Action>
                )}
              </div>

              {/* Collections List */}
              <div className="flex flex-col gap-3 px-1">
                {projectCollections.map((collection) => {
                  const collectionRequests = filteredRequests.filter(
                    (r) => r.collectionId === collection.id,
                  );

                  return (
                    <div key={collection.id} className="flex flex-col gap-1">
                      {/* Collection Title */}
                      <div className="flex items-center justify-between rounded-control px-2 py-1 text-xs text-ink-muted hover:bg-surface-muted">
                        <div className="flex items-center gap-1.5 truncate">
                          <Folder className="size-3.5 text-ink-muted" />
                          <span className="truncate font-medium text-ink">{collection.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <IconAction
                            label="在该集合下新建接口"
                            onPress={() => onCreateRequest(collection.id, '新接口')}
                            size="sm"
                          >
                            <Plus className="size-3 text-ink-muted hover:text-brand" />
                          </IconAction>
                          <IconAction
                            label="删除集合"
                            onPress={() =>
                              setDeleteTarget({
                                kind: 'collection',
                                id: collection.id,
                                title: collection.name,
                              })
                            }
                            size="sm"
                          >
                            <Trash2 className="size-3 text-danger" />
                          </IconAction>
                        </div>
                      </div>

                      {/* Requests List */}
                      <div className="flex flex-col gap-1 px-2">
                        {collectionRequests.map((req) => {
                          const isSelected = req.id === selectedRequestId;
                          const methodTone =
                            req.method === 'GET'
                              ? 'text-success bg-success-soft'
                              : req.method === 'POST'
                                ? 'text-info bg-info-soft'
                                : req.method === 'DELETE'
                                  ? 'text-danger bg-danger-soft'
                                  : 'text-warning bg-warning-soft';

                          return (
                            <div
                              key={req.id}
                              className={`group flex items-center justify-between gap-2 rounded-control px-2.5 py-1.5 text-xs transition-colors ${
                                isSelected
                                  ? 'bg-surface-raised border border-border shadow-sm'
                                  : 'hover:bg-surface-muted'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => onSelectRequest(req.id)}
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                              >
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${methodTone}`}
                                >
                                  {req.method}
                                </span>
                                <span
                                  className={`truncate ${
                                    isSelected ? 'font-semibold text-ink' : 'text-ink-muted'
                                  }`}
                                >
                                  {req.name}
                                </span>
                              </button>

                              <div className="opacity-0 transition-opacity group-hover:opacity-100">
                                <IconAction
                                  label="删除接口"
                                  onPress={() =>
                                    setDeleteTarget({
                                      kind: 'request',
                                      id: req.id,
                                      title: req.name,
                                    })
                                  }
                                  size="sm"
                                >
                                  <Trash2 className="size-3 text-danger" />
                                </IconAction>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DestructiveConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
          triggerLabel=""
          title="确认删除"
          description={`确定要删除「${deleteTarget.title}」吗？此操作将立即在当前工作区移除。`}
          impact="此操作无法撤销。"
          cancelLabel="取消"
          confirmLabel="确认删除"
          failureMessage="删除失败"
          onConfirm={() => {
            if (deleteTarget) {
              onDelete(deleteTarget.kind, deleteTarget.id);
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </aside>
  );
}
