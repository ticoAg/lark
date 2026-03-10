---
schema: lark-milestone-v1
id: 06
slug: tests-and-closeout
status: done
deps: [04, 05]
owner: ticoag
updated: 2026-03-10T23:34+08:00
---

# 里程碑 06 - 回归测试与收尾

## 目标

完成命令层相关测试、验证与收尾文档。

## 实现项

- [x] 单元测试：registry / help / ls / run / explain
- [x] 集成测试：server 初始化与 facade 注册
- [x] 文档同步检查
- [x] 迁移说明 / breaking changes 说明

## 验收标准

- [x] 覆盖关键命令集合的 happy-path + 常见错误分支（至少包含：`doc.document.search`、`doc.document.import`、`drive.folder.create`、`chat.message.create`、`perm.permission-member.transfer-owner`、`user.user.lookup-id`）
- [x] Jest 不再提示“未关闭的异步句柄”（如仍存在，需记录根因与 workaround/修复链接到 `tasks/blockers.md`）
- [x] 迁移说明覆盖：旧 raw 工具面 -> 新命令层的对照、breaking changes、常见错误与 `lark_explain` 使用方式

## 本次完成

- 为 `AuthStore` 的文件监听器增加 `unref()`，避免单例 `authStore` 在测试中因 `FSWatcher` 阻塞 Jest 退出。
- 扩充 `tests/auth/store.test.ts` 的 watcher 覆盖，并修复其 `fs` mock / logger 相关测试稳定性。
- 新增中英文命令层迁移指南，覆盖 raw-to-facade 对照、breaking changes、常见错误及 `lark_explain` 用法；README 同步增加迁移入口链接。
- 将默认工具面切换为“无 `-t` 即全量工具”，并同步更新 CLI / README / configuration 文档；`~/.codex/config.toml` 也改为不再显式传 `-t`。

## 验证

- 通过 `npx tsc -p tsconfig.json --noEmit`
- 通过 `npx jest tests/auth/store.test.ts tests/command-surface/command-surface.test.ts tests/command-surface/default-registry.test.ts tests/mcp-server/shared/init.test.ts tests/mcp-tool/mcp-tool.test.ts --runInBand`
- 通过 `npx jest tests/auth/store.test.ts tests/command-surface/command-surface.test.ts tests/command-surface/default-registry.test.ts tests/mcp-server/shared/init.test.ts tests/mcp-tool/mcp-tool.test.ts --runInBand --detectOpenHandles`
- 通过脚本检查：`require('./src/mcp-tool/mcp-tool')` 后活动句柄不再包含 `FSWatcher`
