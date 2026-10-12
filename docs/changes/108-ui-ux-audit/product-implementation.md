# Community Console 产品实施账本

承接 [M0 审计基线](product-readiness-m0.md)。2026-10-12 用户明确要求继续 M1，M0 确认门已满足。后续阶段持续更新本账本，不重复建立相同报告。

## M1：产品信息架构与工作台

状态：M1 已完成并通过完整门禁；用户已人工确认视觉变化，对应基线已更新。用户随后明确要求合并执行 M2–M3，正在实施；M4–M7 未开始。

### 问题、设计与改动

原首页展示路由数、插件数、Host 数、工程质量与建设轨迹；图标与参考资源混在正式管理入口。现改为工作空间、个人、开发中心三组，首页称“工作台”，设置入口称“个人偏好”，明确当前设置是浏览器个人体验而非系统级配置。开发中心按 UI Elements→Page Patterns→Page Archetypes→参考资源→图标→Foundation/Motion/States 排列。

只移动 Navigation Contribution 的归属与顺序；保留全部 38 Plugin URL、routeId、navigationId、隐藏详情/edit query、持久化 key/version 和认证协议。删除不再有消费者的 reference Group Alias；不改变 Framework Contract 或 Router。修改后由 codegen 生成 catalog，未手改生成物。全局搜索继续使用同一导航模型，结果说明补充当前分组及父级；页签仍使用实际分类/实体标题，旧首页标题呈现为当前工作台名称。收藏与最近访问保留原 href，已知入口标题随当前语言呈现。

工作台组合现役 Page/PageHeader/Section、RouterTextLink、Action、NotificationCenter、i18n 和 Motion。数据直接消费已有身份与 Host Store：

- 当前会话身份作为问候，不另建用户资料。
- 收藏与最近访问提供可跳转目标、真实时间与明确空态；最近访问隐藏偏好继续生效，根首页自身不作为工作入口重复显示。
- 非空创建草稿提供恢复入口；保存后消失，自动恢复偏好保留。源码确认仅创建草稿拥有可靠目标，未提供失去实体身份的编辑草稿入口。
- 最近应用事件来自同一通知 Store，提供单项/全部已读、关联页面与同源通知 Drawer，顶部计数同步；不预填通知，不当作后端审计。关闭应用内通知偏好时隐藏此区段。
- 外观、导航、语言地区、操作草稿四个偏好入口均直达已有功能。
- 开发工具明确放在独立开发中心区段；无业务任务或统计来源时不放图表、假计数或尚未完成模块的按钮。

未新增 Universal Token、公共 UI Element、Page Pattern 或 CSS，没有 TailAdmin 校准触发的公共组件改动。已有 HeroUI Overlay、Focus、Keyboard 与 Host 页面动效继续复用；账户退出隔离和 Browser API 所有权不变。

### Mock / Backend 状态与依赖

本阶段只消费既有会话、浏览器工作记忆、草稿与前端事件。Mock 认证可实际登录；认证 Backend Adapter 现有状态不变，真实后端待联调。Reference 资源仍是刷新恢复 fixture 的开发示例，事件关联的新资源在刷新后可能失效，已有缺失对象恢复态承接；M2 需要统一业务仓储与生命周期。没有新增或假称存在 REST 管理接口。

用户/角色摘要、服务端通知和审计活动依赖 M2 与 M3–M5，完成后再按权限和同一数据来源接到首页。系统配置归 M6；本轮不把个人偏好重命名成系统配置。

### 验证与未完成事项

浏览器已实际执行本地演示登录、创建草稿→回工作台→恢复内容→提交→工作台事件→全部已读→通知 Drawer 同步；验证旧创建 URL 与实体 query 保留。截图和 DOM 保存在 [product-m1 证据](evidence/product-m1/)。未改线上部署。

新增 Playwright 覆盖产品 IA/旧 URL/全局搜索/历史、真实草稿及事件同步，以及英文 Dark 在 390/768/1440/2560 的响应式、手机导航与 Axe。现有账户菜单、页签、导航记忆、自动恢复、收藏与最近访问流程保留并按产品入口名称更新定位，未放宽断言。首轮发现页签入口名覆盖分类标题，已修复；首轮结果保留，不作为最终通过证据。

