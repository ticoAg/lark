---
schema: lark-milestone-v1
id: 04
slug: all-domains-and-cite
status: done
deps: [02, 03]
owner: ticoag
updated: 2026-03-10T22:58+08:00
---

# 里程碑 04 - 全量领域映射与 cite 统一

## 目标

让主要飞书领域都接入统一命令树，并在 help/run 结果中提供一致的 cite 信息。

## 实现项

- [x] 文档 / 云空间 / 消息 / 群组
- [x] 表格 / 知识库 / 联系人 / 权限
- [x] 日历 / 任务 / 其他领域 fallback
- [x] 官方文档链接或官方检索入口映射
- [x] 资源 URL / token 提取与回显

## 验收标准

- [x] registry 覆盖“当前启用 raw tool”所对应的所有一级领域（至少包含：`doc` / `drive` / `chat` / `group` / `base` / `wiki` / `calendar` / `task` / `user` / `perm`）
- [x] help / run 的 cite 字段结构一致（至少包含：`help_target`、`raw_tool`、`docs_url`；可提取时包含 `resource_url` / `resource_tokens`）
- [x] 至少为每个一级领域补齐 1 条高频 explicit override（避免完全依赖通用推导导致命名偏差）

## 本次完成

- 为 `chat` / `group` / `base` / `wiki` / `calendar` / `task` 增加代表性 explicit override，并保留已有 `doc` / `drive` / `perm` / `user` 映射。
- 扩展默认 preset，使 facade 默认可发现并执行 `drive.folder.create`、`perm.permission-member.transfer-owner`、`task.task.create` / `patch`、`calendar.calendar.primary` / `calendar-event.create`。
- 同步更新 preset 文档与 README 的命令层说明，确保对外描述与默认可用能力一致。

## 验证

- 通过 `npx tsc -p tsconfig.json --noEmit`
- 通过 `npx jest tests/command-surface/command-surface.test.ts tests/command-surface/default-registry.test.ts tests/mcp-server/shared/init.test.ts tests/mcp-tool/mcp-tool.test.ts --runInBand`
- 额外用脚本确认默认 registry 命令集合为：`base, calendar, chat, doc, drive, group, perm, task, user, wiki`
