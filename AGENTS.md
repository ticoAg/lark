---
language: zh
type: AI Agent Guidance (Repo-Level)
note: Shared rules for ./lark and its child projects.
---

# Lark Workspace Guidelines

本文件作用域覆盖 `./lark/**`，包括：
- `./lark/lark-openapi-mcp`
- `./lark/lark-skill`
- `./lark/tasks`
- `./lark/workflow.md`

## 1. 目标与架构边界

- `lark-openapi-mcp` 是 MCP 主实现目录，负责飞书能力封装、命令层设计、帮助系统、cite 与身份策略。
- `lark-skill` 是配套 Skill 目录，不是底层能力层。Skill 应解释命令层、推荐工作流和默认偏好，不应重新定义底层接口。
- 当前工作区以 `ticoag/lark` 作为唯一 monorepo；`lark-openapi-mcp` fork 自 `larksuite/lark-openapi-mcp`，`lark-skill` 基于 `whatevertogo/FeiShuSkill` 持续开发。
- 对外默认只暴露命令层 facade；raw OpenAPI tool 仅保留为内部执行层、映射层与调试依据。

## 2. 核心原则

### 2.1 Reach-able
- 任何命令节点都必须可追溯到：上级节点、同级相关节点、原始 raw tool、官方文档或官方检索入口。
- 执行结果必须能反向跳回帮助目标或 raw tool 标识。

### 2.2 Gradual Disclosure
- 默认先展示 domain / resource。
- 只有用户或 agent 进一步深入时，才展开 action、参数、示例、错误说明。
- 不要一上来把全量 raw OpenAPI 名称和参数直接暴露给最终使用者。

### 2.3 Cite 双向链接
- help / ls / run / explain 的输出都应包含 cite 信息。
- cite 至少覆盖：`help_target`、`raw_tool`、`docs_url`（或官方检索入口）、`resource_url`（若执行结果可提取）。

## 3. 命令层设计约束

- 统一使用 `[command] [resource] [action]` 三段式心智模型。
- 外部调用参数必须保持结构化，不使用自由字符串命令行解析作为主接口。
- 命令层的 schema、帮助、示例、related、默认身份策略，必须从统一注册表生成，避免多处重复定义。
- 任何新领域接入时，优先扩展注册表与映射，不要直接新增一次性 hardcode prompt 逻辑。

## 4. 身份与权限

- 默认优先考虑用户身份（user preferred），但每个命令必须可显式声明 `user_only` / `tenant_only` / `tenant_preferred`。
- Skill 中涉及“创建后用户要直接可访问”的场景，必须优先推荐用户身份。
- 任何权限不足、token 失效、scope 缺失的处理，都要通过 explain/help 体系给出下一步建议，而不只是透传错误。

## 5. 文档与任务追踪

- 在 `./lark` 下工作时，开始实现前先看：
  1. `./lark/AGENTS.md`
  2. `./lark/workflow.md`
  3. 若任务涉及 CI / release / npm 发布，先看 `./lark/ci.md`
  4. `./lark/tasks/roadmap.md`
  5. `./lark/tasks/progress.md`
  6. `./lark/tasks/blockers.md`
  7. 当前里程碑卡
- 每开始一个实现批次，先更新对应里程碑卡状态。
- 每完成一个可描述的子批次，立即追加 `./lark/tasks/progress.md`。
- 若实现改变了阶段边界、优先级或验收口径，必须同步更新 `./lark/tasks/roadmap.md`。
- 建议用 `scripts/taskctl.py` 做一致性检查与状态同步（`lint` / `sync-roadmap` / `progress` / `blockers`）。


### 5.1 归档机制
- `tasks/` 的活跃层只保留：当前 `in_progress` / `next` 的里程碑、当前滚动进度、当前仍生效的决策。
- 已完成且短期内不再增补的里程碑卡，移入 `./lark/tasks/archive/milestones/`。
- `tasks/progress.md` 只保留当前活跃窗口；归档阈值与切分规则以 `./lark/workflow.md` 为准。
- 被新决策取代的设计说明，应移入 `./lark/tasks/archive/decisions/`，并在新文档中标明替代关系。
- 任何归档动作都必须同步更新 `./lark/tasks/archive-index.md`，避免历史信息可存不可找。
- 默认阅读路径不进入 `archive/`；仅在需要追溯历史方案、验收记录或旧进度时进入。

## 6. 变更风格

- 优先保留 raw OpenAPI 工具的现有数据来源、schema 和 handler，不做无必要重写。
- 新能力优先通过 facade 层叠加，而不是直接侵入 codegen 结果。
- 尽量让帮助、cite、示例、related 等元信息可自动生成；无法自动生成时，再补最小人工 override。
- diff 保持聚焦，避免顺手改 unrelated generated files。

## 7. 验证要求

- 命令层新增或改动后，至少补以下验证：
  - 注册表解析
  - help / ls / run / explain 基本行为
  - raw tool 路由正确性
  - token / 身份策略分支
- 如果只更新 Skill 或文档，也要确保与命令层接口名和输出结构一致。

## 8. 最终交付要求

- 结果说明优先回答：改了什么、为什么、当前进度、下一步是什么。
- 代码改动完成后，必须指出已更新的 `tasks` 文档。
- 若存在未完成里程碑或后续阶段，明确写入当前状态，不要口头承诺而不落文档。
