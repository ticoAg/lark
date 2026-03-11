# CI / Release Guide for Coding Agents

本文档给在 `ticoag/lark` 仓库内工作的 coding agent 使用，目标是让 agent 在修改 CI、发包、版本和发布文档时遵循统一流程，避免误发版或破坏 monorepo 约定。

## 适用范围

当前 CI / release 只覆盖：

- `lark-openapi-mcp` 的构建、测试、打包校验
- `@ticoag/lark-mcp` 的 npm 发布

`lark-skill` 目前没有单独的 npm 发布流程。

## 必读文件

在修改 CI / release 前，按下面顺序阅读：

1. `AGENTS.md`
2. `workflow.md`
3. `README.md`
4. `.github/workflows/ci.yml`
5. `.github/workflows/publish-npm.yml`
6. `lark-openapi-mcp/package.json`
7. `lark-openapi-mcp/CHANGELOG.md`

## 当前约定

### 1. Monorepo 结构

- 根仓库：`ticoag/lark`
- npm 包目录：`lark-openapi-mcp`
- npm 包名：`@ticoag/lark-mcp`
- CLI 名称：`lark-mcp`

### 2. Workflow 文件

- CI：`.github/workflows/ci.yml`
- 发布：`.github/workflows/publish-npm.yml`
- 共享校验：`.github/workflows/lark-openapi-checks.yml`

### 3. 版本与 tag 规则

- `package.json` 中的 `version` 是发布单一事实来源
- 发布 tag 必须使用：`lark-openapi-mcp-vX.Y.Z`
- tag 版本必须与 `lark-openapi-mcp/package.json` 中的 `version` 完全一致
- workflow 会通过 `scripts/verify_npm_release.py` 做一致性校验

### 4. 发布方式

默认使用 npm trusted publishing：

- GitHub 仓库：`ticoag/lark`
- workflow：`.github/workflows/publish-npm.yml`
- 正式发布命令：`npm publish --provenance --access public`
- `Publish to npm` 步骤应走 GitHub OIDC trusted publishing，不再依赖 publish token
- npm 官方当前要求 trusted publishing 至少使用 npm CLI `11.5.1+` 与 Node `22.14.0+`；本仓 publish workflow 使用 Node `24`
- `CI` 与 `Publish npm Package` 共享 `lark-openapi-checks.yml` 中的 `npm ci` / `build` / `test:ci` / `pack:check` 逻辑；publish workflow 在 checks job 通过后下载 artifact 再执行真正的 `npm publish`

如需安装私有 npm 依赖，只在 `npm ci` 等安装步骤注入只读 token；不要在 `npm publish` 步骤注入 publish token。

### 5. GitHub Actions Node 内存

- `lark-openapi-mcp` 的 GitHub Actions job 统一注入 `NODE_OPTIONS=--max-old-space-size=4096`
- 原因是 `tsc` 在 `ubuntu-latest` / Node 20 默认堆上限下可能触发 OOM
- 本地开发默认仍直接使用 `npm run build`；只有在本地也复现堆内存不足时，才额外临时加同样的 `NODE_OPTIONS`

## Agent 执行规则

### 可以做的事

- 修改 `.github/workflows/*.yml`
- 修改 `lark-openapi-mcp/package.json` 中与 CI / release 相关的 script
- 修改 `README.md`、`lark-openapi-mcp/README.md`、`lark-openapi-mcp/README_ZH.md`
- 修改 `scripts/verify_npm_release.py`
- 运行本地只读或可重复验证，例如 `npm run build`、`npm run test:ci`、`npm run pack:check`

### 不要直接做的事

- 不要在未确认版本号和 changelog 的情况下创建 release tag
- 不要在未说明影响的情况下修改包名、tag 规则或 workflow 名称
- 不要删除 `--provenance`、`--access public`、版本校验步骤，除非文档同步更新并说明原因
- 不要擅自引入另一套 release 系统（如 changesets / semantic-release）替换现有流程，除非用户明确要求

## 修改 CI 时的检查清单

如果改了 `.github/workflows/ci.yml`，至少确认：

1. `working-directory` 仍然指向 `lark-openapi-mcp`
2. `NODE_OPTIONS=--max-old-space-size=4096` 仍对 `lark-openapi-mcp` job 生效
3. 仍然执行：
   - `npm ci`
   - `npm run build`
   - `npm run test:ci`
   - `npm run pack:check`
4. 根目录的 `scripts/taskctl.py lint` 仍然可运行
5. 没有把 publish 逻辑混到普通 CI workflow

## 修改发布流程时的检查清单

如果改了 `.github/workflows/publish-npm.yml`，至少确认：

1. 触发器仍然覆盖：
   - `push.tags: lark-openapi-mcp-v*`
   - `workflow_dispatch`
2. `NODE_OPTIONS=--max-old-space-size=4096` 仍对 publish job 生效
3. `permissions` 仍包含：
   - `contents: read`
   - `id-token: write`
4. 发布前仍执行：
   - 共享 checks workflow（内部执行 `npm run build` / `npm run test:ci` / `npm run pack:check`）
   - 版本校验
5. 正式发布仍使用：
   - `npm publish --provenance --access public`
6. `Publish to npm` 步骤不应注入 publish token；若仓库有私有依赖，只在安装阶段注入只读 token

## 本地验证命令

在仓库根目录执行：

```bash
python3 scripts/taskctl.py lint
```

在 `lark-openapi-mcp` 目录执行：

```bash
npm ci
npm run build
npm run test:ci
npm run pack:check
```

校验 tag 与版本是否一致：

```bash
python3 scripts/verify_npm_release.py \
  --package lark-openapi-mcp/package.json \
  --tag lark-openapi-mcp-v0.5.1 \
  --prefix lark-openapi-mcp-v
```

## 标准发布顺序

1. 更新 `lark-openapi-mcp/package.json` 中的 `version`
2. 更新 `lark-openapi-mcp/CHANGELOG.md`
3. 运行本地验证
4. 提交代码
5. 确认 npm 后台 trusted publisher 已绑定 `publish-npm.yml`（只填文件名，不填路径）
6. 如需安装私有依赖，额外准备只读 `NPM_READ_TOKEN` 给安装步骤使用；publish 步骤不需要 `NPM_TOKEN`
7. 创建并推送 tag：`lark-openapi-mcp-vX.Y.Z`
8. 等待 GitHub Actions 发布到 npm

## 文档同步要求

如果你修改了 CI / release 规则，同时更新这些文档中的相关部分：

- `README.md`
- `lark-openapi-mcp/README.md`
- `lark-openapi-mcp/README_ZH.md`
- `tasks/progress.md`

如修改了发布约定，也同步更新：

- `tasks/milestones/07-monorepo-release-and-docs.md`

## Upstream / License 注意事项

- `lark-openapi-mcp` fork source: `larksuite/lark-openapi-mcp`
- `lark-skill` development based on: `whatevertogo/FeiShuSkill`
- 不要删除子目录原始 `LICENSE`
- 不要把维护版文档写回“官方发行”口径
