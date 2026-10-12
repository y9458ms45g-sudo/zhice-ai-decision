import { EventEmitter } from 'events';
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService } from '../task.service';
import { HistoryService } from '../history.service';
import type { CreateActionTaskRequest, UpdateActionTaskRequest } from '@shared/api.interface';
import { filterByConditions, selectColumns, buildSelectQuery } from '@server/__tests__/test-helper';

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

function createMockDb(initialTasks: TaskRow[] = []) {
  let tasks: TaskRow[] = [...initialTasks];
  let nextId = initialTasks.length + 1;

  return {
    select: (cols: Record<string, any>) => ({
      from: (_table: unknown) => buildSelectQuery(tasks, cols),
    }),
    insert: (_table: unknown) => ({
      values: (vals: Partial<TaskRow>) => ({
        returning: (cols: Record<string, any>) => {
          const now = new Date();
          const newTask: TaskRow = {
            id: `task-${nextId++}`,
            title: vals.title ?? '',
            status: vals.status ?? 'todo',
            taskType: vals.taskType ?? 'learning',
            dueDate: vals.dueDate ?? null,
            sortOrder: vals.sortOrder ?? 0,
            isStarred: vals.isStarred ?? false,
            userId: vals.userId ?? 0,
            createdAt: now,
            updatedAt: now,
          };
          tasks.push(newTask);
          return Promise.resolve(selectColumns([newTask], cols));
        },
      }),
    }),
    update: (_table: unknown) => ({
      set: (patch: Partial<TaskRow>) => ({
        where: (cond: any) => ({
          returning: (cols: Record<string, any>) => {
            const filtered = filterByConditions(tasks, cond);
            if (filtered.length === 0) return Promise.resolve([]);
            const idx = tasks.indexOf(filtered[0]);
            tasks[idx] = { ...tasks[idx], ...patch, updatedAt: new Date() };
            return Promise.resolve(selectColumns([tasks[idx]], cols));
          },
        }),
      }),
    }),
    delete: (_table: unknown) => ({
      where: (cond: any) => ({
        returning: (cols: Record<string, any>) => {
          const filtered = filterByConditions(tasks, cond);
          const ids = new Set(filtered.map((t) => t.id));
          tasks = tasks.filter((t) => !ids.has(t.id));
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

describe('TaskService', () => {
  let eventEmitter: EventEmitter;
  let service: TaskService;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    const now = new Date();
    const mockDb = createMockDb([
      {
        id: 'task-1',
        title: '学习React',
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
        id: 'task-2',
        title: '刷题100道',
        status: 'done',
        taskType: 'learning',
        dueDate: null,
        sortOrder: 2,
        isStarred: true,
        userId: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-3',
        title: '别人的任务',
        status: 'todo',
        taskType: 'learning',
        dueDate: null,
        sortOrder: 1,
        isStarred: false,
        userId: 2,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    service = new TaskService(
      mockDb as unknown as Parameters<typeof TaskService.prototype.constructor>[0],
      eventEmitter,
      createMockHistoryService(),
    );
  });

  it('createTask: 新建任务自动带上user_id', async () => {
    const dto: CreateActionTaskRequest = { title: '新任务', taskType: 'learning' };
    const result = await service.createActionTask(dto, 1);
    expect(result.title).toBe('新任务');
    expect(result.status).toBe('todo');

    const user1Tasks = await service.getActionTasks(1);
    expect(user1Tasks.some((t) => t.title === '新任务')).toBe(true);

    const user2Tasks = await service.getActionTasks(2);
    expect(user2Tasks.some((t) => t.title === '新任务')).toBe(false);
  });

  it('updateTask: 能修改任务标题和状态', async () => {
    const dto: UpdateActionTaskRequest = { title: '学习React Hooks', status: 'done' };
    const result = await service.updateActionTask('task-1', dto, 1);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('学习React Hooks');
    expect(result?.status).toBe('done');
  });

  it('updateTask: 越权修改别人的任务返回null', async () => {
    const dto: UpdateActionTaskRequest = { title: '被篡改', status: 'done' };
    const result = await service.updateActionTask('task-3', dto, 1);
    expect(result).toBeNull();

    const user2Tasks = await service.getActionTasks(2);
    const task3 = user2Tasks.find((t) => t.id === 'task-3');
    expect(task3?.title).toBe('别人的任务');
    expect(task3?.status).toBe('todo');
  });

  it('getOverview: 正确统计总数、已完成数、待办数', async () => {
    const overview = await service.getActionTasksOverview(1);
    expect(overview.total).toBe(2);
    expect(overview.done).toBe(1);
    expect(overview.todo).toBe(1);
    expect(overview.inProgress).toBe(0);
  });
});
