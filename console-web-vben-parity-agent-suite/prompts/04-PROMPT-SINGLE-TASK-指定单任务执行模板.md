# 提示词 04：指定一个候选子项

先从 115 校准账本选择任务，填入具体子项与范围；不再使用原 Task 114～119 文件名。

```text
请实施：<VP-ID/子项>；本次具体范围：<功能及决策依据>。
先读 tmp/、根与目标局部 AGENTS、docs/README.md、docs/changes/115-vben-parity-calibration/requirements/ 中对应需求、design/README.md、design/execution-protocol.md 及相关 authority。
核对源码入口、全部真实消费者与既有测试；先 Element/Variant/Composition，再决定是否扩展公共 Pattern。公共 API、Showcase、i18n ownership、Accessibility、状态/Responsive/视觉/性能证据遵守项目规则。
按当前最新序号新建实现账本，保留原任务来源；只处理所选范围，未决项单独记录。不要修改 Backend 不降级 Mock 的边界或最近访问首页，也不要重建已有命令/权限/偏好体系。
完成必要 codegen 和局部检查后运行 pnpm check，记录退出码与证据；通过且真实完成所选 DoD 后才记完成。报告变更、验证和仍未完成部分。
```
