import { McpTool } from '../mcp-tool/types';
import { getOfficialDocsUrl } from './docs-links';
import { buildCommandExample, extractFieldHelp } from './schema';
import type { CommandSpec, DefaultIdentityPolicy } from './types';

const EXPLICIT_TARGET_OVERRIDES: Record<string, { command?: string; resource?: string; action?: string }> = {
  'im.v1.message.create': { command: 'chat', resource: 'message', action: 'create' },
  'im.v1.chat.create': { command: 'group', resource: 'chat', action: 'create' },
  'docx.builtin.import': { command: 'doc', resource: 'document', action: 'import' },
  'docx.builtin.search': { command: 'doc', resource: 'document', action: 'search' },
  'docx.v1.document.rawContent': { command: 'doc', resource: 'document', action: 'read-content' },
  'docx.v1.document.create': { command: 'doc', resource: 'document', action: 'create' },
  'bitable.v1.app.create': { command: 'base', resource: 'app', action: 'create' },
  'drive.v1.file.createFolder': { command: 'drive', resource: 'folder', action: 'create' },
  'drive.v1.file.list': { command: 'drive', resource: 'folder', action: 'list' },
  'drive.v1.file.move': { command: 'drive', resource: 'file', action: 'move' },
  'drive.v1.file.delete': { command: 'drive', resource: 'file', action: 'delete' },
  'drive.v1.permissionMember.create': { command: 'perm', resource: 'permission-member', action: 'grant' },
  'drive.v1.permissionMember.transferOwner': { command: 'perm', resource: 'permission-member', action: 'transfer-owner' },
  'wiki.v1.node.search': { command: 'wiki', resource: 'node', action: 'search' },
  'calendar.v4.calendarEvent.create': { command: 'calendar', resource: 'calendar-event', action: 'create' },
  'task.v2.task.create': { command: 'task', resource: 'task', action: 'create' },
  'contact.v3.user.batchGetId': { command: 'user', resource: 'user', action: 'lookup-id' },
};

const COMMAND_OVERRIDES: Record<string, string> = {
  docx: 'doc',
  docs: 'doc',
  drive: 'drive',
  bitable: 'base',
  base: 'base',
  wiki: 'wiki',
  calendar: 'calendar',
  task: 'task',
};

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function stripPrefix(description: string): string {
  const normalized = description.trim();
  if (!normalized) {
    return 'No description available.';
  }
  const parts = normalized.split('-');
  return parts[parts.length - 1]?.trim() || normalized;
}

function toolSegments(tool: McpTool): { project: string; namespace?: string; semantic: string[] } {
  const parts = tool.name.split('.');
  const project = parts[0] ?? 'lark';
  const second = parts[1];
  const hasVersion = /^v\d+$/.test(second ?? '');
  if (hasVersion) {
    return { project, semantic: parts.slice(2) };
  }
  return { project, namespace: second, semantic: parts.slice(2).length ? parts.slice(2) : parts.slice(1) };
}

function deriveCommand(tool: McpTool, resource: string): string {
  if (tool.project === 'im') {
    if (resource.startsWith('message') || resource.startsWith('pin')) {
      return 'chat';
    }
    return 'group';
  }
  if (tool.project === 'contact' || tool.project === 'authen' || tool.project === 'directory') {
    return 'user';
  }
  if (tool.project === 'drive' && resource.includes('permission')) {
    return 'perm';
  }
  return COMMAND_OVERRIDES[tool.project] ?? toKebabCase(tool.project);
}

function fallbackResource(tool: McpTool, namespace?: string): string {
  if (tool.project === 'docx' && namespace === 'builtin') {
    return 'document';
  }
  if (tool.project === 'wiki') {
    return 'node';
  }
  return namespace ? toKebabCase(namespace) : toKebabCase(tool.project);
}

function normalizeAction(action: string): string {
  const normalized = toKebabCase(action);
  if (normalized === 'raw-content') return 'read-content';
  if (normalized === 'batch-get-id') return 'lookup-id';
  return normalized;
}

function determineIdentity(tool: McpTool): DefaultIdentityPolicy {
  const accessTokens = tool.accessTokens ?? [];
  const hasUser = accessTokens.includes('user');
  const hasTenant = accessTokens.includes('tenant');
  if (hasUser && hasTenant) {
    if (tool.project === 'docx' || tool.project === 'contact' || tool.project === 'wiki') {
      return 'user_preferred';
    }
    if (tool.project === 'drive' && tool.name.includes('permissionMember.transferOwner')) {
      return 'user_preferred';
    }
    return 'dual';
  }
  if (hasUser) return 'user_only';
  if (hasTenant) return 'tenant_only';
  return 'tenant_preferred';
}

