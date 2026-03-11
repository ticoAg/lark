# 0.5.8
- Fix: 在 publish job 中恢复 checkout，确保版本校验脚本与仓库元数据在 artifact 下载后的发布阶段仍可用
- Chore: 持续验证共享 checks + 纯 OIDC trusted publishing 的真实发包链路

- Fix: Restore checkout in the publish job so version-verification scripts and repository metadata remain available after downloading the package artifact
- Chore: Continue validating the real publish pipeline with shared checks plus pure OIDC trusted publishing

# 0.5.7
- Fix: 移除 publish job 中多余的 `npm install -g npm@latest` 步骤，避免在 artifact 下载前因为工作目录不存在而提前失败
- Chore: 继续沿用纯 OIDC trusted publishing 与共享 checks workflow，验证真实发包链路

- Fix: Remove the extra `npm install -g npm@latest` step from the publish job so it no longer fails before the artifact download due to a missing working directory
- Chore: Keep the pure OIDC trusted publishing path and shared checks workflow while re-validating the real publish pipeline

# 0.5.6
- Fix: 切回纯 OIDC trusted publishing，移除 publish token fallback，避免 npm publish 回退到 `EOTP`
- Chore: 抽取共享 workflow `lark-openapi-checks.yml`，让 `CI` 与 `Publish npm Package` 复用同一套 package checks
- Chore: 将 publish job 提升到 Node 24 并升级最新 npm CLI，以满足 npm trusted publishing 运行时要求

- Fix: Return to pure OIDC trusted publishing and remove the publish-token fallback so npm publish no longer falls back to `EOTP`
- Chore: Extract a shared workflow `lark-openapi-checks.yml` so `CI` and `Publish npm Package` reuse the same package checks
- Chore: Move the publish job to Node 24 and upgrade npm CLI to satisfy npm trusted publishing runtime requirements

# 0.5.5
- Fix: npm 发布 workflow 在 `Publish to npm` 步骤增加 `NPM_TOKEN` fallback，覆盖 trusted publishing 首发包或 OIDC 尚未就绪场景
- Chore: 同步根 README、包 README、CI 指南与任务文档中的发布说明

- Fix: Add `NPM_TOKEN` fallback to the npm publish workflow so first-package release or not-yet-ready OIDC trusted publishing can still publish successfully
- Chore: Sync the root README, package README, CI guide, and task docs with the updated release path

# 0.5.4
- Chore: 进行 `@ticoag/lark-mcp` 的首次人工 npm 发布，为后续 trusted publishing 建立包入口
- Fix: 对齐当前 monorepo / CI 修复后的发布版本与源码状态

- Chore: Perform the initial manual npm publish for `@ticoag/lark-mcp` so trusted publishing can be configured afterward
- Fix: Align the published release version with the current monorepo and CI fixes

# 0.5.3
- Fix: GitHub Actions 中 `npm ci` 触发 `prepare` 导致 OOM，改为 install 阶段忽略 scripts 并在显式步骤中构建
- Fix: `pack:check` 与 publish 改为 `--ignore-scripts`，避免重复触发 `prepare`

- Fix: Avoid OOM in GitHub Actions by running `npm ci --ignore-scripts` and building explicitly in later steps
- Fix: Run pack and publish with `--ignore-scripts` to avoid duplicate `prepare` execution

# 0.5.2
- Chore: 将仓库收口为 `ticoag/lark` monorepo，并统一 MCP 与 Skill 文档入口
- Chore: npm 包发布口径切换为 `@ticoag/lark-mcp`
- Chore: 新增 GitHub Actions CI、npm publish workflow 与 coding agent 的 `ci.md` 指南

- Chore: Consolidate the workspace into the `ticoag/lark` monorepo and align MCP/Skill docs
- Chore: Switch the npm package distribution to `@ticoag/lark-mcp`
- Chore: Add GitHub Actions CI, npm publish workflow, and the coding-agent `ci.md` guide

# 0.5.1
- Fix: 修复login再次登录的时候没有正确唤起授权

