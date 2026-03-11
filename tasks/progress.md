---
schema: lark-progress-v1
updated: 2026-03-11T19:11:00+08:00
focus: completed
active: []
blockers: []
---

# Lark 实时进度

## 当前状态快照（用于恢复）

- 当前 focus：全部活跃里程碑已完成
- 并行 active：无
- 最近完成：端到端验证到 `0.5.8`，已经把 publish workflow 自身的 token/EOTP、工作目录、脚本缺失问题全部排除
- 下一步：核对 npm 后台 trusted publisher 与 `@ticoag/lark-mcp` 的绑定细节，重点确认仓库/工作流映射与权限是否真正生效
- 阻塞：`0.5.8` 的 `Publish npm Package` 已经在纯 OIDC 路径下执行到真实 `npm publish`，但 npm 仍返回 404 权限类错误，说明剩余问题在 npm trusted publisher / package permission 侧，而不是 workflow 本身

## 2026-03-11 19:11 纯 OIDC 发布已触达真实 npm 权限错误
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：连续通过 `0.5.6`、`0.5.7`、`0.5.8` 三轮真实 tag 验证，逐步修复 publish workflow 自身问题：先移除多余的 `npm install -g npm@latest`，再为 publish job 恢复 checkout，最终在 `0.5.8` 的 `Publish npm Package` 运行 `22934778508` 中成功跑通共享 checks、artifact 下载、tag/version 校验，并实际执行 `npm publish --provenance --access public`。
- 下一步：回到 npm 后台检查 `@ticoag/lark-mcp` 的 trusted publisher 绑定是否与当前 GitHub 仓库/工作流完全一致，并确认该 package 确实允许 `ticoAg/lark` 通过 OIDC 发布；必要时删除并重新创建 trusted publisher 绑定后，再发下一版本验证。
- 阻塞 / 风险：`22934778508` 的 publish 日志显示 provenance 已生成并写入 transparency log，但最终返回 `npm ERR! code E404` / `The requested resource '@ticoag/lark-mcp@0.5.8' could not be found or you do not have permission to access it.`；这表明当前剩余问题位于 npm 权限或 trusted publisher 绑定，而不是本仓 workflow 逻辑。

## 2026-03-11 18:51 共享 CI / Publish checks
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：新增 `.github/workflows/lark-openapi-checks.yml` 作为共享 package checks workflow，统一 `npm ci`、`build`、`test:ci`、`pack:check`；将 `.github/workflows/ci.yml` 改为复用该 workflow，并保留 `repo guardrails`；将 `.github/workflows/publish-npm.yml` 改为先跑共享 checks、上传 publish artifact，再在独立 publish job 中下载 artifact、校验版本并通过 OIDC 发包；同步更新 `ci.md`、根 `README.md` 与 `lark-openapi-mcp/README*.md` 的说明。
- 下一步：推送后发新版本 tag，确认共享 checks 与纯 OIDC publish 一起工作正常。
- 阻塞 / 风险：当前重构主要是“去重实现”，`push main` 与 `push tag` 仍会分别触发 `CI` 和 `Publish npm Package`；这是保留的策略冗余，不是触发误配。

## 2026-03-11 18:42 切回纯 trusted publishing 路径
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：结合 npm 官方文档与 `0.5.5` 远端日志，确认 trusted publishing 要求 npm CLI `11.5.1+` 与 Node `22.14.0+`，且 npm 会先尝试 OIDC、失败后才回退到 token；因此将 publish workflow 改为纯 OIDC 路径：移除 `Publish to npm` 的 `NODE_AUTH_TOKEN`，将 publish job Node 版本提升到 `24`，并在 `package.json` 增加 `publishConfig`；同步更新 `ci.md`、根 `README.md` 与 `lark-openapi-mcp/README*.md` 的发布说明。
- 下一步：推送后发新版本 tag，观察 publish run 是否不再触发 `EOTP`，并能直接通过 OIDC 发布。
- 阻塞 / 风险：npm 后台 trusted publisher 的 workflow filename 必须与 `publish-npm.yml` 完全一致；当前未再次做远端验证，仍需下一次 tag run 闭环。

