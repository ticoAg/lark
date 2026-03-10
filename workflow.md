# Lark 工作流

本文档定义 `./lark` 工作区内的标准工作流，目标是让任意一次中断后的恢复都能通过 `tasks/` 文档快速接手。

## 单一事实来源（SSoT）

- 里程碑状态以 `tasks/milestones/*.md` 的 YAML metadata（frontmatter `status`）为准。
- `tasks/roadmap.md` 是聚合视图：用 `scripts/taskctl.py sync-roadmap` 同步；避免在两处分别手工修改状态导致漂移。
- 建议每次更新任务文档后跑一次 `python3 scripts/taskctl.py lint` 做一致性检查。

## 初始化顺序

每次进入 `./lark` 场景时，按以下顺序阅读：

1. `AGENTS.md`
2. `workflow.md`
3. 若任务涉及 CI / release / npm 发布，先看 `ci.md`
4. `tasks/roadmap.md`
5. `tasks/progress.md`
6. `tasks/blockers.md`
7. 当前进行中的 `tasks/milestones/*.md`

## 执行流程

### 1. 领取阶段
- 确认当前里程碑卡的目标、验收标准、依赖与状态。
- 若没有正在进行中的里程碑，则从 `roadmap.md` 中选择最靠前的未完成项并更新状态（更新里程碑卡，再同步 `roadmap.md`）。
- 允许多个里程碑并行 `in_progress`，但必须在 `tasks/progress.md` 顶部“当前状态快照”中声明唯一的 `focus` 里程碑（主线）与 `active` 列表（并行项）。

### 2. 开始实现前
- 在对应里程碑卡中写明：
  - 当前要做的子任务
  - 当前状态改为 `in_progress`
  - 任何新的实现假设
- 如有阶段边界变化，同步更新 `roadmap.md`。

### 3. 实现过程中
- 每完成一批可描述改动后，立刻向 `tasks/progress.md` 追加一条日志，格式固定：
  - 时间
  - 里程碑
  - 已完成内容
  - 下一步
  - 阻塞 / 风险（若有）
- 日志标题建议使用 `## YYYY-MM-DD HH:MM <标题>`；历史条目允许只写日期，但新条目尽量写到时分，便于区分先后。
- 单条日志只归属一个里程碑；若一次改动涉及多个里程碑，拆成多条分别记录。
- 如果发现原计划需要拆分或合并任务，先更新里程碑卡再继续代码。
- 任何“会阻塞推进”的问题，除写入日志外，还要同步到 `tasks/blockers.md`。

### 4. 完成一个里程碑时
- 在里程碑卡中补齐：
  - 已完成实现项
  - 验证结果
  - 未完成但有意后移的项
- 在 `roadmap.md` 中把该里程碑标记为 `done`，并把下一个里程碑标为 `next` 或 `in_progress`。
- 在 `progress.md` 中记录阶段完成总结。


## 归档流程

### 何时归档
- 里程碑状态为 `done` 且连续 7 天无更新（或明确标注“不再增补”）时，归档里程碑卡。
- `progress.md` 超过活跃窗口时，按月切分到 `archive/progress/`（阈值：超过约 200 行或超过约 40 条日志）。
- 决策文档被后续方案明确替代时，归档旧文档并在索引中保留引用。
- 归档前可先运行 `python3 scripts/taskctl.py archive candidates` 查看候选项（只读，不会自动移动文件）。

### 归档步骤
1. 更新对应里程碑或进度文档，确认状态已经稳定。
2. 将已完成里程碑卡移动到 `tasks/archive/milestones/`。
3. 在 `tasks/archive-index.md` 中增加摘要、归档路径和必要的替代说明。
4. 在 `roadmap.md` 中仅保留该里程碑的一行摘要，不把归档内容留在活跃目录。
5. 如归档的是进度或决策，同时在 `progress.md` 或当前决策文档中留下最近一次指针。

### 活跃目录约束
- `tasks/milestones/` 只保留 `in_progress`、`next` 或近期会继续增补的里程碑。
- `tasks/progress.md` 顶部永远保持“当前状态、最近完成、下一步、阻塞”易读。
- `tasks/blockers.md` 只保留仍未关闭的阻塞项；关闭的阻塞可移入归档或保留但标记为 `closed`。
- `archive/` 只负责存历史，不参与默认初始化阅读顺序。

## 文档职责

- `tasks/roadmap.md`
  - 只维护阶段拆分、优先级、状态总览、阶段目标。
- `tasks/progress.md`
  - 只维护时间序列进度，便于恢复上下文。
- `tasks/milestones/*.md`
  - 维护单阶段的具体任务、验收标准、实现备注、风险和当前状态。

## 设计决策要求

凡是影响以下内容的变更，都要落在里程碑卡里：
- 外部工具接口名
- 命令层 schema
- 帮助系统交互模型
- cite 结构
- 身份策略默认值
- Skill 与 MCP 的职责边界

## 恢复原则

如果任务中断，新的执行者应当只依赖以下信息即可恢复：
- `progress.md` 最近 5 条
- 当前 `in_progress` 里程碑卡
- `blockers.md` 中仍为 `open` 的阻塞项
- 相关代码现状

若恢复时发现文档与代码不一致，应优先修正文档，再继续实现。

## 异常流程（回退 / 推翻 / 拆分）

- 若里程碑需要从 `in_progress` 回退到 `next/planned`：先在里程碑卡写清“回退原因 + 现状 + 重新进入条件”，再同步 `roadmap.md`，并在 `progress.md` 记录一次回退日志。
- 若发现方案不可行需要推翻：在当前里程碑卡追加“Decision/Why/Impact/Next”，必要时新开里程碑卡承接替代方案；旧里程碑在卡内写清暂停点，并在 `tasks/blockers.md` 增加阻塞项。
- 若文档与代码不一致：先补一条 `progress.md` 日志说明偏差，再修正文档（优先），最后再继续实现或修代码。

## Monorepo 协作（lark-openapi-mcp / lark-skill）

- 任何影响对外命令层接口（command/resource/action/schema/help/cite）的改动，必须同步更新 `lark-skill/lark-mcp/SKILL.md` 与相关 README/示例。
- 当前默认维护仓库是 `ticoag/lark`；如需追溯来源，在文档中保留 `lark-openapi-mcp <- larksuite/lark-openapi-mcp` 与 `lark-skill <- whatevertogo/FeiShuSkill` 的声明。
