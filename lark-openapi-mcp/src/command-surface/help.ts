import type { CommandSpec, ExplainSuggestion } from './types';
import { filterRegistryByTarget, normalizeTarget } from './registry';

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function summarizeCommands(registry: CommandSpec[]) {
  const commands = unique(registry.map((spec) => spec.command)).sort();
  return commands.map((command) => ({
    target: command,
    summary: `${registry.filter((spec) => spec.command === command).length} actions available`,
  }));
}

function summarizeResources(registry: CommandSpec[], command: string) {
  const resources = unique(registry.filter((spec) => spec.command === command).map((spec) => spec.resource)).sort();
  return resources.map((resource) => ({
    target: `${command}.${resource}`,
    summary: `${registry.filter((spec) => spec.command === command && spec.resource === resource).length} actions available`,
  }));
}

function summarizeActions(registry: CommandSpec[], command: string, resource: string) {
  return registry
    .filter((spec) => spec.command === command && spec.resource === resource)
    .map((spec) => ({
      target: spec.helpTarget,
      summary: spec.summary,
      identity: spec.defaultIdentity,
    }));
}

export function buildLsPayload(registry: CommandSpec[], target?: string) {
  const normalizedTarget = normalizeTarget(target);
  if (!normalizedTarget) {
    return {
      mode: 'commands',
      items: summarizeCommands(registry),
      cite: {
        help_target: 'root',
      },
    };
  }

  const parts = normalizedTarget.split('.');
  if (parts.length === 1) {
    return {
      mode: 'resources',
      target: normalizedTarget,
      items: summarizeResources(registry, parts[0]!),
      cite: {
        help_target: normalizedTarget,
      },
    };
  }

  return {
    mode: 'actions',
    target: normalizedTarget,
    items: summarizeActions(registry, parts[0]!, parts[1]!),
    cite: {
      help_target: normalizedTarget,
    },
  };
}

function buildRootHelp(registry: CommandSpec[]) {
  return {
    target: 'root',
    summary: 'Use ls to explore commands, then help for action details, and run to execute.',
    children: summarizeCommands(registry),
    examples: [
      { tool: 'ls', args: {} },
      { tool: 'help', args: { target: 'doc' } },
      { tool: 'run', args: { command: 'doc', resource: 'document', action: 'search', args: { data: { search_key: '项目', count: 10 } }, identity: 'user' } },
    ],
  };
}

export function buildHelpPayload(registry: CommandSpec[], target?: string, field?: string) {
  const normalizedTarget = normalizeTarget(target);
  if (!normalizedTarget) {
    return buildRootHelp(registry);
  }

  const parts = normalizedTarget.split('.');
  if (parts.length === 1) {
    return {
      target: normalizedTarget,
      summary: `${normalizedTarget} command`,
      children: summarizeResources(registry, parts[0]!),
      related: ['root'],
      examples: [{ tool: 'ls', args: { target: normalizedTarget } }],
    };
  }

  if (parts.length === 2) {
    return {
      target: normalizedTarget,
      summary: `${parts[0]} ${parts[1]} resource`,
      children: summarizeActions(registry, parts[0]!, parts[1]!),
      parent: parts[0],
      related: ['root'],
      examples: [{ tool: 'help', args: { target: `${normalizedTarget}.${summarizeActions(registry, parts[0]!, parts[1]!)[0]?.target.split('.').pop() ?? ''}` } }],
    };
  }

  const spec = registry.find((entry) => entry.helpTarget === normalizedTarget);
  if (!spec) {
    return {
      target: normalizedTarget,
      summary: 'No matching help target found.',
      suggestions: filterRegistryByTarget(registry, parts[0]).slice(0, 10).map((entry) => entry.helpTarget),
    };
  }

  const selectedField = field ? spec.argsFields.find((entry) => entry.path === field) : undefined;
  return {
    target: spec.helpTarget,
    summary: spec.summary,
    description: spec.description,
    default_identity: spec.defaultIdentity,
    raw_tool: spec.rawToolName,
    docs_url: spec.docsUrl,
    parent: `${spec.command}.${spec.resource}`,
    related: spec.related,
    args: selectedField ? [selectedField] : spec.argsFields,
    examples: [spec.example],
    cite: {
      help_target: spec.helpTarget,
      raw_tool: spec.rawToolName,
      docs_url: spec.docsUrl,
    },
  };
}

export function buildExplainSuggestions(spec?: CommandSpec): ExplainSuggestion[] {
  if (!spec) {
    return [];
  }
  return [
    {
      type: 'help',
      target: spec.helpTarget,
      reason: 'Inspect the action contract and examples.',
    },
    ...spec.related.slice(0, 3).map((target) => ({
      type: 'related' as const,
      target,
      reason: 'Try a related action in the same resource tree.',
    })),
  ];
}