## 2026-03-11 18:23 真实发版验证命中 EOTP
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：将版本推进到 `0.5.5`，补充 changelog，完成本地 `npm ci`、`build`、`test:ci`、`pack:check`、`taskctl.py lint` 与 `verify_npm_release.py`；提交 `fc9e3a2`、推送 `lark-openapi-mcp-v0.5.5`，远端 `CI` 运行 `22933555056` 全部通过。
- 下一步：替换 GitHub Secret `NPM_TOKEN` 为不要求交互式 OTP 的 automation / granular publish token，或在 npm 后台完成 trusted publishing 后再发下一个版本。
- 阻塞 / 风险：`Publish npm Package` 运行 `22933555027` 在 `Publish to npm` 步骤通过了 build/test/pack 和 provenance 生成，但最终报错 `npm ERR! code EOTP`；npm registry 当前公开版本仍为 `0.5.4`。

## 2026-03-11 17:35 npm 发布增加 token fallback
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：复盘 `Publish npm Package` 运行 `22918024168`，确认失败点在 `Publish to npm` 步骤对 `@ticoag/lark-mcp` 返回 npm `E404`；将 `.github/workflows/publish-npm.yml` 的发布步骤补充 `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`，使 npm CLI 继续优先使用 GitHub OIDC trusted publishing，但在 OIDC 尚未就绪时可回退到 token；同步更新 `ci.md`、根 `README.md` 与 `lark-openapi-mcp/README*.md` 的说明。
- 下一步：在 GitHub 仓库配置 `NPM_TOKEN` secret，并使用新的版本 tag 重新验证 Actions 发布链路。
- 阻塞 / 风险：当前无法在本地直接验证 GitHub Actions secret 和 npm 后台 trusted publisher 绑定状态；修复需依赖远端下一次 publish run 才能闭环。

## 2026-03-11 17:28 首次人工 npm 发布执行
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：将 `lark-openapi-mcp` 版本推进到 `0.5.4`，补充首发 changelog；本地完成 `build`、`test:ci`、`pack:check`、`verify_npm_release.py` 校验；使用新的 npm 发布 token 执行 `npm publish --access public`，npm CLI 返回 `+ @ticoag/lark-mcp@0.5.4`。
- 下一步：继续确认 npm 公网 registry 中 `@ticoag/lark-mcp` 的可见性；若确认成功，再把 trusted publishing 切换为后续默认路径；另外排查本机 `git push origin main` 卡住，补推 `ff58b40` 和 `lark-openapi-mcp-v0.5.4`。
- 阻塞 / 风险：发布后立刻执行的 `npm view @ticoag/lark-mcp version` 与 `https://registry.npmjs.org/@ticoag%2flark-mcp` 仍返回 404，暂时无法从公网接口验证首发结果。

## 2026-03-11 16:20 修复 GitHub Actions 构建 OOM
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：定位到最近失败的 `CI` 与 `Publish npm Package` 都在 `npm run build` 阶段触发 Node `JavaScript heap out of memory`；为 `.github/workflows/ci.yml` 与 `.github/workflows/publish-npm.yml` 的 `lark-openapi-mcp` / `publish` job 注入 `NODE_OPTIONS=--max-old-space-size=4096`；同步更新 `ci.md`、根 `README.md` 与 `lark-openapi-mcp/README*.md` 的说明。
- 下一步：推送后重新查看 GitHub Actions 运行结果，确认 build / test / pack 阶段都恢复通过。
- 阻塞 / 风险：当前修复针对 GitHub Actions 的默认 Node 堆上限；若后续 TypeScript 编译规模继续增长，仍需评估进一步拆分编译或优化 tsconfig。

## 2026-03-11 02:12 增加 CI 指南文档
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：新增根 `ci.md`，明确 CI workflow、publish workflow、tag 规则、trusted publishing 前提、本地验证命令、文档同步要求与禁止事项；并在 `README.md`、`AGENTS.md`、`workflow.md` 中增加入口，让 coding agent 在处理 CI / release 时优先阅读。
- 下一步：如需进一步自动化，可再把 changelog/version bump 规则也收敛到同一文档。
- 阻塞 / 风险：无。

## 2026-03-11 02:05 CI 与 npm 发布流程落地
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：新增 `.github/workflows/ci.yml` 与 `.github/workflows/publish-npm.yml`；为 `lark-openapi-mcp/package.json` 增加 `test:ci`、`pack:check` 并将 `prepare` 改为 `npm run build` 以兼容 GitHub Actions 的 `npm ci`；新增 `scripts/verify_npm_release.py` 用于校验 tag/version；在根 `README.md` 与 `lark-openapi-mcp/README*.md` 中补充 CI、release、trusted publishing 与 tag 发布流程说明。
- 下一步：在 npm 后台把 `@ticoag/lark-mcp` 绑定到 GitHub trusted publishing，然后用 `lark-openapi-mcp-vX.Y.Z` tag 试发一个版本。
- 阻塞 / 风险：正式发布仍依赖 npm 侧 trusted publishing 或等效发包凭据的后台配置，本仓内 workflow 已就绪。

