import { Client } from '@larksuiteoapi/node-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';
import { LarkMcpToolOptions, McpTool, SettableValue, ToolNameCase, TokenMode } from './types';
import { AllTools, AllToolsZh, ToolName } from './tools';
import { filterTools, larkOapiHandler, caseTransf, getShouldUseUAT } from './utils';
import { LarkAuthHandler, isTokenValid } from '../auth';
import { safeJsonParse } from '../utils/safe-json-parse';
import { OAPI_MCP_ERROR_CODE } from '../utils/constants';
import { logger } from '../utils/logger';
import {
  buildCommandRegistry,
  buildExplainSuggestions,
  buildHelpPayload,
  buildLsPayload,
  buildCite,
  errorEnvelope,
  findCommandSpec,
  normalizeTarget,
  parseToolResult,
  successEnvelope,
} from '../command-surface';
import type { CommandIdentityMode, CommandSpec } from '../command-surface';

const lsSchema = {
  target: z.string().optional().describe('Optional command tree target. Examples: "doc", "doc.document"'),
  limit: z.number().int().positive().max(100).optional().describe('Optional display limit.'),
};

const helpSchema = {
  target: z.string().optional().describe('Help target. Examples: "doc", "doc.document", "doc.document.search"'),
  field: z.string().optional().describe('Optional argument path such as "data.search_key" or "path.document_id"'),
};

const runSchema = {
  command: z.string().describe('Domain command, for example: "doc", "drive", "chat", "base"'),
  resource: z.string().describe('Resource name under the command tree.'),
  action: z.string().describe('Action name under the resource tree.'),
  args: z.record(z.any()).optional().describe('Structured raw arguments forwarded to the mapped OpenAPI tool.'),
  identity: z
    .enum(['auto', 'user', 'tenant'])
    .optional()
    .describe('Identity mode. "auto" follows the command default identity policy.'),
};

const explainSchema = {
  target: z.string().optional().describe('Optional help target such as "doc.document.search".'),
  raw_tool: z.string().optional().describe('Optional raw OpenAPI tool name such as "im.v1.message.create".'),
  error: z.string().optional().describe('Error text or serialized response payload to explain.'),
  error_code: z.number().optional().describe('Optional error code if already extracted.'),
};

function resolveDefaultIdentity(policy: CommandSpec['defaultIdentity']): CommandIdentityMode {
  switch (policy) {
    case 'user_only':
    case 'user_preferred':
      return 'user';
    case 'tenant_only':
    case 'tenant_preferred':
      return 'tenant';
    case 'dual':
    default:
      return 'auto';
  }
}

function normalizeArgs(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return {};
  }
  const next = { ...(args as Record<string, unknown>) };
  delete next.useUAT;
  return next;
}

type TaskCommentMention = {
  user_id: string;
  display_name?: string;
  user_id_type?: 'open_id' | 'union_id' | 'user_id';
};

/**
 * Feishu/Lark MCP
 */
export class LarkMcpTool {
  private client: Client | null = null;
  private userAccessToken: SettableValue = {};
  private auth: LarkAuthHandler | undefined;
  private options: LarkMcpToolOptions;
  private allTools: McpTool[] = [];
  private commandRegistry: CommandSpec[] = [];

  constructor(options: LarkMcpToolOptions, auth?: LarkAuthHandler) {
    this.options = options;
    this.auth = auth;

    if (options.client) {
      this.client = options.client;
    } else if (options.appId && options.appSecret) {
      this.client = new Client({ appId: options.appId, appSecret: options.appSecret, ...options });
    }

    const isZH = options.toolsOptions?.language === 'zh';
    const sourceTools = isZH ? AllToolsZh : AllTools;

    const filterOptions = {
      tokenMode: this.options.tokenMode || TokenMode.AUTO,
      ...options.toolsOptions,
    };

    if (!filterOptions.allowTools && !filterOptions.allowProjects) {
      filterOptions.allowTools = sourceTools.map((tool) => tool.name as ToolName);
    }

    this.allTools = filterTools(sourceTools, filterOptions);
    this.commandRegistry = buildCommandRegistry(this.allTools, isZH ? 'zh' : 'en');

    logger.info(
      `[LarkMcpTool] Initialized with ${this.allTools.length} tools and ${this.commandRegistry.length} command actions, tokenMode: ${this.options.tokenMode}`,
    );
  }

