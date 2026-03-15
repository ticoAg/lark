import * as larkmcp from '../../mcp-tool';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initStdioServer, initSSEServer, initStreamableServer } from '../transport';
import { McpServerOptions, McpServerType } from './types';
import { noop } from '../../utils/noop';
import { currentVersion } from '../../utils/version';
import { oapiHttpInstance } from '../../utils/http-instance';
import { LarkAuthHandler } from '../../auth';
import { logger } from '../../utils/logger';

export function initOAPIMcpServer(options: McpServerOptions, authHandler?: LarkAuthHandler) {
  const { appId, appSecret, userAccessToken, tokenMode, domain, oauth } = options;

  if (!appId || !appSecret) {
    const missing = [
      ...(!appId ? ['LARK_APP_ID (-a / --app-id)'] : []),
      ...(!appSecret ? ['LARK_APP_SECRET (-s / --app-secret)'] : []),
    ];
    const message = [
      `❌ Missing required credentials: ${missing.join(', ')}`,
      '',
      'To get your App ID and App Secret:',
      '  1. Visit https://open.feishu.cn/ → Developer Console',
      '  2. Create or select an app',
      '  3. Copy credentials from "Credentials & Basic Info"',
      '',
      'Provide credentials via:',
      '  • CLI args:  npx @ticoag/lark-mcp mcp -a <APP_ID> -s <APP_SECRET>',
      '  • Env vars:  export LARK_APP_ID=cli_xxx  export LARK_APP_SECRET=xxx',
      '  • Config:    npx @ticoag/lark-mcp mcp --config config.json',
      '',
      '📖 Setup guide: https://github.com/ticoAg/lark/blob/main/lark-openapi-mcp/docs/usage/configuration/configuration.md',
      '❓ FAQ: https://github.com/ticoAg/lark/blob/main/lark-openapi-mcp/docs/troubleshooting/faq.md',
    ].join('\n');
    console.error(message);
    throw new Error(`Missing required credentials: ${missing.join(', ')}`);
  }

  let allowTools = options.tools || [];

  for (const [presetName, presetTools] of Object.entries(larkmcp.presetTools)) {
    if (allowTools.includes(presetName)) {
      allowTools = [...presetTools, ...allowTools];
    }
  }

  // Unique
  allowTools = Array.from(new Set(allowTools));

  // Create MCP Server
  const mcpServer = new McpServer({ name: 'Lark MCP', version: currentVersion });

  const toolsOptions = allowTools.length
    ? {
        allowTools: allowTools as larkmcp.ToolName[],
        allowDeprecatedTools: (options.deprecatedTools ?? []) as larkmcp.ToolName[],
        language: options.language,
      }
    : {
        allowDeprecatedTools: (options.deprecatedTools ?? []) as larkmcp.ToolName[],
        language: options.language,
      };

  const larkClient = new larkmcp.LarkMcpTool(
    {
      appId,
      appSecret,
      logger: { warn: noop, error: noop, debug: noop, info: noop, trace: noop },
      httpInstance: oapiHttpInstance,
      domain,
      toolsOptions,
      tokenMode,
      oauth,
    },
    authHandler,
  );

  if (userAccessToken) {
    larkClient.updateUserAccessToken(userAccessToken);
  }

  larkClient.registerCommandMcpServer(mcpServer, { toolNameCase: options.toolNameCase });

  return { mcpServer, larkClient };
}

export function initRecallMcpServer(options: McpServerOptions) {
  const server = new McpServer({
    name: 'Lark Recall MCP Service',
    version: currentVersion,
  });
  server.registerTool(
    larkmcp.RecallTool.name,
    { description: larkmcp.RecallTool.description, inputSchema: larkmcp.RecallTool.schema as any },
    (params: any) =>
      larkmcp.RecallTool.handler(params, options),
  );
  return server;
}

export async function initMcpServerWithTransport(serverType: McpServerType, options: McpServerOptions) {
  const { mode, userAccessToken, oauth } = options;

  if (userAccessToken && oauth) {
    logger.error(`[initMcpServerWithTransport] userAccessToken and oauth cannot be used together`);
    throw new Error('userAccessToken and oauth cannot be used together');
  }

  const getNewServer = (commonOptions?: McpServerOptions, authHandler?: LarkAuthHandler) => {
    if (serverType === 'oapi') {
      const { mcpServer } = initOAPIMcpServer({ ...options, ...commonOptions }, authHandler);
      return mcpServer;
    } else if (serverType === 'recall') {
      return initRecallMcpServer({ ...options, ...commonOptions });
    }
    logger.error(`[initMcpServerWithTransport] Invalid server type: ${serverType}`);
    throw new Error('Invalid server type');
  };

  const needAuthFlow = serverType === 'oapi';

  switch (mode) {
    case 'stdio':
      await initStdioServer(getNewServer, options, { needAuthFlow });
      break;
    case 'sse':
      await initSSEServer(getNewServer, options, { needAuthFlow });
      break;
    case 'streamable':
      await initStreamableServer(getNewServer, options, { needAuthFlow });
      break;
    default:
      throw new Error('Invalid mode:' + mode);
  }
}