## 2026-03-11 01:43 根级许可说明补齐
- 里程碑：07 Monorepo 发布与文档收口（维护）
- 已完成：新增根 `LICENSE`，以 MIT 聚合方式列出 `Lark Technologies Pte. Ltd.`、`whatevertogo` 与 `ticoag`；在根 `README.md` 增加 `License` 章节，明确子目录 `LICENSE` 继续作为各自来源与修改历史的保留依据。
- 下一步：如需进一步增强分发合规，可再补一份 `NOTICE` 或第三方依赖说明。
- 阻塞 / 风险：无。

## 2026-03-11 01:34 Monorepo 发布与文档收口完成
- 里程碑：07 Monorepo 发布与文档收口
- 已完成：新增根 `README.md`、`.gitignore`、根级 `.github/ISSUE_TEMPLATE` 与 `issue-drafts/`；将 `lark-openapi-mcp` 发包名统一为 `@ticoag/lark-mcp`，更新 README / configuration / CLI / preset / recall / Docker 文档；将 Skill 品牌统一为 `lark-skill` 并保留 `whatevertogo/FeiShuSkill` 来源声明；初始化父级 git 并移除 `lark-openapi-mcp/.git`、`lark-skill/.git` 及旧的子仓 GitHub 模板目录。
- 下一步：如需继续对外发布，可补 changelog、提交说明与 npm publish 流程文档。
- 阻塞 / 风险：无。

## 2026-03-11 01:20 启动 monorepo 发布与来源声明收口
- 里程碑：07 Monorepo 发布与文档收口
- 已完成：确认父级 `lark` 目前尚无 `.git`，而 `lark-openapi-mcp/.git` 与 `lark-skill/.git` 仍为独立仓库；梳理出需统一的口径包括 `@ticoag/lark-mcp`、`ticoag/lark`、`lark-skill` 与 upstream/fork source 声明。
- 下一步：先更新 workflow / roadmap / README / Skill 文档，再处理根级 `.github`、issue drafts、父级 git 初始化与子目录 `.git` 清理。
- 阻塞 / 风险：删除子目录 `.git` 会移除本地独立仓库元数据，但这是本次归仓的目标行为。

## 2026-03-11 00:02 Skill 增补 GitHub auto issue 机制
- 里程碑：05 Skill 与文档收束（维护）
- 已完成：在 `lark-skill/lark-mcp/SKILL.md` 与 `lark-skill/README.md` 增加 GitHub auto issue 入口；新增 `lark-skill/lark-mcp/reference/github-issues.md`，定义触发条件、仓库选择、脱敏规则、issue body 模板与 fallback draft 规范；新增 issue 模板与 `issue-drafts` fallback 约定。
- 下一步：如后续要真正自动创建 GitHub issue，可再把 `gh issue create` 或等价调用接入外层 agent 工作流。
- 阻塞 / 风险：当前仅补齐 Skill 约定与仓库模板，尚未在本仓内新增直接执行 GitHub 提单的自动化脚本。

## 2026-03-10 任务初始化
- 里程碑：01 治理文档与任务体系
- 已完成：完成整体方案设计；确定对外仅保留命令层、帮助体系用 `help + cite`、任务文档采用 `roadmap + progress + milestone cards`。
- 下一步：创建 `./lark/AGENTS.md`、`workflow.md`、`tasks/`，随后开始命令层基础设施实现。
- 阻塞 / 风险：无。


## 2026-03-10 命令层基础设施完成
- 里程碑：02 / 03 / 04 / 05（部分）
- 已完成：新增 command-surface 子系统；建立统一 registry、help/ls/explain/result/cite；`initOAPIMcpServer` 已切换为仅注册 facade 工具；新增 `lark_ls` / `lark_help` / `lark_run` / `lark_explain`；补充文档与 skill 为命令层心智。
- 下一步：继续细化全量领域映射质量，补更多高频 explicit overrides，并补充帮助文本/示例覆盖面。
- 阻塞 / 风险：目前全量领域以通用映射为主，少数 raw tool 的 resource/action 命名还可能需要继续人工校准。

