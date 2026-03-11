# Feishu/Lark OpenAPI MCP

[![npm version](https://img.shields.io/npm/v/@ticoag/lark-mcp.svg)](https://www.npmjs.com/package/@ticoag/lark-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@ticoag/lark-mcp.svg)](https://www.npmjs.com/package/@ticoag/lark-mcp)
[![Node.js Version](https://img.shields.io/node/v/@ticoag/lark-mcp.svg)](https://nodejs.org/)

English | [中文](./README_ZH.md)

[Developer Documentation Retrieval MCP](./docs/recall-mcp/README.md)

[Official Document](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_introduction)

[Trouble Shooting](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/use_cases)

> **⚠️ Beta Version Notice**: This tool is currently in Beta stage. Features and APIs may change, so please stay updated with version releases.

This repository is the `ticoag/lark` maintained MCP distribution for Feishu/Lark OpenAPI. It is forked from [`larksuite/lark-openapi-mcp`](https://github.com/larksuite/lark-openapi-mcp) and continues development in the monorepo at [`ticoag/lark`](https://github.com/ticoag/lark).

The tool encapsulates Feishu/Lark Open Platform API interfaces as MCP tools, allowing AI assistants to directly call these interfaces and implement various automation scenarios such as document processing, conversation management, calendar scheduling, and more.

## Preparation

### Creating a Feishu/Lark Application

Before using the lark-mcp tool, you need to create a Feishu/Lark application:

1. Visit the [Feishu Open Platform](https://open.feishu.cn/) or [Lark Open Platform](https://open.larksuite.com/) and log in
2. Click "Console" and create a new application
3. Obtain the App ID and App Secret, which will be used for API authentication
4. Add the necessary permissions for your application based on your usage scenario
5. If you need to call APIs as a user, set the OAuth 2.0 redirect URL to http://localhost:3000/callback

For detailed application creation and configuration guidelines, please refer to the [Feishu Open Platform Documentation - Creating an Application](https://open.feishu.cn/document/home/introduction-to-custom-app-development/self-built-application-development-process#a0a7f6b0).

### Installing Node.js

Before using the lark-mcp tool, you need to install the Node.js environment.

**Using the Official Installer (Recommended)**:

1. Visit the [Node.js website](https://nodejs.org/)
2. Download and install the LTS version
3. After installation, verify in the terminal:

```bash
node -v
npm -v
```

## Quick Start

### Using with Trae/Cursor/Claude

To integrate Feishu/Lark functionality in AI tools like Trae, Cursor or Claude, install using the button below.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-light.svg)](https://cursor.com/install-mcp?name=lark-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBsYXJrc3VpdGVvYXBpL2xhcmstbWNwIiwibWNwIiwiLWEiLCJ5b3VyX2FwcF9pZCIsIi1zIiwieW91cl9hcHBfc2VjcmV0Il19)

[![Install MCP Server](./assets/trae-cn.svg)](trae-cn://trae.ai-ide/mcp-import?source=lark&type=stdio&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBsYXJrc3VpdGVvYXBpL2xhcmstbWNwIiwibWNwIiwiLWEiLCJ5b3VyX2FwcF9pZCIsIi1zIiwieW91cl9hcHBfc2VjcmV0Il19)  [![Install MCP Server](./assets/trae.svg)](trae://trae.ai-ide/mcp-import?source=lark&type=stdio&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBsYXJrc3VpdGVvYXBpL2xhcmstbWNwIiwibWNwIiwiLWEiLCJ5b3VyX2FwcF9pZCIsIi1zIiwieW91cl9hcHBfc2VjcmV0Il19)

or add the following to your configuration file:

```json
{
  "mcpServers": {
    "lark-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@ticoag/lark-mcp",
        "mcp",
        "-a",
        "<your_app_id>",
        "-s",
        "<your_app_secret>"
      ]
    }
  }
}
```

If you need to access APIs with **user identity**, you need to login first using the login command in the terminal. Note that you need to configure the application's redirect URL in the developer console first, default is http://localhost:3000/callback

```bash

# Login and get user access token
npx -y @ticoag/lark-mcp login -a cli_xxxx -s yyyyy
   
# Or optionally, login with specific OAuth scope - if not specified, all permissions will be authorized by default
npx -y @ticoag/lark-mcp login -a cli_xxxx -s yyyyy --scope offline_access docx:document

```

Then add the following to your configuration file:

```json
{
  "mcpServers": {
    "lark-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@ticoag/lark-mcp",
        "mcp",
        "-a",
        "<your_app_id>",
        "-s",
        "<your_app_secret>",
        "--oauth",
        "--token-mode", "user_access_token"
      ]
    }
  }
}
```

Note: When enabling `--oauth`, it's recommended to explicitly set `--token-mode` to `user_access_token`, which means calling APIs with user access tokens, suitable for accessing user resources or scenarios requiring user authorization (such as reading personal documents, sending IM messages). If you keep the default `auto`, some APIs AI may fallback to `tenant_access_token`, which could result in insufficient permissions or inability to access user private data.

### Domain Configuration

Based on your usage scenario, lark-mcp supports configuring different domain environments:

**Feishu (China Version)**:
- Default uses `https://open.feishu.cn` domain
- Suitable for users in China

**Lark (International Version)**:
- Uses `https://open.larksuite.com` domain
- Suitable for overseas users or international version of Lark

To switch to the international version of Lark, add the `--domain` parameter in your configuration:

```json
{
  "mcpServers": {
    "lark-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@ticoag/lark-mcp",
        "mcp",
        "-a",
        "<your_app_id>",
        "-s",
        "<your_app_secret>",
        "--domain",
        "https://open.larksuite.com"
      ]
    }
  }
}
```

> **💡 Tip**: Ensure your application is created in the corresponding domain environment's open platform. International version applications cannot be used with Feishu China version, and vice versa.



## Command Surface

Starting from this version, the public MCP surface defaults to a **command-oriented facade** instead of exposing the raw OpenAPI tools directly to the client.

The public surface now exposes 4 tools:

- `ls`: list available commands, resources, and actions
- `help`: inspect help for a node or argument
- `run`: execute a command
- `explain`: explain an error, permission, scope, or identity issue

The interaction model is:

- `command`
- `resource`
- `action`

Examples:
- `doc document search`
- `drive folder create`
- `chat message create`
- `perm permission-member transfer-owner`
- `calendar calendar-event create`
- `task task create`

Notes:
- Raw OpenAPI tools are still kept internally as the execution/mapping layer
- The default preset now includes representative actions for `drive`, `perm`, `task`, and `calendar`; use `preset.doc.default`, `preset.task.default`, or `preset.calendar.default` for deeper domain coverage
- Deprecated APIs marked by Feishu/Lark as `Deprecated Version (Not Recommended)` are filtered out by default; only APIs explicitly listed in `--deprecated-tools` are re-enabled
- `-t/--tools` now constrains the raw capabilities available behind the facade, rather than changing the public tool names seen by the client
- Results include cite metadata such as `help_target`, `raw_tool`, `docs_url`, and `resource_url` for bidirectional traceability

Migration:
- See the [Command Surface Migration Guide](./docs/usage/migration/command-surface-migration.md) for raw-to-facade mappings, breaking changes, and `explain` guidance

## Custom API Configuration

> ⚠️ **File Upload/Download**: File upload and download operations are not yet supported

> ⚠️ **Document Editing**: Direct editing of Feishu cloud documents is not supported (only importing and reading are available)

By default, the MCP service enables all supported APIs in the current build. To limit the surface to specific tools or presets, you can specify them using the `-t` parameter in the MCP Client configuration (JSON):

```json
{
  "mcpServers": {
    "lark-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@ticoag/lark-mcp",
        "mcp",
        "-a", "<your_app_id>",
        "-s", "<your_app_secret>",
        "-t", "im.v1.message.create,im.v1.message.list,im.v1.chat.create,preset.calendar.default"
      ]
    }
  }
}
```

For detailed information about all preset tool collections and which tools are included in each preset, please refer to the [Preset Tool Collections Reference](./docs/reference/tool-presets/presets.md).

A complete list of all supported Feishu/Lark tools can be found in [tools.md](./docs/reference/tool-presets/tools-en.md).

> **⚠️ Notice**：Non-preset APIs have not undergone compatibility testing, and the AI may not perform optimally during the process of understanding and using them.

### Development Integration

Developers can refer to the minimal example for integrating with Agent: [`lark-samples/mcp_quick_demo`](https://github.com/larksuite/lark-samples/tree/main/mcp_quick_demo).

You can also refer to the Lark bot integration example: [`lark-samples/mcp_larkbot_demo/nodejs`](https://github.com/larksuite/lark-samples/tree/main/mcp_larkbot_demo/nodejs).

This example demonstrates how to integrate MCP capabilities into Feishu/Lark bots, triggering tool calls and message sending through bot conversations, suitable for scenarios that integrate existing tools into Bot.

### Advanced Configuration

For detailed configuration options and deployment scenarios, please refer to our [Configuration Guide](./docs/usage/configuration/configuration.md).

For detailed information about all available command line parameters and their usage, please refer to the [Command Line Reference](./docs/reference/cli/cli.md).

### Maintainer Release

The monorepo defines GitHub Actions workflows for CI and npm publishing:

- CI: `../.github/workflows/ci.yml`
- npm publish: `../.github/workflows/publish-npm.yml`
- Both workflows set `NODE_OPTIONS=--max-old-space-size=4096` for the `lark-openapi-mcp` job so `tsc` does not hit the default Node heap limit on GitHub Actions

Release flow:

1. Update `version` in `package.json` and `CHANGELOG.md`
2. Run `npm ci && npm run build && npm run test:ci && npm run pack:check`
3. Push a git tag named `lark-openapi-mcp-vX.Y.Z`
4. Let GitHub Actions publish `@ticoag/lark-mcp` with `npm publish --provenance --access public`

The publish workflow prefers npm trusted publishing for `@ticoag/lark-mcp` against the GitHub repository `ticoag/lark` and workflow `.github/workflows/publish-npm.yml`. If the repository defines an `NPM_TOKEN` secret, the publish step can fall back to token auth when OIDC trusted publishing is not yet available.

## FAQ

- [FAQ (Frequently Asked Questions)](./docs/troubleshooting/faq.md)
- [Common Issues and Use Cases](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/use_cases)

## Related Links

- [Feishu Open Platform](https://open.feishu.cn/)
- [Development Documentation: OpenAPI MCP](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_introduction)
- [Lark International Open Platform](https://open.larksuite.com/)
- [Feishu Open Platform API Documentation](https://open.feishu.cn/document/home/index)
- [Node.js Website](https://nodejs.org/)
- [npm Documentation](https://docs.npmjs.com/)

## Feedback

Issues are welcome to help improve this tool. If you have any questions or suggestions, please raise them in the GitHub repository.