function buildBaseSpec(tool: McpTool, language: 'zh' | 'en' = 'zh'): CommandSpec {
  const { namespace, semantic } = toolSegments(tool);
  const actionSource = semantic[semantic.length - 1] ?? 'run';
  const rawResourceParts = semantic.slice(0, -1);
  const override = EXPLICIT_TARGET_OVERRIDES[tool.name];
  const resource =
    override?.resource ??
    (rawResourceParts.length ? rawResourceParts.map(toKebabCase).join('-') : fallbackResource(tool, namespace));
  const action = override?.action ?? normalizeAction(actionSource);
  const command = override?.command ?? deriveCommand(tool, resource);
  const summary = stripPrefix(tool.description);
  const description = tool.description.trim() || summary;
  const docsUrl = getOfficialDocsUrl(tool.name, language);
  const defaultIdentity = determineIdentity(tool);

  return {
    id: `${command}.${resource}.${action}`,
    helpTarget: `${command}.${resource}.${action}`,
    command,
    resource,
    action,
    summary,
    description,
    defaultIdentity,
    docsUrl,
    rawToolName: tool.name,
    rawPath: tool.path,
    accessTokens: tool.accessTokens ?? [],
    argsFields: extractFieldHelp(tool.schema),
    example: buildCommandExample({
      command,
      resource,
      action,
      schema: tool.schema,
      defaultIdentity,
    }),
    related: [],
    rawTool: tool,
  };
}

function disambiguate(spec: CommandSpec, index: number): CommandSpec {
  const resource = `${spec.resource}-${index + 1}`;
  const id = `${spec.command}.${resource}.${spec.action}`;
  return {
    ...spec,
    resource,
    id,
    helpTarget: id,
    example: {
      ...spec.example,
      payload: {
        ...spec.example.payload,
        resource,
      },
    },
  };
}

export function buildCommandRegistry(tools: McpTool[], language: 'zh' | 'en' = 'zh'): CommandSpec[] {
  const registry: CommandSpec[] = [];
  const byId = new Map<string, number>();

  for (const tool of tools) {
    let spec = buildBaseSpec(tool, language);
    const duplicateIndex = byId.get(spec.id);
    if (duplicateIndex !== undefined) {
      spec = disambiguate(spec, duplicateIndex + 1);
      byId.set(spec.id, duplicateIndex + 1);
    } else {
      byId.set(spec.id, 0);
    }
    registry.push(spec);
  }

  const grouped = new Map<string, CommandSpec[]>();
  for (const spec of registry) {
    const key = `${spec.command}.${spec.resource}`;
    const current = grouped.get(key) ?? [];
    current.push(spec);
    grouped.set(key, current);
  }

  for (const spec of registry) {
    const siblings = grouped.get(`${spec.command}.${spec.resource}`) ?? [];
    spec.related = siblings
      .filter((candidate) => candidate.id !== spec.id)
      .map((candidate) => candidate.helpTarget)
      .slice(0, 6);
  }

  return registry.sort((a, b) => a.id.localeCompare(b.id));
}

export function normalizeTarget(target?: string): string {
  return (target ?? '')
    .trim()
    .replace(/[\/\s]+/g, '.')
    .split('.')
    .map((segment) => toKebabCase(segment))
    .filter(Boolean)
    .join('.');
}

export function filterRegistryByTarget(registry: CommandSpec[], target?: string): CommandSpec[] {
  const normalizedTarget = normalizeTarget(target);
  if (!normalizedTarget) {
    return registry;
  }
  return registry.filter((spec) =>
    spec.helpTarget === normalizedTarget || spec.helpTarget.startsWith(`${normalizedTarget}.`),
  );
}

export function findCommandSpec(registry: CommandSpec[], params: {
  command: string;
  resource: string;
  action: string;
}): CommandSpec | undefined {
  const command = normalizeTarget(params.command);
  const resource = normalizeTarget(params.resource).replace(/\./g, '-');
  const action = normalizeTarget(params.action);
  return registry.find(
    (spec) => spec.command === command && spec.resource === resource && spec.action === action,
  );
}
