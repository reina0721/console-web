# 验证记录

## 局部验证（2026-10-27）

| 检查         | 命令                                                                                                               | 结果                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Surface 单测 | `pnpm --filter @community-go/surface test`                                                                         | 176 passed（含新增 pageTransition 用例） |
| Web 单测     | `pnpm --filter @community-go/web test`                                                                             | 192 passed                               |
| 新 e2e       | `pnpm exec playwright test apps/web/e2e/page-transition.spec.ts --project=chromium`                                | 10 passed                                |
| 受影响回归   | `transition` + `motion-preference` + `settings-product-review` + `settings-routes` + `shell-security` + `settings` | 53 passed                                |
| 视觉         | `pnpm exec playwright test apps/web/e2e/visual.spec.ts --project=chromium`                                         | 9 passed（`settings-desktop` 更新）      |

> 完整门禁之后仅在 `settings-index.test.ts` 补充了两条测试断言（「页面切换」命中
> `pageTransition`、新字段中英文文案真实），产品代码未变；该文件由
> `pnpm --filter @community-go/surface test`（176 passed）与 ESLint/Prettier 单独验证。

### 视觉基线变更（逐项复核）

- 文件：`apps/web/e2e/visual.spec.ts-snapshots/settings-desktop-chromium-win32.png`
- 差异：1440×2265 → 1440×2381（+116px，0.02 像素比）
- 原因：外观·动效与视觉辅助组新增「页面切换动画」Select 与说明，位于「动效偏好」与「高对比度」之间
- 复核：查看 actual 截图，仅新增该字段，其余布局/配色/token 无变化；无其它基线受影响
- 记录：见 [README](../README.md) 与 `design/decisions.md` D-07

## 完整门禁

`pnpm check` **退出码 0**（日志：[pnpm-check.log](pnpm-check.log)）：

- Playwright **423 项**（116 的 413 + 本变更 10）；web 192、surfaces 176；
- Architecture 845 files、Dependency 28、两项 Codegen fresh、ESLint、全部 TypeScript、
  Next build、Prettier、Docs（23 条变更）全部通过；
- 产物预算（未调整阈值）：initial **408,047 B / 409,600**、maxRoute **432,435 B / 445,440**
  （`/login`）、CSS **48,736 B / 49,152**、最大 chunk 84,704 B。