## 2026-03-10 验证完成
- 里程碑：06（部分）
- 已完成：通过 `npx tsc -p tsconfig.json --noEmit`；通过 targeted Jest：`tests/command-surface/command-surface.test.ts`、`tests/mcp-server/shared/init.test.ts`、`tests/mcp-tool/mcp-tool.test.ts`。
- 下一步：如需继续扩展，可补更多 command-surface 单测与更多领域的 explicit mapping 测试。
- 阻塞 / 风险：Jest 仍提示存在未关闭异步句柄，需要后续单独排查，但当前目标测试已通过。


## 2026-03-10 归档机制落地
- 里程碑：01（维护）
- 已完成：为 `./lark/tasks` 增加 `archive/` 结构和 `archive-index.md`；将已完成里程碑 `01/02/03` 迁入 `archive/milestones/`；补充 `AGENTS.md` 与 `workflow.md` 的归档规则。
- 下一步：后续只在活跃目录保留进行中和下一阶段里程碑；月度进度超阈值后再切分到 `archive/progress/`。
- 阻塞 / 风险：当前 `progress.md` 体量还小，暂不需要切月归档。

## 2026-03-10 21:57 工作流结构化与脚本化
- 里程碑：01（维护）
- 已完成：统一里程碑状态 SoT（里程碑卡 -> roadmap 聚合）；为 04/05/06 增加 YAML metadata；为 progress 增加“当前状态快照”；新增 `tasks/blockers.md`；新增 `scripts/taskctl.py` 用于 lint/sync/progress/blockers。
- 下一步：用 `scripts/taskctl.py lint` 跑一遍并按提示收敛格式；逐步把后续 progress 日志切到“单里程碑 + 带时分”的格式。
- 阻塞 / 风险：无。

## 2026-03-10 22:11 taskctl 增加归档候选检查
- 里程碑：01 （维护）
- 已完成：新增 taskctl archive candidates（只读）；lint 增加 progress/里程碑归档提醒；workflow.md 补充归档候选命令入口。
- 下一步：如后续归档频繁，可考虑增加 archive --apply 自动移动与更新索引。
- 阻塞 / 风险：无。

## 2026-03-10 22:44 默认 facade 补齐关键领域
- 里程碑：04 全量领域映射与 cite 统一
- 已完成：扩展默认 preset 到 `drive.folder.create`、`perm.permission-member.transfer-owner`、`task.task.create` / `patch`、`calendar.calendar.primary` / `calendar.calendar-event.create`；为 `chat/group/base/wiki/calendar/task` 增加代表性 explicit override；新增 `tests/command-surface/default-registry.test.ts` 覆盖默认 facade 领域集合。
- 下一步：如需继续做 04 维护，优先补更多 help/ls 示例或归档 04 里程碑卡。
- 阻塞 / 风险：无。

## 2026-03-10 22:49 Skill 与 README 收束
- 里程碑：05 Skill 与文档收束
- 已完成：修正 `lark-skill/lark-mcp/SKILL.md` 的 `drive folder create` action；补任务、日历示例；重写 `lark-skill/README.md` 为 4 个 facade 工具心智，并明确 legacy/raw reference 边界；同步更新 `lark-openapi-mcp` README 与 preset 文档。
- 下一步：如后续无新增示例需求，可将 05 里程碑卡移入归档候选。
- 阻塞 / 风险：无。

## 2026-03-10 22:56 Open handles 复核
- 里程碑：06 回归测试与收尾
- 已完成：再次通过 `npx tsc -p tsconfig.json --noEmit` 与 targeted Jest；补跑 `--detectOpenHandles` 后确认当前测试组合会挂住；用 `lsof` 检查 hanging Jest 进程，观察到 `keytar.node`、`fsevents.node` 和 `storage.json` 文件描述符，但未见额外监听端口。
- 下一步：缩小 open handles 来源，优先从 native 模块 / 存储层 / 全局 import 副作用切分排查；随后补迁移说明。
- 阻塞 / 风险：`jest-open-handles` 仍未关闭，继续阻塞 06 收尾。

## 2026-03-10 23:18 06 收尾完成
- 里程碑：06 回归测试与收尾
- 已完成：为 `AuthStore` watcher 增加 `unref()`，使 `require('./src/mcp-tool/mcp-tool')` 后不再保留 `FSWatcher` 活动句柄；`--runInBand` 与 `--detectOpenHandles` 均可正常退出；新增中英文命令层迁移指南并在 README 中加入入口。
- 下一步：如需继续整理工作区，归档 04/05/06 里程碑卡，并准备提交或发布说明。
- 阻塞 / 风险：无。

