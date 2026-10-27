# Vben 对标文档包使用指南（已校准）

> **状态（2026-10-27）**：本包对应的 VP-01…VP-06 目标已由
> `docs/changes/116-vben-parity-implementation/` 完成、验证并提交；逐项对标结论见
> `research/final-parity-matrix.md`。本包提示词保留为历史模板，新工作请从 116 账本继续，
> 不必重新执行接入审查或候选筛选。

本包已按 2026-10-26 的本地源码与项目规则校准。正式任务材料已整理到 [115 校准账本](../docs/changes/115-vben-parity-calibration/README.md)，无需再复制 docs/vben-parity 或运行挂载脚本。

## 如何使用

1. 阅读 [六项核对矩阵](../docs/changes/115-vben-parity-calibration/research/findings.md)，区分已有能力、缺口和待决策事项。
2. 阅读 [建议顺序与清单](../docs/changes/115-vben-parity-calibration/tasks.md)，选择一个有明确范围的子项。
3. 首次会话用 [01 接入审查](prompts/01-PROMPT-BOOTSTRAP-首次接入与启动.md)，继续单步用 [02 断点续传](prompts/02-PROMPT-NEXT-TASK-日常断点续传单步执行.md)，指定任务用 [04 单任务](prompts/04-PROMPT-SINGLE-TASK-指定单任务执行模板.md)。
4. 只有已经明确一组产品实施范围时才用 [03 连续执行](prompts/03-PROMPT-AUTOPILOT-已确认范围连续执行.md)；不能自动执行待决策子项。

## 已纠正的原包问题

原 Task 114 与已存在的 API 工作台账本冲突，六项已改用 VP-01～VP-06。命令面板、权限判断、八分类设置和列设置示例已有实现。Backend 不自动降级 Mock，首页保持仅最近访问。所有源码路径仅作检查入口，实施前重新核对。

本包仅保留导航和提示词，状态、研究、需求、设计与验收证据统一在 docs/changes。原“100% 兼容”“全量源码级差距”没有足够证据，已撤回；门禁通过不等于需求正确或功能完成。

原 register-vben-parity-docs.mjs 已撤下，避免将任务材料挂入架构地图。项目文档入口仍为 README → docs/README → 主题 authority；任务入口经 docs/changes/README 导航。