完整 `pnpm check` 已执行：Foundation、Architecture、Dependency、两项 Codegen、Lint、TypeScript、403 项 Vitest、Next production build 与产物预算通过。浏览器 344 项中 326 通过、18 失败，故完整命令退出 1，不能声称全绿。失败分别为 11 个视觉测试（15 张截图）、6 个过期入口定位，以及 1 个截图输出文件写入错误。过期定位按产品名称更新后，全部 7 个非视觉失败独立补跑通过，包含两种新页面打开方式、滚顶开关、导航滚动、动态 Sticky 与 Compact rail；保留原检查及补跑日志。

新增 M1 的 3 个端到端用例已通过；完整套件还验证了全部 38 Plugin 路由在手机与桌面的标题/主体及无横向溢出、关键手机 Axe WCAG AA、已有收藏/最近访问/页签/离开保护/草稿/通知行为。英文 Dark 工作台在 390/768/1440/2560 保存了截图。当前最大路由 gzip 约 428.4 KiB（预算 430 KiB），CSS 约 47.2 KiB（预算 48 KiB）；预算余量较小，后续管理模块需继续测量。

视觉对照与具体范围见 [审阅清单](evidence/product-m1/visual-review.md)。2026-10-12 用户明确确认视觉变化并授权更新对应基线；定向 11 个视觉测试全部通过，更新清单对应 15 张截图，不扩大 diff 阈值。清单中的既有文案/可见位置已与当前源码和交互验证核对，日期用例额外固定 Date 时间并保留计时器运行，避免执行日期漂移。线上 404 翻译问题仍保留 M0 CC-16 跟踪，本阶段未部署修复。

获准更新后的第一轮全量浏览器回归 343/344 通过，全部视觉比对通过；唯一失败为写认证证据 PNG 的 Windows `UNKNOWN: open` 错误，见 [输出失败日志](evidence/product-m1/check-file-output-failure.txt)。此前另一个证据文件也出现相同错误，而独立补跑成功；磁盘空间与文件属性正常。测试工具增加 `saveEvidenceScreenshot`：仅捕获一次图像，对 `open` 系统调用的 `UNKNOWN/EBUSY/EPERM` 写入错误最多尝试 3 次，持续失败仍抛出；不重复页面操作、Axe 或视觉断言，也不修改截图阈值。现有证据截图消费者统一复用此保存逻辑，完整门禁重新验证。

最终完整 `pnpm check` **退出 0**：全部静态、类型、单元测试、构建、预算、**344/344 浏览器测试**、Prettier 与 Docs 检查通过，见 [最终完整日志](evidence/product-m1/check-passed.txt)。关键新流程和旧路由兼容已由现役源码、实际浏览器操作与完整测试共同证明；没有未收口的 M1 门禁失败。Backend-contract 项目只验证受控认证协议 fixture，不代表真实后端联调完成。

英文切换实测：当前入口和工作台静态文案即时翻译；已有实体/隐藏分类历史标题及通知正文是发布时保存的内容，可能仍为原语言。本阶段未改通知持久化 Contract，后续若要求历史事件重新翻译，应在 M2/M5 明确语义 message key/参数与已有记录兼容，而非 Shell 反向引用 Plugin 私有 namespace。

M1 的视觉审阅与门禁已收口；2026-10-12 用户更新目标，明确合并执行 M2–M3，实施见下文。

## M2–M3：数据契约、用户管理与个人账户（合并执行）

状态：实施与验证中；尚未登记阶段完成。真实后端未提供，REST 路径是基于现役 `/auth/*`、Cookie/CSRF 和 `NEXT_PUBLIC_AUTH_*` 配置延伸的待确认契约，不声称已联调。

### 审查与最小扩展判断

现役 AuthService、模式配置、Backend Cookie/CSRF、状态持久化、账户退出隔离已具备；Reference 资源只是内存 fixture，不能承担正式用户仓储。已复用现有能力，没有新建 Runtime Host、请求库、全局 Store Registry、Router、UI 框架或占位管理页。

