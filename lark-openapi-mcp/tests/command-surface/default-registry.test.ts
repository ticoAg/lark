import { buildCommandRegistry } from '../../src/command-surface';
import { defaultToolNames } from '../../src/mcp-tool/constants';
import { AllTools, ToolName } from '../../src/mcp-tool/tools';
import { filterTools } from '../../src/mcp-tool/utils/filter-tools';

describe('default command surface coverage', () => {
  it('covers the major default facade domains with representative targets', () => {
    const registry = buildCommandRegistry(filterTools(AllTools, { allowTools: defaultToolNames }));
    const commands = new Set(registry.map((spec) => spec.command));

    expect([...commands].sort()).toEqual([
      'base',
      'calendar',
      'chat',
      'doc',
      'drive',
      'group',
      'perm',
      'task',
      'user',
      'wiki',
    ]);

    expect(registry.map((spec) => spec.helpTarget)).toEqual(
      expect.arrayContaining([
        'doc.document.search',
        'doc.document.import',
        'drive.folder.create',
        'chat.message.create',
        'group.chat.create',
        'base.app.create',
        'wiki.node.search',
        'perm.permission-member.transfer-owner',
        'user.user.lookup-id',
        'calendar.calendar-event.create',
        'task.task.create',
      ]),
    );
  });

  it('keeps representative identity policies for permission, task, and calendar actions', () => {
    const registry = buildCommandRegistry(filterTools(AllTools, { allowTools: defaultToolNames }));
    const find = (target: string) => registry.find((spec) => spec.helpTarget === target);

    expect(find('perm.permission-member.transfer-owner')?.defaultIdentity).toBe('user_preferred');
    expect(find('calendar.calendar-event.create')?.defaultIdentity).toBe('dual');
    expect(find('task.task.create')?.defaultIdentity).toBe('dual');
  });

  it('does not expose deprecated duplicate branches such as task.task-2', () => {
    const registry = buildCommandRegistry(
      filterTools(AllTools, { allowTools: AllTools.map((tool) => tool.name as ToolName) }),
    );

    expect(registry.find((spec) => spec.helpTarget === 'task.task-2.create')).toBeUndefined();
    expect(registry.find((spec) => spec.helpTarget === 'task.task.create')?.rawToolName).toBe('task.v2.task.create');
  });
});
