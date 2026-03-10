import { safeJsonParse } from '../utils/safe-json-parse';
import type { CommandSpec, ExplainSuggestion } from './types';

function collectTokens(input: unknown, results: string[] = []): string[] {
  if (!input || typeof input !== 'object') {
    return results;
  }
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'string') {
      if (/(^|_)(token|id)$/i.test(key) || /^(ou_|oc_|cli_|app|tbl|rec|docx?|wik|A[e-zA-Z0-9])/i.test(value)) {
        results.push(`${key}:${value}`);
      }
      continue;
    }
    collectTokens(value, results);
  }
  return results;
}

function collectUrls(input: unknown, results: string[] = []): string[] {
  if (!input || typeof input !== 'object') {
    return results;
  }
  for (const value of Object.values(input as Record<string, unknown>)) {
    if (typeof value === 'string' && /^https?:\/\//.test(value)) {
      results.push(value);
      continue;
    }
    collectUrls(value, results);
  }
  return results;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).filter(Boolean);
}

export function parseToolResult(result: { content?: Array<Record<string, unknown>>; isError?: boolean }): unknown {
  const text = result.content?.[0]?.text;
  if (typeof text === 'string') {
    return safeJsonParse(text, text);
  }
  return result.content?.[0] ?? '';
}

export function buildCite(spec: CommandSpec, payload: unknown) {
  const urls = unique(collectUrls(payload));
  const tokens = unique(collectTokens(payload));
  return {
    help_target: spec.helpTarget,
    raw_tool: spec.rawToolName,
    raw_path: spec.rawPath,
    docs_url: spec.docsUrl,
    help_command: `Use help with target \"${spec.helpTarget}\"`,
    resource_url: urls[0],
    resource_urls: urls,
    resource_tokens: tokens,
  };
}

export function successEnvelope(spec: CommandSpec, payload: unknown) {
  return {
    ok: true,
    target: spec.helpTarget,
    summary: spec.summary,
    data: payload,
    next: [
      {
        type: 'help',
        target: spec.helpTarget,
        reason: 'Inspect arguments, identity policy, and related actions.',
      },
      ...spec.related.slice(0, 3).map((target) => ({
        type: 'related' as const,
        target,
        reason: 'Related action in the same resource.',
      })),
    ],
    cite: buildCite(spec, payload),
  };
}

export function errorEnvelope(params: {
  target?: string;
  error: unknown;
  summary: string;
  suggestions?: ExplainSuggestion[];
  cite?: Record<string, unknown>;
}) {
  const error = typeof params.error === 'string' ? params.error : JSON.stringify(params.error);
  return {
    ok: false,
    target: params.target,
    summary: params.summary,
    error,
    next: params.suggestions ?? [],
    cite: params.cite,
  };
}
