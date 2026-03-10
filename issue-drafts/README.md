# Issue Drafts

当 agent 需要为 monorepo `ticoag/lark` 自动提交 GitHub issue，但自动创建失败时，把脱敏后的草稿落到这里再提交。

## 涉及子目录

- `lark-openapi-mcp`
- `lark-skill`

若需追溯上游，请在草稿中补充：

- `lark-openapi-mcp` fork source: `larksuite/lark-openapi-mcp`
- `lark-skill` development based on: `whatevertogo/FeiShuSkill`

## 命名

```text
YYYYMMDD-HHMM-<slug>.md
```

例如：

```text
20260311-0010-task-comment-mention.md
```

## 内容要求

- 基于 `.github/ISSUE_TEMPLATE/lark-mcp-auto-failure.md`
- 必须包含行为、期望结果、调用工具、证据、脱敏说明
- 第一行写清自动创建失败原因，例如 `Auto issue creation failed: gh auth missing`
