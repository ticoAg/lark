---
schema: lark-blockers-v1
updated: 2026-03-11T19:11+08:00
---

# 活跃阻塞项（Blockers）

维护当前仍未关闭的阻塞/风险，便于恢复与追踪；建议用 `scripts/taskctl.py blockers` 系列命令更新。

状态约定：`open` / `mitigated` / `closed`

| id | status | since | owner | milestone | note |
|---|---|---|---|---|---|
| npm-trusted-publisher-404 | open | 2026-03-11 19:08 +08:00 | ticoag | 07 | `Publish npm Package` 运行 `22934778508` 已在纯 OIDC 路径下真正执行 `npm publish --provenance --access public`，但 npm 最终返回 `E404` / `could not be found or you do not have permission to access it`；workflow 自身问题已排除，需回到 npm 后台复核 `@ticoag/lark-mcp` 的 trusted publisher 绑定与 package 权限。 |
