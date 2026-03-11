---
schema: lark-milestone-v1
id: 07
slug: monorepo-release-and-docs
status: done
deps: [05, 06]
owner: ticoag
updated: 2026-03-11T11:42+08:00
---

# 里程碑 07 - Monorepo 发布与文档收口

## 目标

将父级 `lark` 收口为唯一仓库，统一 MCP 与 Skill 的发布、文档、README、GitHub 配置与 upstream/fork source 声明。

## 实现项

- [x] 新增根 README 与根 `.gitignore`
- [x] 将 `lark-openapi-mcp` 发包口径切到 `@ticoag/lark-mcp`
- [x] 将 Skill 主品牌统一为 `lark-skill`
- [x] 保留 `fork source` / `development based on` 声明
- [x] 初始化父级 git 并移除子目录 `.git`

## 验收标准

- [x] 根 `README.md` 能解释 monorepo 结构、上手路径、迁移说明与 upstream 来源
- [x] `lark-openapi-mcp` README / package / docs 对外统一使用 `@ticoag/lark-mcp`
- [x] `lark-skill` README / SKILL / reference 不再把自己描述为独立 GitHub 仓库，但保留来源声明
- [x] 父级 `lark` 成为唯一 git 根；`lark-openapi-mcp/.git` 与 `lark-skill/.git` 被移除
- [x] 全仓搜索旧口径时，仅保留 upstream/source 声明和必要的历史记录

## 实现备注

- `lark-openapi-mcp` 的 upstream 保留为 `larksuite/lark-openapi-mcp`
- `lark-skill` 的 development based on / fork source 保留为 `whatevertogo/FeiShuSkill`
- CLI 名保持 `lark-mcp`，不改运行时 facade 工具名 `ls/help/run/explain`

## 本次完成

- 新增根 README、根 `.gitignore`、根 `.github/ISSUE_TEMPLATE/lark-mcp-auto-failure.md` 与根 `issue-drafts/README.md`，将 GitHub 配置收口到 monorepo 根目录。
- 新增根 `LICENSE`，以 monorepo 视角补齐 MIT 许可与主要版权归属说明。
- 将 `lark-openapi-mcp` 的对外发包与文档口径统一到 `@ticoag/lark-mcp`，并在 README / recall 文档中明确 fork source 为 `larksuite/lark-openapi-mcp`。
- 将 Skill 主品牌统一为 `lark-skill`，在 README / `SKILL.md` / issue reference 中改为单仓库分流，同时保留 development based on `whatevertogo/FeiShuSkill` 声明。
- 初始化父级 git，并删除 `lark-openapi-mcp/.git`、`lark-skill/.git`、`lark-skill/.github`、`lark-skill/issue-drafts`。

## 验证

- 通过全文检索确认旧包名与旧独立仓库地址只保留在 upstream/source 声明中
- 通过 `npm run build`
- 通过 `npx jest tests/auth/store.test.ts tests/command-surface/command-surface.test.ts tests/command-surface/default-registry.test.ts tests/mcp-server/shared/init.test.ts tests/mcp-tool/mcp-tool.test.ts --runInBand`

## 维护记录

- 2026-03-11：修复 GitHub Actions 中 `lark-openapi-mcp` 的 `tsc` OOM；在 `CI` 与 `Publish npm Package` workflow 的对应 job 注入 `NODE_OPTIONS=--max-old-space-size=4096`，并同步更新 CI / release 文档说明。
- 2026-03-11：针对 `@ticoag/lark-mcp@0.5.4` 首次 tag 发布的 npm 404，将 `Publish to npm` 步骤改为“优先 trusted publishing，存在 `NPM_TOKEN` secret 时允许自动 fallback 到 token”；同步更新根 README、包 README 和 `ci.md` 的发布说明。
- 2026-03-11：端到端执行 `0.5.5` 发版验证；确认新 workflow 已消除 npm 404，但当前 GitHub Secret `NPM_TOKEN` 在真实 publish 时返回 `EOTP`，需更换为 automation/granular publish token，或回到纯 trusted publishing 路径。
- 2026-03-11：根据 npm 官方 trusted publishing 文档，将 publish workflow 收口为纯 OIDC：去掉 publish token fallback，publish job 切到 Node 24，并补充 package `publishConfig` 与文档说明；后续以新 tag 验证是否彻底摆脱 `EOTP`。
- 2026-03-11：新增共享 workflow `lark-openapi-checks.yml`，让 `CI` 与 `Publish npm Package` 复用同一套 package checks 实现；publish workflow 通过 artifact 承接已校验构建产物，减少 workflow 实现层面的重复。
- 2026-03-11：连续用 `0.5.6` / `0.5.7` / `0.5.8` 验证纯 OIDC 发布路径，依次清掉 publish job 自身的工作目录与脚本依赖问题；在 `0.5.8` 中已成功触达真实 `npm publish`，当前剩余阻塞收敛为 npm trusted publisher / package permission 侧的 `E404`。
- 2026-03-11：按 `0.5.5` 口径通过 `workflow_dispatch` 成功发布；根因确认是 npm Trusted Publisher 中 GitHub 仓库大小写不匹配，修正为 `ticoAg/lark` 后，`Publish npm Package` 运行 `22935498185` 已成功完成 OIDC publish。
