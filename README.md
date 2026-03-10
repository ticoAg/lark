# lark

`lark` 是 `ticoag` 维护的飞书 / Feishu / Lark MCP monorepo，当前包含两个配套子项目：

- `lark-openapi-mcp`：命令式 MCP 实现，提供 `ls` / `help` / `run` / `explain`
- `lark-skill`：配套 Skill 与工作流文档，指导 agent 如何使用 MCP

## Upstream / Fork Sources

| 目录 | 当前角色 | 来源声明 |
| --- | --- | --- |
| `lark-openapi-mcp` | MCP 实现与发布目录 | Fork source: `larksuite/lark-openapi-mcp` |
| `lark-skill` | 配套 Skill 与 reference 目录 | Development based on / fork source: `whatevertogo/FeiShuSkill` |

当前对外维护仓库统一为：`https://github.com/ticoag/lark`

## 仓库结构

```text
lark/
├── lark-openapi-mcp/   # MCP 实现、CLI、文档、测试
├── lark-skill/         # Skill、reference、示例
├── tasks/              # 任务追踪与里程碑
├── scripts/            # 辅助脚本
└── workflow.md         # 工作流约定
```

## 快速开始

### 1. 使用 MCP

安装或直接运行 `lark-openapi-mcp`：

```bash
npx -y @ticoag/lark-mcp mcp -a <app_id> -s <app_secret>
```

如需用户身份访问，先登录：

```bash
npx -y @ticoag/lark-mcp login -a <app_id> -s <app_secret>
```

更详细的安装、配置、OAuth、Docker 与迁移说明见：

- `lark-openapi-mcp/README.md`
- `lark-openapi-mcp/README_ZH.md`
- `lark-openapi-mcp/docs/usage/configuration/configuration.md`

### 2. 使用 Skill

将 `lark-skill/lark-mcp/SKILL.md` 作为配套 Skill 使用。默认工作流是：

1. `mcp__lark__ls`
2. `mcp__lark__help`
3. `mcp__lark__run`
4. `mcp__lark__explain`

更详细的典型用法与 reference 见：

- `lark-skill/README.md`
- `lark-skill/lark-mcp/SKILL.md`

## 迁移说明

本仓库已经从“两个独立 GitHub 仓库”收口为一个 monorepo，当前统一口径如下：

- GitHub 仓库：`ticoag/lark`
- MCP npm 包：`@ticoag/lark-mcp`
- CLI 命令：`lark-mcp`
- Skill 名称：`lark-skill`

兼容性说明：

- MCP facade 工具名仍然是 `ls` / `help` / `run` / `explain`
- `lark-openapi-mcp` 与 `lark-skill` 仍保留各自的子目录结构
- 上游来源声明保留在根 README 与各子项目 README 中，便于追溯

## License

- 根仓库采用 MIT 许可，见 `LICENSE`
- `lark-openapi-mcp` 保留上游及其后续修改的 MIT 许可，见 `lark-openapi-mcp/LICENSE`
- `lark-skill` 保留上游及其后续修改的 MIT 许可，见 `lark-skill/LICENSE`
- monorepo 级 README、来源声明与新增维护文件由 `ticoag` 补充，但不会替换子目录中已有的原始版权与许可声明

## CI / Release

- CI workflow：`.github/workflows/ci.yml`
  - 对 `lark-openapi-mcp` 执行 `npm ci`、`npm run build`、`npm run test:ci`、`npm run pack:check`
  - 对工作区任务文档执行 `python3 scripts/taskctl.py lint`
- npm 发布 workflow：`.github/workflows/publish-npm.yml`
  - 推荐通过 tag 发布：`lark-openapi-mcp-vX.Y.Z`
  - 也支持 `workflow_dispatch` 手动执行，并用 `expected_version` / `dry_run` 做保护
  - 发布前会校验 `lark-openapi-mcp/package.json` 版本与 tag 一致
  - 正式发布命令为 `npm publish --provenance --access public`
- 发布前准备：
  - 在 npm 后台为 `@ticoag/lark-mcp` 配置 GitHub trusted publishing，仓库填 `ticoag/lark`
  - 将 workflow 绑定到 `.github/workflows/publish-npm.yml`
  - 推送版本提交后，再推送 tag `lark-openapi-mcp-vX.Y.Z`
- coding agent 执行指南：`ci.md`

一个推荐的发布顺序：

```bash
# 1. 修改版本与 CHANGELOG
cd lark-openapi-mcp
npm version 0.5.2 --no-git-tag-version

# 2. 本地验证
npm ci
npm run build
npm run test:ci
npm run pack:check

# 3. 提交后打 tag
git add .
git commit -m "release: lark-openapi-mcp v0.5.2"
git tag lark-openapi-mcp-v0.5.2
git push origin main --tags
```

## 开发说明

- 进入 `./lark` 后，先看 `AGENTS.md`、`workflow.md`、`tasks/roadmap.md`、`tasks/progress.md`
- 任务与变更记录统一放在 `tasks/`
- 如需提交 issue 草稿或自动失败报告，使用根目录下的 `.github/ISSUE_TEMPLATE/` 和 `issue-drafts/`
