import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

import { loadWebConfig } from '@community-go/config/node';

const config = loadWebConfig({ cwd: import.meta.dirname });
const deploymentMode = config.deploymentMode;

export default function nextConfig(phase: string): NextConfig {
  return {
    // 允许通过 127.0.0.1、localhost 访问 0.0.0.0 监听的开发服务器
    allowedDevOrigins: ['127.0.0.1', 'localhost'],
    // Playwright 的 dev server 使用独立目录，避免 production build 覆盖正在运行的开发缓存。
    distDir: config.distDir ?? (phase === PHASE_DEVELOPMENT_SERVER ? '.next' : 'dist'),
    // server Mode 不设 output（真实 Next Runtime Server）；static / static-enumerated 用静态导出。
    ...(deploymentMode === 'server' ? {} : { output: 'export' as const }),
    transpilePackages: [
      '@community-go/config',
      '@community-go/core',
      '@community-go/design-system',
      '@community-go/surface-foundation',
      '@community-go/plugin-framework',
      '@community-go/surface',
      '@community-go/form-foundation',
      '@community-go/i18n',
      '@community-go/types',
      '@community-go/ui-adapter',
    ],
  };
}
