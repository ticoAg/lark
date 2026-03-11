# Lark 改造路线图

状态标记：`done` / `in_progress` / `next` / `planned`

说明：里程碑状态以 `tasks/milestones/*.md` 为准（source of truth），本表为聚合视图；建议用 `scripts/taskctl.py sync-roadmap` 同步。

## 总目标

把 `lark-openapi-mcp` 从 raw OpenAPI 直出工具集，改造成面向 agent 和人类都可理解的命令式飞书能力层，并用 `lark-skill` 承接默认策略与工作流说明。

## 里程碑

| 编号 | 名称 | 状态 | 目标 |
|---|---|---|---|
| 01 | 治理文档与任务体系 | done | 建立 `AGENTS.md`、`workflow.md`、`tasks/`，让后续实现可追踪、可恢复。 |
| 02 | 命令层注册表与帮助系统 | done | 引入统一命令注册表，提供 `lark_ls` / `lark_help` / `lark_run` / `lark_explain`。 |
| 03 | 命令层接管 MCP 对外暴露 | done | MCP 对外仅暴露 facade，raw tool 改为内部执行层。 |
| 04 | 全量领域映射与 cite 统一 | done | 让文档、云空间、消息、表格、权限、日历、任务等领域都进入统一命令树。 |
| 05 | Skill 与文档收束 | done | 将 `lark-skill` 调整为命令层使用策略文档，并补完帮助与示例。 |
| 06 | 回归测试与收尾 | done | 完成测试、验证、迁移说明和遗留清理。 |
| 07 | Monorepo 发布与文档收口 | done | 将父级 `lark` 收口为唯一仓库，统一 `ticoag/lark`、`@ticoag/lark-mcp`、`lark-skill` 与 upstream 声明。 |

## 当前关注点

- 当前 focus：所有活跃里程碑已完成；后续如需继续推进，可进入 commit / release / 归档收尾。
- 命令层对外只保留 facade 工具，不直接暴露 raw OpenAPI tool 名称。
- 帮助体系采用 `help 工具 + 结果内 cite` 方案。
- `lark-skill` 的飞书参考页以“是否帮助 agent 理解当前仓飞书接入”为筛选标准：优先保留命令层入口、权限/限制、工作流与常见坑，避免把不适配本仓的框架脚手架当成默认路径。
