import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
import type { CommandExample, CommandFieldHelp, DefaultIdentityPolicy } from './types';

function unwrapSchema(schema: ZodTypeAny): { schema: ZodTypeAny; required: boolean } {
  let current = schema;
  let required = true;

  while (true) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodDefault || current instanceof z.ZodNullable) {
      required = false;
      current = (current as unknown as { _def?: { innerType?: ZodTypeAny } })._def?.innerType ?? current;
      continue;
    }
    break;
  }

  return { schema: current, required };
}

function schemaTypeLabel(schema: ZodTypeAny): string {
  const { schema: unwrapped } = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodString) return 'string';
  if (unwrapped instanceof z.ZodNumber) return 'number';
  if (unwrapped instanceof z.ZodBoolean) return 'boolean';
  if (unwrapped instanceof z.ZodArray) return `array<${schemaTypeLabel(unwrapped.element)}> ` .trim();
  if (unwrapped instanceof z.ZodEnum) return 'enum';
  if (unwrapped instanceof z.ZodObject) return 'object';
  if (unwrapped instanceof z.ZodUnion) return 'union';
  if (unwrapped instanceof z.ZodRecord) return 'record';
  return 'value';
}

function extractEnumValues(schema: ZodTypeAny): string[] | undefined {
  const { schema: unwrapped } = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodEnum) {
    return [...unwrapped.options];
  }
  if (unwrapped instanceof z.ZodUnion) {
    const values = unwrapped.options.flatMap((option: ZodTypeAny) => extractEnumValues(option) ?? []);
    return values.length ? Array.from(new Set(values)) : undefined;
  }
  return undefined;
}

function extractShape(schema: ZodTypeAny): Record<string, ZodTypeAny> | null {
  const { schema: unwrapped } = unwrapSchema(schema);
  if (!(unwrapped instanceof z.ZodObject)) {
    return null;
  }
  return typeof unwrapped.shape === 'function' ? unwrapped.shape() : unwrapped.shape;
}

export function extractFieldHelp(schema: ZodTypeAny, prefix = ''): CommandFieldHelp[] {
  const shape = extractShape(schema);
  if (!shape) {
    return [];
  }

  const results: CommandFieldHelp[] = [];
  for (const [key, child] of Object.entries(shape)) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    const { required } = unwrapSchema(child);
    const nestedShape = extractShape(child);
    const field: CommandFieldHelp = {
      path: childPath,
      type: schemaTypeLabel(child),
      required,
      description: child.description,
      enumValues: extractEnumValues(child),
    };
    results.push(field);
    if (nestedShape) {
      results.push(...extractFieldHelp(child, childPath));
    }
  }
  return results;
}

function exampleValue(schema: ZodTypeAny, depth = 0): unknown {
  if (depth > 3) {
    return '<value>';
  }

  const { schema: unwrapped } = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodString) return '<string>';
  if (unwrapped instanceof z.ZodNumber) return 0;
  if (unwrapped instanceof z.ZodBoolean) return false;
  if (unwrapped instanceof z.ZodEnum) return unwrapped.options[0];
  if (unwrapped instanceof z.ZodArray) return [exampleValue(unwrapped.element, depth + 1)];
  if (unwrapped instanceof z.ZodRecord) return { key: '<value>' };
  if (unwrapped instanceof z.ZodUnion) return exampleValue(unwrapped.options[0], depth + 1);
  if (unwrapped instanceof z.ZodObject) {
    const shape = extractShape(unwrapped) ?? {};
    const entries: Array<[string, unknown]> = [];
    for (const [key, child] of Object.entries(shape)) {
      const childState = unwrapSchema(child);
      if (childState.required || entries.length === 0) {
        entries.push([key, exampleValue(child, depth + 1)]);
      }
    }
    return Object.fromEntries(entries);
  }
  return '<value>';
}

export function buildCommandExample(params: {
  command: string;
  resource: string;
  action: string;
  schema: ZodTypeAny;
  defaultIdentity: DefaultIdentityPolicy;
}): CommandExample {
  const payload: Record<string, unknown> = {
    command: params.command,
    resource: params.resource,
    action: params.action,
    args: exampleValue(params.schema),
  };

  if (params.defaultIdentity === 'user_only' || params.defaultIdentity === 'user_preferred') {
    payload.identity = 'user';
  } else if (params.defaultIdentity === 'tenant_only' || params.defaultIdentity === 'tenant_preferred') {
    payload.identity = 'tenant';
  }

  return {
    title: `${params.command} ${params.resource} ${params.action}`,
    payload,
  };
}
