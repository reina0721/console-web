'use client';

import { useFrontendTranslation } from '@community-go/i18n';
import type { RequestDisguise } from '@community-go/surface/api-workbench';
import { useApiWorkbenchPort } from '@community-go/surface/api-workbench';
import { AlertBanner } from '@community-go/ui-adapter/feedback';
import { TextField } from '@community-go/ui-adapter/form-field';
import { Sliders } from 'lucide-react';

export type DisguisePanelProps = Readonly<{
  disguise: RequestDisguise;
  onChange: (disguise: RequestDisguise) => void;
}>;

export function DisguisePanel({ disguise, onChange }: DisguisePanelProps) {
  const { t } = useFrontendTranslation();
  const port = useApiWorkbenchPort();
  const isMockMode = !port.capabilities.disguise;

  return (
    <div className="grid max-w-lg gap-4">
      {isMockMode && (
        <AlertBanner
          tone="warning"
          icon={<Sliders className="size-5 shrink-0 text-warning" />}
          title={t('apiWorkbench.disguise.mockNoticeTitle')}
          description={t('apiWorkbench.disguise.mockNoticeDesc')}
        />
      )}

      <TextField
        label={t('apiWorkbench.disguise.timeout')}
        value={String(disguise.timeoutMs || 10000)}
        onChange={(e) =>
          onChange({ ...disguise, timeoutMs: parseInt(e.target.value, 10) || 10000 })
        }
      />

      <TextField
        label={t('apiWorkbench.disguise.ua')}
        placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
        value={disguise.userAgent ?? ''}
        disabled={isMockMode}
        {...(isMockMode ? { hint: t('apiWorkbench.disguise.uaHint') } : {})}
        onChange={(e) => onChange({ ...disguise, userAgent: e.target.value })}
      />

      <TextField
        label={t('apiWorkbench.disguise.proxy')}
        placeholder="http://127.0.0.1:7890"
        value={disguise.proxy ?? ''}
        disabled={isMockMode}
        {...(isMockMode ? { hint: t('apiWorkbench.disguise.proxyHint') } : {})}
        onChange={(e) => onChange({ ...disguise, proxy: e.target.value })}
      />

      <TextField
        label={t('apiWorkbench.disguise.fingerprint')}
        placeholder="chrome_124_tls_fp"
        value={disguise.fingerprint ?? ''}
        disabled={isMockMode}
        {...(isMockMode ? { hint: t('apiWorkbench.disguise.fingerprintHint') } : {})}
        onChange={(e) => onChange({ ...disguise, fingerprint: e.target.value })}
      />
    </div>
  );
}
