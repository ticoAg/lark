---
schema: lark-blockers-v1
updated: 2026-03-11T11:42+08:00
---

# 活跃阻塞项（Blockers）

维护当前仍未关闭的阻塞/风险，便于恢复与追踪；建议用 `scripts/taskctl.py blockers` 系列命令更新。

状态约定：`open` / `mitigated` / `closed`

| id | status | since | owner | milestone | note |
|---|---|---|---|---|---|
| npm-trusted-publisher-404 | closed | 2026-03-11 11:30 +08:00 | ticoag | 07 | 根因确认是 npm 后台 Trusted Publisher 中 GitHub 仓库大小写与实际仓库不一致。修正为 `ticoAg/lark` 后，`workflow_dispatch` 运行 `22935498185` 已成功通过 OIDC 发布 `@ticoag/lark-mcp@0.5.5`。 |