- 请求层在 Web 内共用 `json-client`：Cookie、no-store、写请求 CSRF、15 秒超时与网络/HTTP/协议错误。现役认证 Adapter 复用它，不改变认证 URL 和 session 形状。
- Product Surface 增加具体 `identity` 模型/Schema/Port/Provider 作为用户、个人账户与 Host 的共享产品契约；不是万能 Service Locator。它不实现 HTTP、Storage、Session 或后端授权。Web 注入实现，公开导出与实验性成熟度沿用 Surface registry，并补实际 authority 与契约测试证据。
- Mock 将原 `community-go.auth-mock` v1 原地迁移到 v2，同一份数据保存账户摘要/盐、会话和用户目录。保留既有账号/会话，拒绝损坏与未知版本；不静默换 key。Browser 存储只作为标记清楚的模拟业务真相，不把真实 Backend 响应或秘密持久化。
- Mock User 写操作同时更新目录、登录资料与当前会话身份；姓名/邮箱编辑、禁用和角色分配由同一记录及 version 决定。独立 Service 实例和页面刷新读取最新持久化快照。Web Locks 可用时串行写入；真实后端必须独立实现原子写、版本冲突与授权。

### 当前实现与复用

新增 users/account 两个 Plugin，固定 URL `/users`、`/users/create`、`/users/detail?id=…`、`/users/edit?id=…`、`/account`，兼容当前静态部署。原 38 Plugin URL 均保留。导航沿用 Surface Group Alias、生成器、全局搜索与页签；个人账户同时从账户菜单进入。

用户目录使用现役 Page/PageHeader、Collection/FilterBar、SearchBox、SelectField、DataTable 和手机列表组合，实现姓名/邮箱搜索、状态/角色过滤、排序、分页、明确空态与恢复。创建、编辑和个人账户复用 FoundationForm、受控 Field、FormActions、离开保护与统一通知；密码仅创建时进入内存表单，不放入草稿。详情复用 DescriptionList、StatusPill、收藏 Port 与 ConfirmDialog，处理角色分配、状态修改、自身保护、权限不足、Pending、失败恢复和版本冲突。

M2–M3 初始角色目录只读并支持分配现有角色；后续 M4 已将其扩展为持久化角色与授权，见下文。个人账户修改姓名/邮箱，角色和状态只读，并刷新真实 UserIdentity。未制造行业业务、无结果按钮或虚假用户统计。

### 验证、剩余事项与依赖

第一批 19 项契约/认证兼容测试通过：同一 contract suite 对 Mock 与 Backend Adapter 验证查询→创建→详情→编辑→状态→角色→登录身份闭环，以及邮箱重复、版本冲突、受限身份、旧数据迁移、损坏/未知版本保留、写入失败、非法响应、网络/超时。架构与 Foundation 检查通过。类型、浏览器实际操作、响应式/Axe/视觉与完整 `pnpm check` 仍在进行，完成后补最终证据和成绩。

下一步建立单一 REST 对接文档与 Backend 契约浏览器 fixture，完成管理员和受限身份的用户/个人账户任务实测，再执行阶段门禁。真实 REST 服务仍待联调，不以契约 fixture 成功替代真实服务验证。

## M4–M5：角色授权、通知中心与审计（合并执行）

2026-10-12 用户指令：“先不检查门禁等审查，直接继续m4 ~ m5”。本轮直接实施，不开展浏览器验收、测试、Lint、类型检查、构建、预算或视觉基线审查；以下是源码实现记录，不代表阶段验收通过。M2–M3 尚未收口的验收继续保留，M6–M7 未展开。

### 现役能力复用与最小扩展

角色与成员复用 M2–M3 的 Product Identity Port、统一 Cookie/CSRF 请求层、用户目录、版本冲突和状态持久化；不用新的 Router、请求库、UI 框架或权限 Store。角色/通知/审计各自拥有 Plugin 私有页面，跨页面只共享具体产品模型与语义 hook。Page、PageHeader、Section、FoundationForm、TextField、CheckboxField、SelectField、ConfirmDialog、DescriptionList、StatusPill、Action、离开保护和统一反馈继续消费现役实现；无新增公共 Element、Token 或 CSS。

