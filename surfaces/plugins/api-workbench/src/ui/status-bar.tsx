'use client';

import { useFrontendTranslation } from '@community-go/i18n';
import type { ApiEnvironment } from '@community-go/surface/api-workbench';
import { Action } from '@community-go/ui-adapter/action';
import { SelectField, type SelectOption } from '@community-go/ui-adapter/form-field';
import { Download, Sliders, Upload } from 'lucide-react';

export type StatusBarProps = Readonly<{
  environments: readonly ApiEnvironment[];
  activeEnvironmentId?: string | undefined;
  baseUrlHint?: string | undefined;
  dbUsageText: string;
  onSelectEnvironment: (id: string | undefined) => void;
  onOpenManageEnvs: () => void;
  onExport: () => void;
  onImport: () => void;
}>;

export function StatusBar({
  environments,
  activeEnvironmentId,
  baseUrlHint,
  dbUsageText,
  onSelectEnvironment,
  onOpenManageEnvs,
  onExport,
  onImport,
}: StatusBarProps) {
  const { t } = useFrontendTranslation();

  const envOptions: readonly SelectOption[] = [
    { value: 'none', label: t('apiWorkbench.bottomBar.noEnv') },
    ...environments.map((e) => ({ value: e.id, label: e.name })),
  ];

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-2.5 text-xs text-ink-muted">
      {/* Left: Environment & Import/Export */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-40">
          <SelectField
            label="环境选择"
            options={envOptions}
            value={activeEnvironmentId ?? 'none'}
            onValueChange={(id: string) => onSelectEnvironment(id === 'none' ? undefined : id)}
          />
        </div>

        <Action variant="secondary" size="sm" onPress={onOpenManageEnvs}>
          <Sliders className="mr-1 size-3 text-ink-muted" />
          {t('apiWorkbench.bottomBar.manageEnvs')}
        </Action>

        <Action variant="secondary" size="sm" onPress={onExport}>
          <Download className="mr-1 size-3 text-ink-muted" />
          {t('apiWorkbench.sidebar.exportWorkspace')}
        </Action>

        <Action variant="secondary" size="sm" onPress={onImport}>
          <Upload className="mr-1 size-3 text-ink-muted" />
          {t('apiWorkbench.sidebar.importWorkspace')}
        </Action>
      </div>

      {/* Middle: Variable Hint Pill */}
      {baseUrlHint && (
        <div className="hidden items-center gap-1.5 font-mono text-xs md:flex">
          <span className="rounded-control bg-surface-muted px-2 py-0.5 text-ink-muted">
            {'{{ baseUrl }}'}
          </span>
          <span className="text-ink">→ {baseUrlHint}</span>
        </div>
      )}

      {/* Right: Storage & Version */}
      <div className="flex items-center gap-4 text-xs">
        <button
          type="button"
          onClick={onOpenManageEnvs}
          className="text-ink hover:text-brand transition-colors"
        >
          {t('apiWorkbench.bottomBar.setGlobals')}
        </button>
        <span className="font-mono text-ink-muted">{dbUsageText}</span>
        <span className="font-mono text-ink-muted">v0.4.0</span>
      </div>
    </footer>
  );
}