## 2026-03-10 23:34 默认改为全量工具面
- 里程碑：06 回归测试与收尾（维护）
- 已完成：将 `LarkMcpTool` 的默认行为改为“未指定 `-t/--tools` 时启用当前构建产物中的全量工具”；同步更新 CLI / README / configuration 文档说明；移除 `~/.codex/config.toml` 中 `lark_openapi_local` 的 `-t`，改为依赖默认全量接口。
- 下一步：重启会话后用新的默认全量工具面验证任务清单、评论、分组等能力。
- 阻塞 / 风险：无。

## 2026-03-10 23:48 Skill 增加分类化典型用法
- 里程碑：06 回归测试与收尾（维护）
- 已完成：在 `lark-skill/lark-mcp/SKILL.md` 中补充“按类别的典型使用方式速查”，覆盖文档/知识库、云空间/权限、消息/群组、多维表格、任务/清单/评论、日历；为每类增加高频动作、高频选项、选择时机与进一步阅读提示。
- 下一步：如需继续完善，可把任务类的更细字段示例或 agents 元数据单独拆到 reference/ 或 `agents/openai.yaml`。
- 阻塞 / 风险：无。

## 2026-03-10 23:59 MCP 命名缩短为 lark + 短工具名
- 里程碑：06 回归测试与收尾（维护）
- 已完成：将 facade 工具名从 `lark_ls/help/run/explain` 改为 `ls/help/run/explain`；将本机 Codex MCP server 名从 `lark_openapi_local` 改为 `lark`，重启后实际调用层会从 `mcp__lark_openapi_local__lark_ls` 收敛为 `mcp__lark__ls`。
- 下一步：重启会话后用新命名验证 `task.tasklist`、`task.comment`、`task.section` 等任务能力。
- 阻塞 / 风险：无。

## 2026-03-10 23:59 旧版 API 默认关闭
- 里程碑：06 回归测试与收尾（维护）
- 已完成：在 `filterTools` 层统一过滤飞书/Lark 标记为 `历史版本（不推荐）/ Deprecated Version (Not Recommended)` 的 raw tool，使其在默认全量模式和显式 `-t/--tools` 下都不可用；同步补测试，确保 `task.task-2` 等旧版重复分支不再暴露。
- 下一步：重启会话后用新的 MCP 进程验证任务域仅保留 v2 主路径，并继续评估任务评论 @ 提及是否需要 facade 适配。
- 阻塞 / 风险：无。

## 2026-03-11 00:07 任务评论 mentions 适配原型
- 里程碑：06 回归测试与收尾（维护）
- 已完成：在 facade 层为 `task.comment.create` 增加 `args.mentions` 适配，支持 `{ user_id, user_id_type? }`，并将其转换为 v2 评论内容中的 `<at id=...></at>` 语法；经真实任务 smoke test 验证，`<at id=open_id></at>` 在 `task.v2.comment.create` 中可以触发真正的 @ 效果。
- 下一步：继续把“评论 mention 前必须先解析用户 ID”的规则下沉到任务模块 reference，避免主 Skill 过度膨胀。
- 阻塞 / 风险：无。

## 2026-03-11 00:22 允许显式放开特定旧版 API
- 里程碑：06 回归测试与收尾（维护）
- 已完成：新增 `--deprecated-tools` / `deprecatedTools` 机制，用于在默认禁用旧版 API 的前提下，显式重新开放特定旧版 raw tool；后续验证后确认 `task.v2.comment.create` 已可通过 `<at id=open_id></at>` 实现真正 @，因此本机 Codex 配置已移除任务评论相关旧版白名单。
- 下一步：仅在确有必要时，再按具体场景放开特定旧版 API。
- 阻塞 / 风险：无。

## 2026-03-11 00:48 Skill 任务模块改为渐进披露
- 里程碑：06 回归测试与收尾（维护）
- 已完成：新增 `lark-skill/lark-mcp/reference/tasks.md`，把任务/清单/评论的高频动作、评论 @ 规则、先解析用户 ID 的要求单独下沉到任务模块 reference；主 `SKILL.md` 仅保留入口与选择规则，避免每次都读完整细节。
- 下一步：如后续还要细化任务域，可继续把 legacy 任务评论与 v2 评论的能力边界补到同一 reference 文件。
- 阻塞 / 风险：无。