Mock 数据库仍使用 `community-go.auth-mock`，升级到 v3。v1、v2 分别迁移保留原账户摘要、会话、用户及序号，并加入系统角色、通知和审计集合；无历史事件预填，损坏或未知版本仍拒绝写入。Backend 响应只留在请求结果内，不落入浏览器持久化 Store。

### M4 实现

- `/roles`：真实角色列表与名称搜索，显示系统/自定义角色和实际权限数。
- `/roles/detail?id=…`：权限清单、当前成员总数与成员入口；“全部成员”进入已有用户列表的角色筛选，分配继续使用用户详情中的版本与确认操作。
- `/roles/create`、`/roles/edit?id=…`：角色名称与资源/操作权限配置，表单校验、未保存离开保护、授权影响确认、保存反馈、冲突和显式重新读取。
- `/roles/permissions`：资源 → 操作 → 实际已授予角色的关系目录，每个角色可进入详情；与编辑表单使用同一 `permissionCodes` 及角色数据。
- 系统角色不可编辑；不能编辑自己所属角色、改变自己的角色/状态或移除最后一名有效管理员；不能创建/编辑/分配包含自己未持有权限的角色。角色权限变动由当前数据库重新计算，不依赖固定角色常量授权。
- 侧栏与全局搜索使用同一个按当前权限过滤的导航集合；用户、角色、审计页面和动作仍单独确认权限。授权感知负责前端体验，真实后端必须为每次请求独立授权。

### M5 实现

- `/notifications`、`/notifications/detail?id=…`：通知列表、文本与分类/未读过滤、每页 20 条、详情、单项/本页/全部已读、关联页面和失败反馈。
- `useProductInbox` 合并当前账户的管理事件与现役应用事件。顶部 Drawer、完整页面和工作台消费同一集合与标记操作；Drawer 展示最近 10 条并进入完整中心。管理操作不再重复发布同一条本地成功事件。
- 管理通知按接收人隔离，Mock 的创建/编辑/状态/角色/个人资料操作成功时真实生成，不随机、不预填；Backend 使用服务端通知集合。权限不足时不提供关联管理入口；移除 Plugin 的历史应用事件仍可阅读，未知跳转目标不渲染链接。目标实体后来删除时由目标页面缺失记录状态承接。
- `/audit-logs`、`/audit-logs/detail?id=…`：只读查询、操作主体/对象搜索、操作类型/结果过滤、分页、详情及权限拒绝状态。记录含真实 actor、object、operation、time、result 与失败错误码；不收集密码、输入内容或凭据。
- Mock 成功操作和通知/审计随业务写入同一次持久化提交；权限拒绝、冲突、校验失败、记录缺失的写操作只追加失败元数据，不改变业务记录。失败审计无法持久化时保留原操作失败。生产审计真实性、原子性与保留政策属于后端，前端没有审计编辑接口。
- 写入后失效相关读取；Mock 跨窗口数据库变动与重新聚焦触发刷新。真实 Backend 目前为读取/手动刷新/聚焦刷新，没有声明实现服务端推送。

### 当前交付状态

路由由现役生成器装配，当前为 14 Plugins / 52 Routes，保留既有 URL。代码生成第一次与开发监听并发发生 `ENOTEMPTY`，后续生成已成功恢复；未修改生成器或手写生成物。

本轮功能代码及下列 REST 契约已落地；未新增“全绿”证据，未更新视觉基线，未部署。桌面/移动/键盘/Axe、Mock 完整任务、Backend fixture 与真实联调、类型/构建/性能预算仍待后续验收。既有 M1 的通过记录只证明 M1，不覆盖本轮改动。

## M2–M5 REST 对接契约（实现稿，待后端联调）

源码 authority 为 `surfaces/src/identity/model.ts`、`apps/web/src/identity/backend-service.ts` 与既有 Auth Contract。当前没有真实管理后端，不声称这些新增 endpoint 已在线存在。

### 模式与传输

现役 `NEXT_PUBLIC_AUTH_MODE=mock|backend` 同时选择认证和管理数据模式。Backend 使用 `NEXT_PUBLIC_AUTH_API_BASE_URL`；无效配置显示配置错误，不回退到 Mock。全部请求 `credentials: include`、`cache: no-store`；写请求先读取既有 `GET /auth/csrf` 的 `{ "token": "…" }`，再发送 `X-CSRF-Token` 与 JSON body。CSRF 和实际请求共享 15 秒超时，不自动重试写操作。

