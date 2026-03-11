---
schema: lark-milestone-v1
id: 05
slug: skill-and-docs-alignment
status: done
deps: [03]
owner: ticoag
updated: 2026-03-11T20:52+08:00
---

# 里程碑 05 - Skill 与文档收束

## 目标

把 `lark-skill` 收束为命令层使用策略文档，并更新 README/示例，使其不再依赖 raw tool 心智。

## 实现项

- [x] 重写 `SKILL.md` 的核心交互说明
- [x] 调整 README 强调 command layer
- [x] 保留参考资料但标注 legacy / raw reference 边界
- [x] 增加命令层示例

## 验收标准

- [x] `lark-skill/lark-mcp/SKILL.md` 明确“只走 4 个 facade 工具”（`ls` / `help` / `run` / `explain`）并给出推荐使用顺序
- [x] 至少提供 6 个可直接照抄的 end-to-end 示例（覆盖：文档搜索/导入、云空间创建文件夹、消息发送、权限/所有者变更等）
- [x] legacy / raw reference 的边界清晰标注：允许引用但不作为默认操作入口

## 本次完成

- 修正 `lark-skill/lark-mcp/SKILL.md` 中 `drive folder create` 的 action 名，并补充任务、日历场景示例。
- 重写 `lark-skill/README.md`，把默认心智统一为 `command/resource/action + identity + cite`。
- 明确 legacy/raw reference 仅用于内部映射、调试和 cite 追溯，不作为默认教学入口。
- 维护补充：新增 GitHub auto issue 失败上报机制；在 Skill/README 中加入入口，并新增 `reference/github-issues.md`、GitHub issue 模板和 `issue-drafts/` fallback 约定。
- 维护补充：将 `/Users/ticoag/Downloads/skills/feishu` 中对 agent 理解“如何在当前 monorepo 中接入和使用飞书”有帮助的内容收口到 `lark-skill/lark-mcp/reference/`；新增审批、考勤、日历/会议室、通讯录、云空间、知识库、OAuth、事件订阅等参考页，并在已有文档/消息/权限/多维表格参考页顶部补充命令层入口说明。
- 本轮导入标准以“是否帮助 agent 理解或使用本仓飞书接入”为准：保留权限、限制、工作流、字段/状态说明、常见坑；剔除 NestJS 模块模板、源码内写死凭证、内部 CLI / 插件依赖等与本仓默认路径不匹配的脚手架。

## 验证

- 复核 `lark-skill/lark-mcp/SKILL.md` 只使用 4 个 facade 工具并给出推荐顺序
- 复核 `lark-skill/README.md` 提供 7 个 end-to-end 示例，覆盖文档、云空间、消息、权限、任务、日历
- 通过 `python3 scripts/taskctl.py lint`
