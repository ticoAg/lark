# lark-skill

> 当前维护仓库：`https://github.com/ticoag/lark`
>
> Development based on / fork source: `whatevertogo/FeiShuSkill`

> 面向飞书 / Feishu / Lark 的命令式 MCP Skill，默认通过 `ls` / `help` / `run` / `explain` 操作文档、知识库、云空间、消息、权限、用户/通讯录、任务、日历、审批、考勤等能力。

## 前置准备

在使用本 Skill 前，请先完成飞书 MCP 服务配置：

- 安装并启动 `lark-mcp`
- 创建飞书应用并配置所需权限
- 如需用户身份访问，完成 OAuth 登录配置

相关入口：
- 飞书 MCP 集成安装指南：<https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_installation>
- monorepo 根说明：`../README.md`
- MCP 子项目：`../lark-openapi-mcp`

## 默认交互模型

本 Skill 默认只走 4 个 facade 工具：

1. `ls`：发现 command / resource / action
2. `help`：查看节点说明、参数、默认身份
3. `run`：执行命令
4. `explain`：解释权限、token、scope、身份问题

统一心智模型：

- `command`
- `resource`
- `action`

例如：

- `doc document search`
- `drive folder create`
- `chat message create`
- `perm permission-member transfer-owner`
- `task task create`
- `calendar calendar-event create`

## 参考页导航

这批 reference 经过重新筛选，标准是：是否能帮助 agent 更好理解“当前 monorepo 里的飞书接入和使用方式”。因此保留了权限、限制、典型工作流、常见坑和状态字段说明，但不把不适配本仓的 NestJS 模块模板或内部 CLI 作为默认入口。

| 主题 | 参考页 | 适用时机 |
| --- | --- | --- |
| 文档 | `lark-mcp/reference/documents.md` | 搜索、导入、读写文档、Block 结构 |
| 知识库 | `lark-mcp/reference/wiki.md` | 搜 Wiki、列空间、处理 `node_token` / `obj_token` |
| 云空间 | `lark-mcp/reference/drive.md` | 建文件夹、列目录、移动/删除文件 |
| 权限 | `lark-mcp/reference/permissions.md` | 授权、查协作者、转所有者 |
| 消息 | `lark-mcp/reference/messages.md` | 文本/富文本/卡片消息 |
| 群组 | `lark-mcp/reference/groups.md` | 建群、查群、查成员 |
| 多维表格 | `lark-mcp/reference/bitable.md` | Base、表、字段、记录 |
| 用户/通讯录 | `lark-mcp/reference/contacts.md` | 查用户 ID、查部门、按部门拉人 |
| 任务 | `lark-mcp/reference/tasks.md` | 任务、清单、评论、@人 |
| 日历/会议室 | `lark-mcp/reference/calendar.md` | 事件、忙闲、会议室 |
| 审批 | `lark-mcp/reference/approval.md` | 发起审批、处理待办 |
| 考勤 | `lark-mcp/reference/attendance.md` | 打卡、补卡、考勤组 |
| OAuth | `lark-mcp/reference/oauth.md` | 只在需要理解用户授权时阅读 |
| 事件订阅 | `lark-mcp/reference/events.md` | 只在需要理解长连接事件/卡片回调时阅读 |

## 身份策略

- 需要“创建后当前用户能直接访问”的资源，优先 `identity: "user"`
- 机器人、后台自动化或租户级任务，才优先 `identity: "tenant"`
- 不确定时可先用 `identity: "auto"`，再结合 `help` 查看默认策略

执行结果里通常会返回 cite 信息，例如：

- `help_target`
- `raw_tool`
- `docs_url`
- `resource_url`
- `resource_tokens`

后续追问或排查时，优先复用这些 cite，而不是重新猜资源 ID 或 raw tool 名称。

## GitHub Auto Issue

当 `help -> run -> explain` 之后仍然失败，而且问题更像是 Skill 文档缺口、facade 映射异常、身份策略缺陷或示例失真时，按下面的方式处理：

- 先脱敏，再上报；不要带 token、cookie、完整资源链接、邮箱、手机号、群 ID、文档 token 或完整业务正文
- Skill / reference / 使用工作流问题优先归到 monorepo 内的 `lark-skill`
- facade / schema / raw tool 路由 / 身份策略问题优先报到 `lark-openapi-mcp`
- 如果可以自动创建 issue，就优先使用仓库模板创建 GitHub issue
- 如果自动创建失败，就把脱敏后的 issue draft 按模板写入仓库后再提交

详细规范见 `lark-mcp/reference/github-issues.md`；GitHub issue 模板位于 `../.github/ISSUE_TEMPLATE/lark-mcp-auto-failure.md`。