沿用现役 `/auth/session`、`/auth/login`、`/auth/register`、`/auth/logout` 认证 Contract，不新增 Bearer/localStorage token。服务端配置 Cookie、CORS、CSRF 和会话生命周期；前端的权限检查不能代替后端授权。

### Endpoint 与权限

以下路径相对 API Base URL。GET 成功 200、创建成功 201、PATCH 成功 200；通知已读成功为 204 空 body。返回体必须符合严格 Schema，不可随意加入字段。

| 方法 / 路径                 | 权限与用途                             | 请求 / 响应                                                                            |
| --------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| GET `/auth/access`          | 当前有效账户                           | `{user, permissions}`；权限是角色授权并集                                              |
| GET `/me`                   | 当前有效账户                           | `{user}`，必须等于当前会话 user ID                                                     |
| PATCH `/me`                 | `account.update`                       | `{name,email,version}` → `{user}`；禁止 role/status/password 字段                      |
| GET `/roles`                | 当前有效账户的可用角色目录             | `{items: Role[]}`；有 `roles.read` 或 `users.read` 可获完整目录，否则只返回自身角色    |
| GET `/roles/:id`            | `roles.read`                           | `{role}`                                                                               |
| POST `/roles`               | `roles.create`，且授权范围不能超出自身 | `{name,permissions}` → `{role}`                                                        |
| PATCH `/roles/:id`          | `roles.update`，且授权范围不能超出自身 | `{name,permissions,version}` → `{role}`；系统角色/自己的角色拒绝                       |
| GET `/users`                | `users.read`                           | 下述 Query → `{items,total,page,pageSize}`                                             |
| GET `/users/:id`            | `users.read`                           | `{user}`                                                                               |
| POST `/users`               | `users.create`                         | `{name,email,password,roleIds,status}` → `{user}`                                      |
| PATCH `/users/:id`          | `users.update`                         | `{name,email,version}` → `{user}`                                                      |
| PATCH `/users/:id/status`   | `users.status`                         | `{status,version}` → `{user}`                                                          |
| PATCH `/users/:id/roles`    | `users.roles`，授权范围不能超出自身    | `{roleIds,version}` → `{user}`                                                         |
| GET `/notifications`        | 当前有效账户，只返回自己的通知         | `{items: ProductNotification[]}`，新到旧；完整当前 inbox，前端分页/筛选                |
| PATCH `/notifications/read` | 当前有效账户，只更新自己的记录         | `{ids: string[]}`（1–200，不重复）→ 204；已读操作幂等，未知/别人的 ID 拒绝，不部分提交 |
| GET `/audit-logs`           | `audit.read`                           | 下述 Query → `{items,total,page,pageSize}`，时间降序并用 ID 决定并列顺序               |
| GET `/audit-logs/:id`       | `audit.read`                           | `{record}`；没有前端编辑/删除 endpoint                                                 |

创建用户的非 `viewer` 初始角色额外需要 `users.roles`，初始 disabled 需要 `users.status`。禁用账户不能继续登录/恢复会话；角色、状态、个人资料和邮箱变更在同一身份数据关系内生效。授权变化对未来请求立即生效，不仅改变侧栏。

### 字段、查询与响应校验