  getTools(): McpTool[] {
    return this.allTools;
  }

  getCommandRegistry(): CommandSpec[] {
    return this.commandRegistry;
  }

  updateUserAccessToken(userAccessToken: string | SettableValue) {
    if (typeof userAccessToken === 'string') {
      this.userAccessToken.value = userAccessToken;
    } else {
      this.userAccessToken = userAccessToken;
    }
  }

  private async getUserAccessToken() {
    if (this.userAccessToken.getter) {
      return await this.userAccessToken.getter();
    }
    return this.userAccessToken.value;
  }

  private async setUserAccessToken(userAccessToken: string) {
    this.userAccessToken.value = userAccessToken;
    if (this.userAccessToken.setter) {
      await this.userAccessToken.setter(userAccessToken);
    }
  }

  private hasTaskCommentMentions(args: Record<string, unknown>): boolean {
    return Array.isArray(args.mentions) && args.mentions.length > 0;
  }

  private buildV2TaskCommentArgs(args: Record<string, unknown>): Record<string, unknown> {
    const next = { ...args };
    const mentions = Array.isArray(next.mentions) ? (next.mentions as TaskCommentMention[]) : [];
    delete next.mentions;

    if (!mentions.length) {
      return next;
    }

    const data =
      next.data && typeof next.data === 'object' && !Array.isArray(next.data)
        ? { ...(next.data as Record<string, unknown>) }
        : {};
    const originalContent = typeof data.content === 'string' ? data.content : '';
    const mentionBlocks = mentions
      .filter((mention) => mention?.user_id)
      .map((mention) => `<at id=${mention.user_id}></at>`);
    data.content = [...mentionBlocks, originalContent].filter(Boolean).join(' ').trim();
    next.data = data;
    return next;
  }

  private buildLegacyTaskCommentArgs(args: Record<string, unknown>): Record<string, unknown> {
    const next = { ...args };
    const mentions = Array.isArray(next.mentions) ? (next.mentions as TaskCommentMention[]) : [];
    delete next.mentions;

    if (!mentions.length) {
      return next;
    }

    const data =
      next.data && typeof next.data === 'object' && !Array.isArray(next.data)
        ? { ...(next.data as Record<string, unknown>) }
        : {};
    const params =
      next.params && typeof next.params === 'object' && !Array.isArray(next.params)
        ? { ...(next.params as Record<string, unknown>) }
        : {};
    const originalContent =
      typeof data.rich_content === 'string'
        ? data.rich_content
        : typeof data.content === 'string'
          ? data.content
          : '';
    const userIdType = String(params.user_id_type ?? mentions[0]?.user_id_type ?? 'open_id');

    const mentionBlocks = mentions
      .filter((mention) => mention?.user_id)
      .map((mention) => `<at id=${mention.user_id}></at>`);
    const richContent = [...mentionBlocks, originalContent].filter(Boolean).join(' ').trim();
    const parentId = typeof data.reply_to_comment_id === 'string' ? data.reply_to_comment_id : undefined;

    return {
      path: next.path,
      params: { ...params, user_id_type: userIdType },
      data: {
        rich_content: richContent,
        ...(parentId ? { parent_id: parentId } : {}),
      },
    };
  }

  async reAuthorize(): Promise<{ userAccessToken?: string; authorizeUrl?: string }> {
    const userAccessToken = await this.getUserAccessToken();
    if (!this.auth || !this.options.oauth) {
      return {};
    }
    logger.info(`[LarkMcpTool] Re-authorizing user access token`);
    const { authorizeUrl, accessToken } = await this.auth.reAuthorize(userAccessToken);
    if (accessToken) {
      logger.info(`[LarkMcpTool] Successfully re-authorized user access token`);
      this.setUserAccessToken(accessToken);
      return { userAccessToken: accessToken };
    }
    return { authorizeUrl };
  }

  async ensureGetUserAccessToken(): Promise<{ userAccessToken?: string; authorizeUrl?: string }> {
    const userAccessToken = await this.getUserAccessToken();
    if (!this.auth) {
      return { userAccessToken };
    }

    const { valid, isExpired, token } = await isTokenValid(userAccessToken);
    if (valid) {
      return { userAccessToken };
    }

    logger.info(`[LarkMcpTool] UserAccessToken is invalid or expired, trying to get new token...`);

    try {
      if (isExpired && token?.extra?.refreshToken) {
        logger.info(`[LarkMcpTool] UserAccessToken is expired, trying to use refreshToken to refresh...`);
        const newToken = await this.auth.refreshToken(token.token);
        if (newToken?.access_token) {
          this.setUserAccessToken(newToken.access_token);
          return { userAccessToken: newToken.access_token };
        }
      }
    } catch (error) {
      logger.error(`[LarkMcpTool] Failed to refreshToken: ${error}`);
    }

    return await this.reAuthorize();
  }

