---
schema: lark-blockers-v1
updated: 2026-03-11T18:23+08:00
---

# 活跃阻塞项（Blockers）

维护当前仍未关闭的阻塞/风险，便于恢复与追踪；建议用 `scripts/taskctl.py blockers` 系列命令更新。

状态约定：`open` / `mitigated` / `closed`

| id | status | since | owner | milestone | note |
|---|---|---|---|---|---|
| npm-publish-eotp | open | 2026-03-11 18:20 +08:00 | ticoag | 07 | `Publish npm Package` 运行 `22933555027` 已验证 404 问题消失，但 GitHub Secret `NPM_TOKEN` 在 npm publish 时触发 `EOTP`；需改用 automation/granular publish token，或完成 trusted publishing 绑定后取消对 token 的依赖。 |
