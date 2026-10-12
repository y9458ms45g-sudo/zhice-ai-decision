import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, count, gte, lt, sql, and, desc } from 'drizzle-orm';
import { actionTasks } from '@server/database/schema';
import type {
  ActionTask,
  ActionTaskStatus,
  ActionTaskType,
  ActionTasksOverview,
  CreateActionTaskRequest,
  UpdateActionTaskRequest,
  UserStatsResponse,
} from '@shared/api.interface';
import { HistoryService } from './history.service';

@Injectable()
export class TaskService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject('KNOWLEDGE_EVENT_EMITTER') private readonly eventEmitter: EventEmitter,
    private readonly historyService: HistoryService,
  ) {}

  async getActionTasks(userId: number): Promise<ActionTask[]> {
    const rows = await this.db
      .select({
        id: actionTasks.id,
        title: actionTasks.title,
        status: actionTasks.status,
        taskType: actionTasks.taskType,
        dueDate: actionTasks.dueDate,
        sortOrder: actionTasks.sortOrder,
        isStarred: actionTasks.isStarred,
      })
      .from(actionTasks)
      .where(eq(actionTasks.userId, userId))
      .orderBy(actionTasks.dueDate, actionTasks.sortOrder, actionTasks.createdAt);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status as ActionTaskStatus,
      taskType: row.taskType as ActionTaskType,
      dueDate: row.dueDate ?? null,
      sortOrder: row.sortOrder,
      isStarred: row.isStarred ?? false,
    }));
  }

  async getActionTasksOverview(userId: number): Promise<ActionTasksOverview> {
    const all = await this.db
      .select({ status: actionTasks.status })
      .from(actionTasks)
      .where(eq(actionTasks.userId, userId));
    const total = all.length;
    const done = all.filter((r) => r.status === 'done').length;
    const inProgress = all.filter((r) => r.status === 'in_progress').length;
    const todo = all.filter((r) => r.status === 'todo').length;

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekDoneResult = await this.db
      .select({ count: count() })
      .from(actionTasks)
      .where(
        and(
          eq(actionTasks.userId, userId),
          eq(actionTasks.status, 'done'),
          gte(actionTasks.updatedAt, weekStart),
          lt(actionTasks.updatedAt, weekEnd),
        ),
      );
    const weekDone = Number(weekDoneResult[0]?.count ?? 0);

    return { total, done, inProgress, todo, weekDone, weekTotal: total };
  }

  async createActionTask(dto: CreateActionTaskRequest, userId: number): Promise<ActionTask> {
    const maxSortResult = await this.db
      .select({ max: sql<number>`coalesce(max(${actionTasks.sortOrder}), 0)` })
      .from(actionTasks)
      .where(eq(actionTasks.userId, userId));
    const nextSort = Number(maxSortResult[0]?.max ?? 0) + 1;

    const [created] = await this.db
      .insert(actionTasks)
       .values({
        title: dto.title,
        status: dto.status ?? 'todo',
        taskType: dto.taskType ?? 'learning',
        dueDate: dto.dueDate ?? null,
        sortOrder: nextSort,
        isStarred: dto.isStarred ?? false,
        userId,
      })
      .returning({
        id: actionTasks.id,
        title: actionTasks.title,
        status: actionTasks.status,
        taskType: actionTasks.taskType,
        dueDate: actionTasks.dueDate,
        sortOrder: actionTasks.sortOrder,
        isStarred: actionTasks.isStarred,
      });

    const result = {
      id: created.id,
      title: created.title,
      status: created.status as ActionTaskStatus,
      taskType: created.taskType as ActionTaskType,
      dueDate: created.dueDate ?? null,
      sortOrder: created.sortOrder,
      isStarred: created.isStarred ?? false,
    };

    this.eventEmitter.emit('change', {
      type: 'action_task_created',
      payload: result,
      timestamp: Date.now(),
      userId,
    });

    this.historyService.recordHistory('task_create', `创建了任务「${result.title}」`, {
      taskId: result.id,
      title: result.title,
      status: result.status,
      taskType: result.taskType,
    }, userId);

    return result;
  }

  async updateActionTask(
    id: string,
    dto: UpdateActionTaskRequest,
    userId: number,
  ): Promise<ActionTask | null> {
    const patch: Partial<typeof actionTasks.$inferInsert> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.taskType !== undefined) patch.taskType = dto.taskType;
    if (dto.dueDate !== undefined) patch.dueDate = dto.dueDate ?? null;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.isStarred !== undefined) patch.isStarred = dto.isStarred;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const [updated] = await this.db
      .update(actionTasks)
      .set(patch)
      .where(and(eq(actionTasks.id, id), eq(actionTasks.userId, userId)))
      .returning({
        id: actionTasks.id,
        title: actionTasks.title,
        status: actionTasks.status,
        taskType: actionTasks.taskType,
        dueDate: actionTasks.dueDate,
        sortOrder: actionTasks.sortOrder,
        isStarred: actionTasks.isStarred,
      });

    if (!updated) {
      return null;
    }

    const result = {
      id: updated.id,
      title: updated.title,
      status: updated.status as ActionTaskStatus,
      taskType: updated.taskType as ActionTaskType,
      dueDate: updated.dueDate ?? null,
      sortOrder: updated.sortOrder,
      isStarred: updated.isStarred ?? false,
    };

    this.eventEmitter.emit('change', {
      type: 'action_task_updated',
      payload: result,
      timestamp: Date.now(),
      userId,
    });

    if (dto.status === 'done') {
      this.historyService.recordHistory('task_complete', `完成了任务「${result.title}」`, {
        taskId: result.id,
        title: result.title,
      }, userId);
    } else if (dto.status !== undefined) {
      this.historyService.recordHistory('task_status_change', `任务「${result.title}」状态变更为${dto.status}`, {
        taskId: result.id,
        title: result.title,
        status: dto.status,
      }, userId);
    }

    return result;
  }

  async deleteActionTask(id: string, userId: number): Promise<boolean> {
    const deleted = await this.db
      .delete(actionTasks)
      .where(and(eq(actionTasks.id, id), eq(actionTasks.userId, userId)))
      .returning({ id: actionTasks.id });
    const success = deleted.length > 0;
    if (success) {
      this.eventEmitter.emit('change', {
        type: 'action_task_deleted',
        payload: { id },
        timestamp: Date.now(),
        userId,
      });
      this.historyService.recordHistory('task_delete', '删除了一个任务', {
        taskId: id,
      }, userId);
    }
    return success;
  }

  async getUserStats(): Promise<UserStatsResponse> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const weekStartIso = weekStart.toISOString();

    const [weekDone, totalDone, lastAi] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(actionTasks)
        .where(
          and(
            eq(actionTasks.status, 'done'),
            gte(actionTasks.updatedAt, weekStart),
          ),
        ),
      this.db
        .select({ count: count() })
        .from(actionTasks)
        .where(eq(actionTasks.status, 'done')),
      this.db
        .select({ createdAt: actionTasks.updatedAt })
        .from(actionTasks)
        .orderBy(desc(actionTasks.updatedAt))
        .limit(1),
    ]);

    const streakDays = await this.calculateStreakDays();

    return {
      weekCompletedTasks: Number(weekDone[0]?.count ?? 0),
      totalCompletedTasks: Number(totalDone[0]?.count ?? 0),
      streakDays,
      lastAiSuggestionAt: lastAi[0]?.createdAt?.toISOString() ?? null,
    };
  }

  private async calculateStreakDays(): Promise<number> {
    const completed = await this.db
      .select({ updatedAt: actionTasks.updatedAt, status: actionTasks.status })
      .from(actionTasks)
      .where(eq(actionTasks.status, 'done'))
      .orderBy(desc(actionTasks.updatedAt))
      .limit(100);

    if (completed.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const dates = new Set<string>();
    for (const row of completed) {
      const d = new Date(row.updatedAt);
      d.setHours(0, 0, 0, 0);
      dates.add(d.toISOString().slice(0, 10));
    }

    let streak = 0;
    const cursor = new Date(today);
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    if (streak === 0 && dates.has(todayStr)) {
      streak = 1;
    }

    return streak;
  }
}