  getReAuthorizeMessage(authorizeUrl?: string, errorCode?: number, errorText?: string) {
    const errorMessage =
      errorCode === OAPI_MCP_ERROR_CODE.USER_ACCESS_TOKEN_UNAUTHORIZED
        ? 'Current user_access_token lacks required permissions. Please ensure the corresponding permissions are enabled in the developer console, then re-authorize using the following Authorization URL or login command.'
        : 'Current user_access_token is invalid or expired';

    const instruction = authorizeUrl
      ? [
          'Please open the following URL in your browser to complete the authorization:',
          `Note: Ensure the redirect URL (${this.auth?.callbackUrl}) is configured in your app\'s security settings.`,
          `   If not configured, go to: ${this.options.domain}/app/${this.options.appId}/safe`,
          'Authorization URL:',
          authorizeUrl,
          'This authorization link expires in 60 seconds. Generating a new link will immediately invalidate this one.',
        ]
          .join('\n')
          .trim()
      : '';

    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            errorCode,
            errorMessage,
            instruction,
            rawErrorText: errorText,
          }),
        },
      ],
    };
  }

  private async executeRawToolDefinition(tool: McpTool, params: any): Promise<CallToolResult> {
    try {
      if (!this.client) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: JSON.stringify({ msg: 'Client not initialized' }) }],
        };
      }

      const handler = tool.customHandler || larkOapiHandler;
      const shouldUseUAT = getShouldUseUAT(this.options.tokenMode, params?.useUAT ?? false);

      if (shouldUseUAT) {
        const { userAccessToken, authorizeUrl } = await this.ensureGetUserAccessToken();
        if (!userAccessToken) {
          return this.getReAuthorizeMessage(authorizeUrl);
        }

        logger.info(`[LarkMcpTool] Calling tool: ${tool.name}`);
        const result = await handler(this.client, { ...params, useUAT: shouldUseUAT }, { userAccessToken, tool });
        const errorCode = safeJsonParse(result.content?.[0]?.text as string, { code: 0 }).code;
        if (
          result.isError &&
          [OAPI_MCP_ERROR_CODE.USER_ACCESS_TOKEN_UNAUTHORIZED, OAPI_MCP_ERROR_CODE.USER_ACCESS_TOKEN_INVALID].includes(
            errorCode,
          )
        ) {
          logger.info(`[LarkMcpTool] User access token unauthorized or invalid, re-authorizing, errorCode: ${errorCode}`);
          const { authorizeUrl: newAuthorizeUrl } = await this.reAuthorize();
          return this.getReAuthorizeMessage(newAuthorizeUrl, errorCode, result.content?.[0]?.text as string);
        }
        return result;
      }

      logger.info(`[LarkMcpTool] Calling tool: ${tool.name}`);
      return handler(this.client, { ...params, useUAT: shouldUseUAT }, { tool });
    } catch (error) {
      logger.error(`[LarkMcpTool] Failed to call tool: ${tool.name}, error: ${error}`);
      return {
        isError: true,
        content: [{ type: 'text' as const, text: JSON.stringify((error as Error)?.message) }],
      };
    }
  }

  async executeRawTool(toolName: string, params: any): Promise<CallToolResult> {
    const tool = this.allTools.find((entry) => entry.name === toolName);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: JSON.stringify({ msg: `Unknown tool: ${toolName}` }) }],
      };
    }
    return this.executeRawToolDefinition(tool, params);
  }

  registerMcpServer(server: McpServer, options?: { toolNameCase?: ToolNameCase }): void {
    for (const tool of this.allTools) {
      server.tool(caseTransf(tool.name, options?.toolNameCase), tool.description, tool.schema, async (params: any) => {
        return this.executeRawToolDefinition(tool, params);
      });
    }
  }

  registerCommandMcpServer(server: McpServer, options?: { toolNameCase?: ToolNameCase }): void {
    server.tool(caseTransf('ls', options?.toolNameCase), 'List available commands, resources, and actions.', lsSchema, async (params: any) => {
      const payload = buildLsPayload(this.commandRegistry, params?.target);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
      };
    });

    server.tool(caseTransf('help', options?.toolNameCase), 'Show help for a command, resource, action, or argument.', helpSchema, async (params: any) => {
      const payload = buildHelpPayload(this.commandRegistry, params?.target, params?.field);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
      };
    });

    server.tool(caseTransf('run', options?.toolNameCase), 'Execute a command/resource/action against the mapped Feishu raw tool.', runSchema, async (params: any) => {
      const spec = findCommandSpec(this.commandRegistry, {
        command: params?.command,
        resource: params?.resource,
        action: params?.action,
      });

      if (!spec) {
        const target = [params?.command, params?.resource, params?.action].filter(Boolean).join('.');
        const normalizedTarget = normalizeTarget(target);
        const suggestions = this.commandRegistry
          .filter((entry) => !normalizedTarget || entry.helpTarget.startsWith(normalizedTarget.split('.').slice(0, 2).join('.')))
          .slice(0, 8)
          .map((entry) => ({
            type: 'help' as const,
            target: entry.helpTarget,
            reason: 'Nearby command target.',
          }));

        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                errorEnvelope({
                  target: normalizedTarget,
                  error: 'Unknown command/resource/action target.',
                  summary: 'No command action matched the requested target.',
                  suggestions,
                }),
              ),
            },
          ],
        };
      }

      const identity = (params?.identity as CommandIdentityMode | undefined) ?? resolveDefaultIdentity(spec.defaultIdentity);
      let args = normalizeArgs(params?.args);
      const useUAT = identity === 'user' ? true : identity === 'tenant' ? false : resolveDefaultIdentity(spec.defaultIdentity) === 'user';
      if (spec.rawToolName === 'task.v2.comment.create' && this.hasTaskCommentMentions(args)) {
        args = this.buildV2TaskCommentArgs(args);
      }
      if (spec.rawToolName === 'task.v1.taskComment.create' && this.hasTaskCommentMentions(args)) {
        args = this.buildLegacyTaskCommentArgs(args);
      }
      const rawResult = await this.executeRawTool(spec.rawToolName, { ...args, useUAT });
      const parsed = parseToolResult(rawResult as any);

      if (rawResult.isError) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                errorEnvelope({
                  target: spec.helpTarget,
                  error: parsed,
                  summary: spec.summary,
                  suggestions: buildExplainSuggestions(spec),
                  cite: buildCite(spec, parsed),
                }),
              ),
            },
          ],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(successEnvelope(spec, parsed)) }],
      };
    });

    server.tool(caseTransf('explain', options?.toolNameCase), 'Explain an error, permission issue, or target mismatch with next-step guidance.', explainSchema, async (params: any) => {
      const target = normalizeTarget(params?.target);
      const spec = this.commandRegistry.find((entry) => entry.helpTarget === target || entry.rawToolName === params?.raw_tool);
      const errorText = String(params?.error ?? '');
      const errorCode = Number(params?.error_code ?? safeJsonParse(errorText, { code: 0 }).code ?? 0);

      let summary = 'General execution guidance.';
      if ([OAPI_MCP_ERROR_CODE.USER_ACCESS_TOKEN_INVALID, OAPI_MCP_ERROR_CODE.USER_ACCESS_TOKEN_UNAUTHORIZED].includes(errorCode)) {
        summary = 'User token is invalid, expired, or missing required scopes.';
      } else if (/permission|forbidden|denied|scope/i.test(errorText)) {
        summary = 'Permission or scope issue detected.';
      } else if (/unknown command|no command action matched/i.test(errorText)) {
        summary = 'Target resolution issue detected.';
      }

      const payload = {
        target: spec?.helpTarget ?? target,
        summary,
        raw_tool: spec?.rawToolName ?? params?.raw_tool,
        error_code: Number.isFinite(errorCode) ? errorCode : undefined,
        error: params?.error,
        suggestions: spec
          ? buildExplainSuggestions(spec)
          : [{ type: 'help' as const, target: 'root', reason: 'Start from the root help tree.' }],
        cite: spec
          ? {
              help_target: spec.helpTarget,
              raw_tool: spec.rawToolName,
              docs_url: spec.docsUrl,
            }
          : undefined,
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
      };
    });
  }
}
