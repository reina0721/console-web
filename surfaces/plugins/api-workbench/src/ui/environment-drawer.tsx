'use client';

import { useState } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import type { ApiEnvironment, KeyValueEntry } from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { DrawerSurface } from '@community-go/ui-adapter/overlays';
import { IconAction } from '@community-go/ui-adapter/icon-action';
import { TabsView, type TabsViewItem } from '@community-go/ui-adapter/data-display';
import { TextField } from '@community-go/ui-adapter/form-field';
import { Plus, Trash2 } from 'lucide-react';
import { KeyValueEditor } from './key-value-editor';

export type EnvironmentDrawerProps = Readonly<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  environments: readonly ApiEnvironment[];
  globals: readonly KeyValueEntry[];
  onEnvironmentsChange: (envs: readonly ApiEnvironment[]) => void;
  onGlobalsChange: (globals: readonly KeyValueEntry[]) => void;
}>;

export function EnvironmentDrawer({
  isOpen,
  onOpenChange,
  environments,
  globals,
  onEnvironmentsChange,
  onGlobalsChange,
}: EnvironmentDrawerProps) {
  const { t } = useFrontendTranslation();
  const [activeTab, setActiveTab] = useState<'envs' | 'globals'>('envs');
  const [selectedEnvId, setSelectedEnvId] = useState(environments[0]?.id ?? '');
  const [newEnvName, setNewEnvName] = useState('');

  const currentEnv = environments.find((e) => e.id === selectedEnvId) ?? environments[0];

  const handleAddEnv = () => {
    if (!newEnvName.trim()) return;
    const newEnv: ApiEnvironment = {
      id: `env_${Date.now().toString(36)}`,
      name: newEnvName.trim(),
      variables: [
        { id: `v_${Date.now().toString(36)}`, key: 'baseUrl', value: 'https://', enabled: true },
      ],
    };
    onEnvironmentsChange([...environments, newEnv]);
    setSelectedEnvId(newEnv.id);
    setNewEnvName('');
  };

  const handleDeleteEnv = (id: string) => {
    const updated = environments.filter((e) => e.id !== id);
    onEnvironmentsChange(updated);
    if (selectedEnvId === id) {
      setSelectedEnvId(updated[0]?.id ?? '');
    }
  };

  const handleUpdateEnvVars = (variables: readonly KeyValueEntry[]) => {
    if (!currentEnv) return;
    onEnvironmentsChange(
      environments.map((e) => (e.id === currentEnv.id ? { ...e, variables } : e)),
    );
  };

  const items: readonly TabsViewItem[] = [
    {
      id: 'envs',
      label: t('apiWorkbench.environments.envsTab'),
      content: (
        <div className="grid gap-4 pt-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                label={t('apiWorkbench.environments.envName')}
                placeholder={t('apiWorkbench.environments.envName')}
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
              />
            </div>
            <Action variant="primary" size="sm" onPress={handleAddEnv}>
              <Plus className="mr-1 size-3.5" />
              {t('apiWorkbench.environments.addEnv')}
            </Action>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-border pb-4">
            {environments.map((env) => (
              <div
                key={env.id}
                className={`flex items-center gap-2 rounded-panel border px-3 py-1.5 text-xs transition-colors ${
                  env.id === currentEnv?.id
                    ? 'border-brand bg-brand-soft font-semibold text-brand-strong'
                    : 'border-border bg-surface text-ink hover:bg-surface-muted'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedEnvId(env.id)}
                  className="outline-none"
                >
                  {env.name}
                </button>
                {environments.length > 1 && (
                  <IconAction
                    label={t('apiWorkbench.environments.deleteEnv')}
                    onPress={() => handleDeleteEnv(env.id)}
                    size="sm"
                  >
                    <Trash2 className="size-3 text-danger" />
                  </IconAction>
                )}
              </div>
            ))}
          </div>

          {currentEnv && (
            <div className="grid gap-2">
              <span className="text-xs font-semibold text-ink">{currentEnv.name} · 变量配置</span>
              <KeyValueEditor
                entries={currentEnv.variables}
                onChange={handleUpdateEnvVars}
                keyPlaceholder="baseUrl"
                valuePlaceholder="http://localhost:3000"
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'globals',
      label: t('apiWorkbench.environments.globalsTab'),
      content: (
        <div className="pt-4">
          <KeyValueEditor
            entries={globals}
            onChange={onGlobalsChange}
            keyPlaceholder="globalKey"
            valuePlaceholder="globalValue"
          />
        </div>
      ),
    },
  ];

  return (
    <DrawerSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      triggerLabel=""
      closeLabel="关闭"
      title={t('apiWorkbench.environments.title')}
      description={t('apiWorkbench.environments.description')}
    >
      <div className="p-4">
        <TabsView
          label={t('apiWorkbench.environments.title')}
          items={items}
          selectedId={activeTab}
          onSelectionChange={(id: string) => setActiveTab(id as 'envs' | 'globals')}
        />
      </div>
    </DrawerSurface>
  );
}
