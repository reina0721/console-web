# API Workbench Contract

本模块是当前 Product Surface 的 API 调试能力模型与 Port，对 Host 开放 `@community-go/surface/api-workbench`。插件组件和 Store 仍为私有实现，不进入 exports。文档入口：[前端文档](../../../docs/README.md)。

## Runtime responsibilities

- `workspace`：读取和保存 workspace v1，写失败必须拒绝 Promise，不能用只更新内存的成功响应替代耐久保存。
- `transport`：执行已解析请求并返回 HTTP 响应或结构化传输失败。
- `tasks`：任务配置 CRUD；`capabilities.persistentTasks` 只在真实调度服务可用时为 true。
- `transfer`：`selectWorkspace(): Promise<string | null>` 返回所选文件文本或取消；`exportWorkspace(snapshot): Promise<void>` 和 `copyResponse(body): Promise<void>` 表达用户动作，失败拒绝 Promise。DOM、文件、Object URL 与 Clipboard 只在 Host 实现。
- `capabilities` 反映所选实际服务；Runtime 完成 workspace.load 后，UI 可以据此呈现正确模式与禁用原因。

## Ownership and compatibility

工作台插件拥有已保存 Snapshot、按请求 ID 的内存 drafts、面板选择和执行反馈；持久化由 Host repository 执行。新接口保留 v1 结构与存储 key，导入由现有 Schema 校验并经用户确认替换。Task lastRun.time 新记录为 ISO 字符串，旧的已格式化时间仍可展示。切换 Locale 后 UI 文案和数值日期格式由 i18n 提供，用户命名和历史消息作为数据保留。

当前实现与验证历史见 [113](../../../docs/changes/113-api-workbench-ui-ux/README.md)，当前视觉规范见 [UI Element System](../../../docs/ui-element-system.md)。