- Identifier：1–100 位 `[A-Za-z0-9][A-Za-z0-9_.:-]*` opaque ID；姓名/角色名称 trim 后 1–80 字符；邮箱 trim/lowercase 后有效邮箱、最多 254 字符；密码仅创建请求，12–128 字符。
- User：`id,name,email,status,roleIds,version,createdAt,updatedAt`；status=`active|disabled`；roleIds 为不重复有效 ID，1–20 项；version 为正整数；时间是 UTC ISO datetime。
- Role：`id,name,permissions,protected,version,createdAt,updatedAt`。permissions 是下述受控 code 的不重复集合，允许空集；protected=true 不可变。修改必须检查 version 并增加版本，不接受客户端 protected/id/time。
- 权限目录：`users.read/create/update/status/roles`、`roles.read/create/update`、`account.update`、`audit.read`（斜线表示多个独立 code）。资源与操作在 UI 分组展示；角色的 permissions 是授权关系，access 是当前角色并集。只授予写权限不隐式赋予读权限，配置时应一并考虑所需读权限。
- Users Query：`q` ≤100，`status=all|active|disabled`，`roleId=all|ID`，`sort=name|email|createdAt`，`direction=asc|desc`，`page=1..100000`，`pageSize=10|20|50`。缺省空搜索/all/all/name/asc/1/20；排序以 ID 作为稳定并列键；分页越界返回空 items 和真实 total。
- Audit Query：`q` ≤100（匹配 actorId/actorName/objectId/objectName），`operation=all|受控操作`，`result=all|success|failure`，page/pageSize 同 Users；缺省空/all/all/1/20。
- AuditRecord：`id,actorId,actorName,objectId,objectName,operation,createdAt,result,errorCode?`。operation 为用户 create/update/status/roles、account.update、roles.create/update；errorCode 仅失败记录。操作主体由服务端会话确定，客户端不能提交 audit record。
- ProductNotification：`id,ownerId,operation,objectId,objectName,category,createdAt,read`；category=`success|failure|system`；operation 同 Audit；接收人必须是当前账户。通知标题由语义 operation 和对象名在当前语言生成，Backend 响应不落入本地事件 Store。
- Page 响应：total 非负整数，page/pageSize 与请求一致；items 不超过 pageSize、ID 不重复且 total 不小于 items 长度。单实体响应 ID 必须匹配请求；写响应 version 必须增加。

### 冲突、受保护操作与错误

HTTP 401 使认证过期；403 只呈现权限拒绝，不切换到 Mock；404 呈现记录缺失；409 用于邮箱/角色名重复、版本冲突和保护规则；422 用于不合法字段；网络、超时、非法 JSON/Schema 分别保留 network/timeout/protocol 语义。

错误体：`{"error":{"code":"conflict","reason":"stale-version","fields":[{"field":"version","reason":"stale"}],"requestId":"req-123"}}`。

code 必须与 HTTP 状态一致；reason 可选 `duplicate-email|duplicate-role|stale-version|protected-user|protected-role|last-administrator`；fields 中 field 为 name/email/password/roleIds/permissions/status/version/query，reason 为 required/format/length/duplicate/protected/stale/unknown；requestId 最多 128 字符，不含秘密。409 保留当前输入并提供显式读取最新记录，不自动覆盖或重试。

通知策略：用户/个人资料写入通知操作人及被操作用户；角色写入通知操作人及该角色现有成员，接收人去重。成功业务写入、版本更新、凭据/会话资料同步、通知生成与成功审计必须由后端原子提交。失败审计独立记录授权主体、受控对象 ID 与错误语义，禁止密码、凭据或原始 body。Mock 仅模拟这些业务规则，浏览器可修改的数据不提供生产授权与审计可信性。

### 示例

创建自定义只读审计角色：`POST /roles`，body `{"name":"Audit reviewer","permissions":["audit.read","account.update"]}`；响应 `{ "role": { "id":"role-42","name":"Audit reviewer","permissions":["audit.read","account.update"],"protected":false,"version":1,"createdAt":"2026-10-12T00:00:00.000Z","updatedAt":"2026-10-12T00:00:00.000Z" } }`。

给其他用户分配角色：`PATCH /users/member-001/roles`，body `{"roleIds":["role-42"],"version":1}`；返回 `{user}`，version 增加。此后该用户 access 包含 audit.read/account.update，其审计入口可见；编辑个人资料仍不能改变角色。

查询失败日志：`GET /audit-logs?q=member-001&operation=users.roles&result=failure&page=1&pageSize=20`；返回只读分页。通知已读：`PATCH /notifications/read`，body `{"ids":["inbox-42"]}`，成功 204；读取集合后同一 ID 的 read=true。

后端上线前需确认新增路径、权限 code、Inbox 的完整集合规模与保留政策、审计保留和分页稳定性。当前没有 SSE/WebSocket 推送或通知删除 API；未来服务端分页 inbox 需要同时约定准确未读总数与筛选/批处理语义，不能仅返回最近一页冒充完整集合。
