import type { McpTool } from '../mcp-tool/types';

export type CommandIdentityMode = 'auto' | 'user' | 'tenant';
export type DefaultIdentityPolicy =
  | 'user_preferred'
  | 'user_only'
  | 'tenant_only'
  | 'tenant_preferred'
  | 'dual';

export interface CommandFieldHelp {
  path: string;
  type: string;
  required: boolean;
  description?: string;
  enumValues?: string[];
}

export interface CommandExample {
  title: string;
  payload: Record<string, unknown>;
}

export interface CommandSpec {
  id: string;
  helpTarget: string;
  command: string;
  resource: string;
  action: string;
  summary: string;
  description: string;
  defaultIdentity: DefaultIdentityPolicy;
  docsUrl?: string;
  rawToolName: string;
  rawPath?: string;
  accessTokens: string[];
  argsFields: CommandFieldHelp[];
  example: CommandExample;
  related: string[];
  rawTool: McpTool;
}

export interface ExplainSuggestion {
  type: 'help' | 'run' | 'related';
  target: string;
  reason: string;
}
