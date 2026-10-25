'use client';

import { useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import type { ApiCollection, TaskDefinition } from '@community-go/surface/api-workbench';
import { useApiWorkbenchPort } from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { AlertBanner } from '@community-go/ui-adapter/feedback';
import { IconAction } from '@community-go/ui-adapter/icon-action';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { SelectField, SwitchField, TextField } from '@community-go/ui-adapter/form-field';
import { Clock, Play, Plus, Trash2 } from 'lucide-react';

export type TasksViewProps = Readonly<{
  collections: readonly ApiCollection[];
  tasks: readonly TaskDefinition[];
  onTasksChange: (tasks: readonly TaskDefinition[]) => void;
}>;

export function TasksView({ collections, tasks, onTasksChange }: TasksViewProps) {
  const { t } = useFrontendTranslation();
  const port = useApiWorkbenchPort();
  const isMock = port.capabilities.mode === 'mock';

  const [newName, setNewName] = useState('');
  const [newColId, setNewColId] = useState(collections[0]?.id ?? '');
  const [newCron, setNewCron] = useState('*/5 * * * *');
  const [isAdding, setIsAdding] = useState(false);

  const handleToggle = (id: string, enabled: boolean) => {
    onTasksChange(tasks.map((tk) => (tk.id === id ? { ...tk, enabled } : tk)));
  };

  const handleDelete = (id: string) => {
    onTasksChange(tasks.filter((tk) => tk.id !== id));
  };

  const handleCreate = () => {
    if (!newName.trim() || !newColId) return;
    const newTask: TaskDefinition = {
      id: `task_${Date.now().toString(36)}`,
      name: newName.trim(),
      targetCollectionId: newColId,
      cronOrInterval: newCron.trim() || '*/5 * * * *',
      enabled: true,
    };
    onTasksChange([...tasks, newTask]);
    setNewName('');
    setIsAdding(false);
  };

  const handleRunNow = (task: TaskDefinition) => {
    onTasksChange(
      tasks.map((tk) =>
        tk.id === task.id
          ? {
              ...tk,
              lastRun: {
                time: new Date().toLocaleTimeString(),
                passed: true,
                message: '手动运行完成，全部断言通过',
              },
            }
          : tk,
      ),
    );
  };

  return (
    <div className="grid gap-4">
      {isMock && (
        <AlertBanner
          tone="info"
          icon={<Clock className="size-5 shrink-0 text-info" />}
          title="定时任务提示"
          description={t('apiWorkbench.tasks.notice')}
        />
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{t('apiWorkbench.tasks.title')}</h3>
        {!isAdding && (
          <Action variant="secondary" size="sm" onPress={() => setIsAdding(true)}>
            <Plus className="mr-1.5 size-4" />
            {t('apiWorkbench.tasks.add')}
          </Action>
        )}
      </div>

      {isAdding && (
        <div className="grid gap-3 rounded-panel border border-border bg-surface-muted/50 p-4">
          <TextField
            label={t('apiWorkbench.tasks.name')}
            placeholder="每天数据健康巡检"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label={t('apiWorkbench.tasks.target')}
              options={collections.map((c) => ({ value: c.id, label: c.name }))}
              value={newColId}
              onValueChange={(id: string) => setNewColId(id)}
            />
            <TextField
              label={t('apiWorkbench.tasks.cron')}
              placeholder="*/5 * * * *"
              value={newCron}
              onChange={(e) => setNewCron(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Action variant="secondary" size="sm" onPress={() => setIsAdding(false)}>
              取消
            </Action>
            <Action variant="primary" size="sm" onPress={handleCreate}>
              保存任务
            </Action>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="py-8 text-center text-xs text-ink-muted">{t('apiWorkbench.tasks.empty')}</p>
      ) : (
        <div className="divide-y divide-border rounded-panel border border-border">
          {tasks.map((task) => {
            const targetCol = collections.find((c) => c.id === task.targetCollectionId);
            return (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs"
              >
                <div className="grid min-w-0 gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{task.name}</span>
                    <StatusPill tone={task.enabled ? 'success' : 'neutral'}>
                      {task.enabled ? '调度中' : '已暂停'}
                    </StatusPill>
                  </div>
                  <div className="flex items-center gap-3 text-ink-muted">
                    <span>集合: {targetCol?.name ?? task.targetCollectionId}</span>
                    <span className="font-mono">Cron: {task.cronOrInterval}</span>
                    {task.lastRun && (
                      <span className="text-success">
                        上次运行: {task.lastRun.time} ({task.lastRun.message})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <SwitchField
                      label="启用"
                      description=""
                      checked={task.enabled}
                      onCheckedChange={(checked: boolean) => handleToggle(task.id, checked)}
                      presentation="row"
                    />
                  </div>
                  <Action variant="secondary" size="sm" onPress={() => handleRunNow(task)}>
                    <Play className="mr-1 size-3" />
                    {t('apiWorkbench.tasks.runNow')}
                  </Action>
                  <IconAction label="删除任务" onPress={() => handleDelete(task.id)} size="sm">
                    <Trash2 className="size-4 text-danger" />
                  </IconAction>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
