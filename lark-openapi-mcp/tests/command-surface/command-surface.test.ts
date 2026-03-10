import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildCommandRegistry } from '../../src/command-surface';
import { LarkMcpTool } from '../../src/mcp-tool/mcp-tool';
import { filterTools } from '../../src/mcp-tool/utils/filter-tools';
import { larkOapiHandler } from '../../src/mcp-tool/utils/handler';
import { TokenMode } from '../../src/mcp-tool/types';

jest.mock('../../src/mcp-tool/utils/filter-tools');
jest.mock('../../src/mcp-tool/utils/handler');

const mockLarkOapiHandler = jest.fn();
jest.mocked(larkOapiHandler).mockImplementation(mockLarkOapiHandler);

const mockServer = {
  tool: jest.fn(),
} as unknown as McpServer;

describe('command surface registry', () => {
  it('maps raw tools into command/resource/action targets', () => {
    const registry = buildCommandRegistry([
      {
        project: 'im',
        name: 'im.v1.message.create',
        description: '[Feishu/Lark]-IM-Message-Create-Create a message',
        schema: z.object({ data: z.object({ receive_id: z.string() }) }),
        accessTokens: ['user', 'tenant'],
      },
      {
        project: 'drive',
        name: 'drive.v1.permissionMember.transferOwner',
        description: '[Feishu/Lark]-Drive-Permission-Transfer owner-Transfer owner',
        schema: z.object({ path: z.object({ token: z.string() }) }),
        accessTokens: ['user', 'tenant'],
      },
      {
        project: 'docx',
        name: 'docx.builtin.search',
        description: 'Search docs',
        schema: z.object({ data: z.object({ search_key: z.string() }) }),
        accessTokens: ['user', 'tenant'],
      },
    ]);

    expect(registry.map((item) => item.helpTarget)).toEqual(
      expect.arrayContaining(['chat.message.create', 'perm.permission-member.transfer-owner', 'doc.document.search']),
    );
  });
});

describe('command surface registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (filterTools as jest.Mock).mockReturnValue([
      {
        name: 'im.v1.message.create',
        description: 'Create a message',
        schema: z.object({ data: z.object({ receive_id: z.string(), content: z.string() }) }),
        project: 'im',
        accessTokens: ['user', 'tenant'],
        sdkName: 'im.message.create',
      },
    ]);
  });

  it('registers only facade tools on the public MCP server', () => {
    const larkMcpTool = new LarkMcpTool({
      client: {} as any,
      tokenMode: TokenMode.AUTO,
    });
    larkMcpTool.updateUserAccessToken('user-token');

    larkMcpTool.registerCommandMcpServer(mockServer, { toolNameCase: 'snake' });

    expect((mockServer.tool as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'ls',
      'help',
      'run',
      'explain',
    ]);
  });

  it('routes lark_run into the mapped raw tool and wraps the result', async () => {
    mockLarkOapiHandler.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message_id: 'om_123', url: 'https://example.com/message/om_123' }),
        },
      ],
    });

    const larkMcpTool = new LarkMcpTool({
      client: {} as any,
      tokenMode: TokenMode.AUTO,
    });

    larkMcpTool.registerCommandMcpServer(mockServer, { toolNameCase: 'snake' });
    const runHandler = (mockServer.tool as jest.Mock).mock.calls.find((call) => call[0] === 'run')?.[3];

    const result = await runHandler({
      command: 'chat',
      resource: 'message',
      action: 'create',
      args: {
        data: {
          receive_id: 'oc_xxx',
          content: '{"text":"hello"}',
        },
      },
    });

    expect(mockLarkOapiHandler).toHaveBeenCalledWith(
      expect.anything(),
      {
        data: {
          receive_id: 'oc_xxx',
          content: '{"text":"hello"}',
        },
        useUAT: false,
      },
      { tool: expect.objectContaining({ name: 'im.v1.message.create' }) },
    );

    const payload = JSON.parse(result.content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.cite.raw_tool).toBe('im.v1.message.create');
    expect(payload.target).toBe('chat.message.create');
  });

  it('adapts legacy task comment mentions into v1 rich_content payload', async () => {
    const larkMcpTool = new LarkMcpTool({
      client: {} as any,
      tokenMode: TokenMode.AUTO,
    });
    const result = (larkMcpTool as any).buildLegacyTaskCommentArgs(
      {
        path: { task_id: 't100073' },
        mentions: [{ user_id: 'ou_xxx', user_id_type: 'open_id' }],
        data: {
          content: '请处理',
        },
      },
    );

    expect(result).toEqual({
      path: { task_id: 't100073' },
      params: { user_id_type: 'open_id' },
      data: {
        rich_content: '<at id=ou_xxx></at> 请处理',
      },
    });
  });

  it('adapts v2 task comments with mentions into string content using <at id=...></at>', async () => {
    const larkMcpTool = new LarkMcpTool({
      client: {} as any,
      tokenMode: TokenMode.AUTO,
    });

    const result = (larkMcpTool as any).buildV2TaskCommentArgs({
      mentions: [{ user_id: 'ou_xxx', user_id_type: 'open_id' }],
      data: { content: '请处理', resource_type: 'task', resource_id: 'task_guid_1' },
    });

    expect(result).toEqual({
      data: {
        content: '<at id=ou_xxx></at> 请处理',
        resource_type: 'task',
        resource_id: 'task_guid_1',
      },
    });
  });

});
