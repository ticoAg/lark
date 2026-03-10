# Command Surface Migration Guide

This guide helps existing `lark-mcp` users migrate from the old raw OpenAPI MCP surface to the new command-oriented facade.

## What changed

The public MCP surface now exposes 4 stable tools instead of registering every raw OpenAPI tool directly:

- `ls`
- `help`
- `run`
- `explain`

The new mental model is:

- `command`
- `resource`
- `action`

Examples:

- `doc document search`
- `drive folder create`
- `chat message create`
- `perm permission-member transfer-owner`

Raw OpenAPI tools still exist internally as the execution and mapping layer, but they are no longer the default public tool interface.

Deprecated APIs marked by Feishu/Lark as `Deprecated Version (Not Recommended)` are filtered out by default. Only APIs explicitly listed in `--deprecated-tools` are re-enabled.

## Breaking changes

### 1. Public tool names changed

Old clients that directly invoked names such as `docx_builtin_search` or `im_v1_message_create` must migrate to facade calls through `run`.

### 2. `-t/--tools` semantics changed

`-t/--tools` no longer changes the public tool names visible to the client.

It now limits which raw capabilities are available behind the facade.

If you must temporarily use a specific deprecated API, list it in `--deprecated-tools`. `-t/--tools` alone is not enough.

That means:

- public tool names stay the same (`ls`, `help`, `run`, `explain`)
- enabled raw tools affect what `ls` can discover and what `run` can execute

### 3. Results are now wrapped

`run` returns a normalized envelope instead of the raw tool result directly.

Common fields include:

- `ok`
- `target`
- `summary`
- `data`
- `next`
- `cite`

The `cite` object includes traceability fields such as:

- `help_target`
- `raw_tool`
- `docs_url`
- `resource_url`
- `resource_tokens`

### 4. Identity is explicit at the facade layer

Instead of teaching users to toggle raw `useUAT`, the facade uses:

- `identity: "auto"`
- `identity: "user"`
- `identity: "tenant"`

Use `help` to inspect the default identity policy of a target before executing it.

## Old to new mapping

These examples show the common migration pattern from raw tools to the command surface.

| Old raw tool | New facade target | Example |
| --- | --- | --- |
| `docx.builtin.search` | `doc.document.search` | `run(command=\"doc\", resource=\"document\", action=\"search\")` |
| `docx.builtin.import` | `doc.document.import` | `run(command=\"doc\", resource=\"document\", action=\"import\")` |
| `drive.v1.file.createFolder` | `drive.folder.create` | `run(command=\"drive\", resource=\"folder\", action=\"create\")` |
| `im.v1.message.create` | `chat.message.create` | `run(command=\"chat\", resource=\"message\", action=\"create\")` |
| `drive.v1.permissionMember.transferOwner` | `perm.permission-member.transfer-owner` | `run(command=\"perm\", resource=\"permission-member\", action=\"transfer-owner\")` |
| `contact.v3.user.batchGetId` | `user.user.lookup-id` | `run(command=\"user\", resource=\"user\", action=\"lookup-id\")` |

## Migration examples

### Search documents

Old raw tool shape:

```json
{
  "tool": "docx_builtin_search",
  "args": {
    "data": {
      "search_key": "Q4",
      "count": 10
    },
    "useUAT": true
  }
}
```

New facade shape:

```json
{
  "tool": "run",
  "args": {
    "command": "doc",
    "resource": "document",
    "action": "search",
    "identity": "user",
    "args": {
      "data": {
        "search_key": "Q4",
        "count": 10
      }
    }
  }
}
```

### Send a message

Old raw tool shape:

```json
{
  "tool": "im_v1_message_create",
  "args": {
    "params": {
      "receive_id_type": "chat_id"
    },
    "data": {
      "receive_id": "oc_xxxxx",
      "msg_type": "text",
      "content": "{\"text\":\"hello\"}"
    }
  }
}
```

New facade shape:

```json
{
  "tool": "run",
  "args": {
    "command": "chat",
    "resource": "message",
    "action": "create",
    "identity": "tenant",
    "args": {
      "params": {
        "receive_id_type": "chat_id"
      },
      "data": {
        "receive_id": "oc_xxxxx",
        "msg_type": "text",
        "content": "{\"text\":\"hello\"}"
      }
    }
  }
}
```

## Recommended migration workflow

1. Replace raw tool calls with `run`
2. Replace raw tool discovery with `ls`
3. Replace prompt-side parameter guessing with `help`
4. Replace ad hoc error retry logic with `explain`

Recommended rollout checklist:

1. Update your system prompt or skill to teach `command/resource/action`
2. Replace raw tool examples in docs and fixtures
3. Verify `ls` shows the expected targets under your current `-t/--tools` config
4. Verify each migrated action returns the expected `cite.raw_tool`

## Common errors after migration

### `No matching command target found`

Cause:

- wrong `command/resource/action`
- the raw capability is not enabled by the current preset or `-t/--tools`

What to do:

1. Run `ls`
2. Narrow with `help`
3. If needed, enable a broader preset such as `preset.doc.default`, `preset.task.default`, or `preset.calendar.default`

### Permission or token errors

Cause:

- expired `user_access_token`
- missing OAuth scope
- wrong identity mode

What to do:

Use `explain`:

```json
{
  "target": "doc.document.search",
  "error": "Current user_access_token is invalid or expired"
}
```

or:

```json
{
  "target": "perm.permission-member.transfer-owner",
  "error": "{\"code\":99991663,\"msg\":\"user_access_token unauthorized\"}"
}
```

`explain` is the preferred way to explain:

- token invalid / expired
- missing permission scope
- tenant vs user identity mismatch
- likely next steps such as using `help` on the same target

### Result shape changed unexpectedly

Cause:

- clients still expect the raw response body as the top-level output

What to do:

Read from `data` for the business payload and use `cite.raw_tool` if you still need to correlate with the legacy raw tool.

## Verification

After migration, verify these basics:

1. `ls` returns the expected command tree
2. `help(target=...)` resolves each migrated target
3. `run(...)` returns `ok`, `target`, and `cite.raw_tool`
4. `explain(...)` gives actionable suggestions for token / permission failures
