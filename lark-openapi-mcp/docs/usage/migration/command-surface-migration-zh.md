# 命令层迁移指南

本指南用于帮助现有 `lark-mcp` 使用者从旧的 raw OpenAPI MCP 工具面，迁移到新的命令式 facade。

## 发生了什么变化

现在对外默认只暴露 4 个稳定工具，而不再把所有 raw OpenAPI tool 直接注册给客户端：

- `ls`
- `help`
- `run`
- `explain`

新的统一心智模型是：

- `command`
- `resource`
- `action`

例如：

- `doc document search`
- `drive folder create`
- `chat message create`
- `perm permission-member transfer-owner`

raw OpenAPI tool 仍作为内部执行层和映射层保留，但不再是默认的对外接口。

被飞书/Lark 标记为 `历史版本（不推荐）/ Deprecated Version (Not Recommended)` 的 API 默认会被统一过滤；只有显式写入 `--deprecated-tools` 的旧版 API 才会被重新开放。

## Breaking Changes

### 1. 对外工具名变了

如果旧客户端直接调用 `docx_builtin_search`、`im_v1_message_create` 这类 raw 工具名，需要改为通过 `run` 调用 facade。

### 2. `-t/--tools` 的语义变了

`-t/--tools` 不再改变客户端可见的公共工具名。

它现在用于限制 facade 背后可用的 raw 能力范围。

如果必须临时使用某个旧版 API，需要把它写进 `--deprecated-tools`；仅靠 `-t/--tools` 不足以重新开放。

也就是说：

- 公共工具名始终固定为 `ls` / `help` / `run` / `explain`
- 当前启用的 raw tools 会影响 `ls` 能发现什么，以及 `run` 能执行什么

### 3. 执行结果现在是统一 envelope

`run` 不再直接透传 raw 工具结果，而是返回统一包装结构。

常见字段包括：

- `ok`
- `target`
- `summary`
- `data`
- `next`
- `cite`

其中 `cite` 会包含可追溯字段，例如：

- `help_target`
- `raw_tool`
- `docs_url`
- `resource_url`
- `resource_tokens`

### 4. 身份策略提升到命令层

不再默认教学 raw `useUAT`，而是使用：

- `identity: "auto"`
- `identity: "user"`
- `identity: "tenant"`

执行前建议先用 `help` 查看目标节点的默认身份策略。

## 旧工具到新命令层的对照

下面这些例子展示了从 raw tool 到命令层的常见迁移方式。

| 旧 raw tool | 新 facade target | 示例 |
| --- | --- | --- |
| `docx.builtin.search` | `doc.document.search` | `run(command=\"doc\", resource=\"document\", action=\"search\")` |
| `docx.builtin.import` | `doc.document.import` | `run(command=\"doc\", resource=\"document\", action=\"import\")` |
| `drive.v1.file.createFolder` | `drive.folder.create` | `run(command=\"drive\", resource=\"folder\", action=\"create\")` |
| `im.v1.message.create` | `chat.message.create` | `run(command=\"chat\", resource=\"message\", action=\"create\")` |
| `drive.v1.permissionMember.transferOwner` | `perm.permission-member.transfer-owner` | `run(command=\"perm\", resource=\"permission-member\", action=\"transfer-owner\")` |
| `contact.v3.user.batchGetId` | `user.user.lookup-id` | `run(command=\"user\", resource=\"user\", action=\"lookup-id\")` |

## 迁移示例

### 搜索文档

旧 raw tool 写法：

```json
{
  "tool": "docx_builtin_search",
  "args": {
    "data": {
      "search_key": "Q4",
      "count": 10
    },
    "useUAT": true
  }
}
```

新命令层写法：

```json
{
  "tool": "run",
  "args": {
    "command": "doc",
    "resource": "document",
    "action": "search",
    "identity": "user",
    "args": {
      "data": {
        "search_key": "Q4",
        "count": 10
      }
    }
  }
}
```

### 发送消息

旧 raw tool 写法：

```json
{
  "tool": "im_v1_message_create",
  "args": {
    "params": {
      "receive_id_type": "chat_id"
    },
    "data": {
      "receive_id": "oc_xxxxx",
      "msg_type": "text",
      "content": "{\"text\":\"hello\"}"
    }
  }
}
```

新命令层写法：

```json
{
  "tool": "run",
  "args": {
    "command": "chat",
    "resource": "message",
    "action": "create",
    "identity": "tenant",
    "args": {
      "params": {
        "receive_id_type": "chat_id"
      },
      "data": {
        "receive_id": "oc_xxxxx",
        "msg_type": "text",
        "content": "{\"text\":\"hello\"}"
      }
    }
  }
}
```

## 推荐迁移路径

1. 用 `run` 替换 raw tool 调用
2. 用 `ls` 替换 raw tool 枚举 / 猜测
3. 用 `help` 替换 prompt 中的参数硬编码猜测
4. 用 `explain` 替换零散的错误解释和重试逻辑

建议的迁移检查清单：

1. 更新 system prompt / skill，让其理解 `command/resource/action`
2. 更新文档、示例、fixture 中的 raw tool 名称
3. 在当前 `-t/--tools` 配置下，用 `ls` 验证目标命令是否可见
4. 对每个迁移后的动作，确认返回结果中的 `cite.raw_tool` 符合预期

## 迁移后常见错误

### `No matching command target found`

原因：

- `command/resource/action` 写错了
- 当前 preset 或 `-t/--tools` 没有启用对应 raw 能力

建议：

1. 先跑 `ls`
2. 再用 `help` 缩小范围
3. 如有需要，启用更完整的 preset，例如 `preset.doc.default`、`preset.task.default`、`preset.calendar.default`

### 权限或 token 错误

原因：

- `user_access_token` 过期
- OAuth scope 不足
- 身份模式选错

建议使用 `explain`：

```json
{
  "target": "doc.document.search",
  "error": "Current user_access_token is invalid or expired"
}
```

或者：

```json
{
  "target": "perm.permission-member.transfer-owner",
  "error": "{\"code\":99991663,\"msg\":\"user_access_token unauthorized\"}"
}
```

`explain` 应作为默认解释入口，用于处理：

- token 无效 / 过期
- 权限 scope 缺失
- tenant / user 身份不匹配
- 下一步该看 `help` 还是切换身份

### 结果结构与旧版不一致

原因：

- 客户端仍把顶层结果当成 raw 响应体来解析

建议：

- 业务数据改从 `data` 字段读取
- 如仍需追溯旧 raw tool，可读 `cite.raw_tool`

## 验证建议

迁移完成后，至少确认以下几项：

1. `ls` 能列出预期命令树
2. `help(target=...)` 能解析每个迁移目标
3. `run(...)` 返回 `ok`、`target`、`cite.raw_tool`
4. `explain(...)` 能对 token / 权限失败给出可执行建议