- Fix: Resolved the issue where the authorization process was not properly triggered during re-login.

# 0.5.0
- Feat: 使用Login登录会自动用浏览器打开登录链接，且login不在会判断是否已经登录，再次登录会直接用新的token覆盖旧的token
- Fix: SSE/Streamable 模式下未开启oauth错误需要鉴权流程的问题
- Chore：优化鉴权失败的文案，和 keytar 不可用时的文案
- Chore: 同步最新Open API, 移除了Helpdesk部分不可用的API

- Feat: Using Login to log in will automatically open the login link in the browser, and if login is not present, it will check whether you have already logged in. Logging in again will directly overwrite the old token with a new one.
- Fix: The issue where the unopened oauth error in SSE/Streamable mode requires an authentication process.
- Chore: Optimize the copy for authentication failure and the copy when keytar is unavailable.
- Chore: Sync the latest Open API.

# 0.4.1
Fix: 开放平台开发文档检索 MCP 错误需要鉴权流程的问题
Fix: Fixed authentication process issue in Open Platform Development Documentation Retrieval MCP 

# 0.4.0
Feat: 新增 StreamableHttp 的传输模式
Feat: StreamableHttp/SSE 支持 [MCP Auth](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
Feat: Stdio（本地） 模式支持 login 和 logout 命令登录登出和自动使用 refresh_token 刷新
Fix: 修复 TokenMode=Auto 模式下没有设置UserAccessToken且CallTool传递参数useUAT=true依然使用应用身份
Bump： 升级 @modelcontextprotocol/sdk 到 1.12.1
BREAK: 由于升级了 @modelcontextprotocol/sdk，最低兼容 Node 版本调整为 Node 20

Feat: Added StreamableHttp transport mode
Feat: StreamableHttp/SSE supports [MCP Auth](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
Feat: Stdio (local) mode supports login and logout commands for authentication and automatic refresh_token renewal
Fix: Fixed issue where TokenMode=Auto would still use app identity when UserAccessToken is not set but CallTool parameter useUAT=true
Bump: Upgraded @modelcontextprotocol/sdk to 1.12.1
BREAK: Due to @modelcontextprotocol/sdk upgrade, minimum compatible Node version is now Node 20


# 0.3.1
Fix: 修复使用 configFile 配置 mode 参数不生效的问题
Fix: 修复由于使用了z.record(z.any())类型的字段导致直接传给豆包模型无法使用的问题
Feat: 新增 preset.light 预设

Fix: Fix the problem that the mode parameter configured by configFile does not take effect
Fix: Fix the problem that the z.record(z.any()) type field is passed directly to the doubao model and cannot be used
Feat: Add preset.light preset

# 0.3.0

New: 开放平台开发文档检索 MCP，旨在帮助用户输入自身诉求后迅速检索到自己需要的开发文档，帮助开发者在AI IDE中编写与飞书集成的代码
New: 新增--token-mode，现在可以在启动的时候指定调用API的token类型，支持auto/tenant_access_token/user_access_token
New: -t 支持配置 preset.default preset.im.default preset.bitable.default preset.doc.default 等默认预设
Bump： 升级 @modelcontextprotocol/sdk 到 1.11.0

New：Retrieval of Open Platform Development Documents in MCP aims to enable users to quickly find the development documents they need after inputting their own requirements, and assist developers in writing code integrated with Feishu in the AI IDE.
New: Added --token-mode, now you can specify the API token type when starting, supporting auto/tenant_access_token/user_access_token
New: -t supports configuring preset.default preset.im.default preset.bitable.default preset.doc.default etc.
Bump: Upgraded @modelcontextprotocol/sdk to 1.11.0

# 0.2.0

飞书/Lark OpenAPI MCP 工具，可以帮助你快速开始使用MCP协议连接飞书/Lark，实现 Agent 与飞书/Lark平台的高效协作

Feishu/Lark OpenAPI MCP tool helps you quickly start using the MCP protocol to connect with Feishu/Lark, enabling efficient collaboration between Agent and the Feishu/Lark platform
