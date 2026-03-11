---
schema: lark-blockers-v1
updated: 2026-03-11T18:42+08:00
---

# 活跃阻塞项（Blockers）

维护当前仍未关闭的阻塞/风险，便于恢复与追踪；建议用 `scripts/taskctl.py blockers` 系列命令更新。

状态约定：`open` / `mitigated` / `closed`

| id | status | since | owner | milestone | note |
|---|---|---|---|---|---|
| npm-publish-eotp | open | 2026-03-11 18:20 +08:00 | ticoag | 07 | `Publish npm Package` 运行 `22933555027` 已验证 404 问题消失，但 publish job 因 Node 20 / npm 10 未满足 trusted publishing 运行时要求而回退到 `NPM_TOKEN`，最终触发 `EOTP`；已改为纯 OIDC + Node 24，待下一个 tag run 验证。 |
