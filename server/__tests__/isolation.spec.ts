import { EventEmitter } from 'events';
import { describe, it, expect, beforeEach } from 'vitest';
import { NodeService } from '@server/modules/knowledge/services/node.service';
import { TaskService } from '@server/modules/knowledge/services/task.service';
import { HistoryService } from '@server/modules/knowledge/services/history.service';
import { filterByConditions, selectColumns, buildSelectQuery } from '@server/__tests__/test-helper';

type NodeRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  x: number;
  y: number;
  isCenter: boolean;
  userId: number;
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  taskType: string;
  dueDate: string | null;
  sortOrder: number;
  isStarred: boolean;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
};

function createMockDb(opts: {
  nodes?: NodeRow[];
  tasks?: TaskRow[];
} = {}) {
  const nodes: NodeRow[] = [...(opts.nodes ?? [])];
  const tasks: TaskRow[] = [...(opts.tasks ?? [])];

  const isNodeTable = (table: any): boolean => {
    const name = table?.[Symbol.for('drizzle:Name')] ?? table?.name ?? '';
    if (name) return name.includes('node');
    return opts.nodes !== undefined && opts.tasks === undefined;
  };

  return {
    select: (cols: Record<string, any>) => ({
      from: (table: any) => {
        const store = isNodeTable(table) ? nodes : tasks;
        return buildSelectQuery(store as any[], cols);
      },
    }),
    delete: (table: any) => ({
      where: (cond: any) => ({
        returning: (cols: Record<string, any>) => {
          const store = isNodeTable(table) ? nodes : tasks;
          const filtered = filterByConditions(store as any[], cond);
          const ids = new Set(filtered.map((t: any) => t.id));
          for (let i = (store as any[]).length - 1; i >= 0; i--) {
            if (ids.has((store as any[])[i].id)) {
              (store as any[]).splice(i, 1);
            }
          }
          return Promise.resolve(selectColumns(filtered, cols));
        },
      }),
    }),
  };
}

function createMockHistoryService() {
  return {
    recordHistory: () => Promise.resolve(),
  } as unknown as HistoryService;
}

describe('用户隔离', () => {
  it('用户A不能看到用户B的节点', async () => {
    const dbMock = createMockDb({
      nodes: [
        { id: 'n1', name: 'A的节点', description: null, icon: '🌟', color: '#ffc', x: 0, y: 0, isCenter: false, userId: 1 },
        { id: 'n2', name: 'B的节点', description: null, icon: '🔥', color: '#f00', x: 100, y: 100, isCenter: false, userId: 2 },
      ],
    });

    const eventEmitter = new EventEmitter();
    const nodeService = new NodeService(
      dbMock as unknown as Parameters<typeof NodeService.prototype.constructor>[0],
      eventEmitter,
    );

    const userANodes = await nodeService.getNodes(1);
    expect(userANodes.length).toBe(1);
    expect(userANodes[0].name).toBe('A的节点');

    const userBNodes = await nodeService.getNodes(2);
    expect(userBNodes.length).toBe(1);
    expect(userBNodes[0].name).toBe('B的节点');
  });

  it('用户A不能删除用户B的任务', async () => {
    const now = new Date();
    const dbMock = createMockDb({
      tasks: [
        {
          id: 't-user-a',
          title: 'A的任务',
          status: 'todo',
          taskType: 'learning',
          dueDate: null,
          sortOrder: 1,
          isStarred: false,
          userId: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 't-user-b',
          title: 'B的任务',
          status: 'todo',
          taskType: 'learning',
          dueDate: null,
          sortOrder: 1,
          isStarred: false,
          userId: 2,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const eventEmitter = new EventEmitter();
    const taskService = new TaskService(
      dbMock as unknown as Parameters<typeof TaskService.prototype.constructor>[0],
      eventEmitter,
      createMockHistoryService(),
    );

    const result = await taskService.deleteActionTask('t-user-b', 1);
    expect(result).toBe(false);

    const userBTasks = await taskService.getActionTasks(2);
    expect(userBTasks.length).toBe(1);
    expect(userBTasks[0].id).toBe('t-user-b');
  });
});