## 推荐工作流

### 1. 先发现能力

```yaml
工具: mcp__lark__ls
参数: {}
```

### 2. 再查看命令说明

```yaml
工具: mcp__lark__help
参数:
  target: "drive.folder.create"
```

### 3. 再执行命令

```yaml
工具: mcp__lark__run
参数:
  command: "drive"
  resource: "folder"
  action: "create"
  identity: "user"
  args:
    data:
      name: "项目资料"
```

### 4. 出错时解释原因

```yaml
工具: mcp__lark__explain
参数:
  target: "drive.folder.create"
  error: "Current user_access_token is invalid or expired"
```

## 可直接照抄的 end-to-end 示例

### 示例 1：搜索文档

```yaml
command: "doc"
resource: "document"
action: "search"
identity: "user"
args:
  data:
    search_key: "Q4 复盘"
    count: 10
```

### 示例 2：导入 Markdown 文档

```yaml
command: "doc"
resource: "document"
action: "import"
identity: "user"
args:
  data:
    file_name: "项目说明.md"
    markdown: "# 项目说明\n\n这里是正文。"
```

### 示例 3：创建云空间文件夹

```yaml
command: "drive"
resource: "folder"
action: "create"
identity: "user"
args:
  data:
    name: "项目资料"
```

### 示例 4：发送群消息

```yaml
command: "chat"
resource: "message"
action: "create"
identity: "tenant"
args:
  params:
    receive_id_type: "chat_id"
  data:
    receive_id: "oc_xxxxx"
    msg_type: "text"
    content: '{"text":"本周任务已更新，请查收"}'
```

### 示例 5：转移文档所有者

```yaml
command: "perm"
resource: "permission-member"
action: "transfer-owner"
identity: "user"
args:
  path:
    token: "doc_token"
  params:
    type: "docx"
  data:
    member_type: "openid"
    member_id: "ou_xxxxx"
```

### 示例 6：创建任务

```yaml
command: "task"
resource: "task"
action: "create"
identity: "user"
args:
  data:
    summary: "整理命令层迁移说明"
    description: "补 README、Skill 与迁移文档"
```

### 示例 7：创建日历事件

```yaml
command: "calendar"
resource: "calendar-event"
action: "create"
identity: "user"
args:
  data:
    summary: "命令层评审"
    start_time:
      timestamp: "1762400400"
    end_time:
      timestamp: "1762404000"

### 示例 8：先查用户 ID 再去任务评论 @ 人

```yaml
# Step 1
command: "user"
resource: "user"
action: "lookup-id"
identity: "tenant"

# Step 2
command: "task"
resource: "comment"
action: "create"
identity: "user"
```
```

## 常见问题

### Q1：为什么不直接调用 raw OpenAPI 工具？

因为本 Skill 面向的是命令层 facade。默认目标是让 AI 先理解“要做什么”，再由 facade 选择底层 raw tool 执行，而不是要求用户记住大量原始工具名和参数结构。

### Q2：什么时候用 `identity: "user"`？

当你希望创建后的文档、文件夹、任务、日历事件等资源由当前用户直接可见、可继续操作时，优先使用 `identity: "user"`。

### Q3：什么时候看 `help`，什么时候用 `explain`？

- 不确定命令怎么用、参数叫什么：先 `help`
- 已经执行失败，需要解释权限、token、scope、身份问题：用 `explain`

### Q4：任务评论里怎么 @ 用户？

先拿到被 @ 用户的 ID，再调用 `task.comment.create`。推荐优先使用 `open_id`，并保证 `params.user_id_type` 与该 ID 类型一致。然后在 `args` 中传 `mentions`，facade 会自动转换成 v2 评论支持的 `<at id=open_id></at>` 语法。例如：

```yaml
command: "task"
resource: "comment"
action: "create"
identity: "user"
args:
  params:
    user_id_type: "open_id"
  mentions:
    - user_id: "ou_xxxxx"
      user_id_type: "open_id"
  data:
    content: "请查看这个任务"
    resource_type: "task"
    resource_id: "<task_guid>"
```

## Legacy / Raw Reference 边界

仓库里仍保留 raw OpenAPI 参考资料、旧示例和底层映射实现，用于：

- 内部执行层
- 调试与排障
- cite 反向追溯
- 补充官方文档链接

但默认面对用户时：

- 不直接暴露 raw tool 名称
- 不要求用户理解 `useUAT`
- 不把 `path / params / data` 当成默认教学入口

如果确实需要排查底层问题，再回看 `lark-openapi-mcp` 中的 raw 参考文档和 cite 信息。
