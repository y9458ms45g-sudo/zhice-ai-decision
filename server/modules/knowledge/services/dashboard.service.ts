import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, count, gte, and, sql } from 'drizzle-orm';
import {
  nodes,
  edges,
  actionTasks,
  operationHistory,
  aiConversations,
} from '@server/database/schema';
import type { DashboardStats, DailyTaskCount } from '@shared/api.interface';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getStats(userId: number): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);

    const [
      nodesResult,
      edgesResult,
      tasksResult,
      doneTasksResult,
      todoTasksResult,
      inProgressTasksResult,
      aiCountResult,
      todayActivityResult,
      weekDoneResult,
      weekTotalResult,
      weeklyTaskCounts,
    ] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(nodes)
        .where(eq(nodes.userId, userId)),
      this.db
        .select({ count: count() })
        .from(edges)
        .where(eq(edges.userId, userId)),
      this.db
        .select({ count: count() })
        .from(actionTasks)
        .where(eq(actionTasks.userId, userId)),
      this.db
        .select({ count: count() })
        .from(actionTasks)
        .where(and(eq(actionTasks.userId, userId), eq(actionTasks.status, 'done'))),
      this.db
        .select({ count: count() })
        .from(actionTasks)
        .where(and(eq(actionTasks.userId, userId), eq(actionTasks.status, 'todo'))),
      this.db
        .select({ count: count() })
        .from(actionTasks)
        .where(
          and(eq(actionTasks.userId, userId), eq(actionTasks.status, 'in_progress')),
        ),
      this.db.select({ count: count() }).from(aiConversations),
      this.db
        .select({ count: count() })
        .from(operationHistory)
        .where(
          and(
            eq(operationHistory.userId, userId),
            gte(operationHistory.createdAt, todayStart),
          ),
        ),
      this.db
        .select({ count: count() })
        .from(actionTasks)
        .where(
          and(
            eq(actionTasks.userId, userId),
            eq(actionTasks.status, 'done'),
            gte(actionTasks.updatedAt, weekStart),
          ),
        ),
      this.db
        .select({ count: count() })
        .from(actionTasks)
        .where(
          and(
            eq(actionTasks.userId, userId),
            gte(actionTasks.updatedAt, weekStart),
          ),
        ),
      this.getWeeklyTaskCounts(userId, weekStart),
    ]);

    const totalTasks = Number(tasksResult[0]?.count ?? 0);
    const completedTasks = Number(doneTasksResult[0]?.count ?? 0);
    const weekDone = Number(weekDoneResult[0]?.count ?? 0);
    const weekTotal = Number(weekTotalResult[0]?.count ?? 0);

    const weeklyProgress = weekTotal > 0
      ? Math.round((weekDone / weekTotal) * 100)
      : totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    return {
      totalNodes: Number(nodesResult[0]?.count ?? 0),
      totalEdges: Number(edgesResult[0]?.count ?? 0),
      totalTasks,
      completedTasks,
      pendingTasks: Number(todoTasksResult[0]?.count ?? 0),
      inProgressTasks: Number(inProgressTasksResult[0]?.count ?? 0),
      aiSuggestionsCount: Number(aiCountResult[0]?.count ?? 0),
      todayActivity: Number(todayActivityResult[0]?.count ?? 0),
      weeklyProgress,
      weeklyTaskCounts,
    };
  }

  private async getWeeklyTaskCounts(
    userId: number,
    weekStart: Date,
  ): Promise<DailyTaskCount[]> {
    const rows = await this.db
      .select({
        date: sql<string>`DATE(${actionTasks.updatedAt})`,
        count: count(),
      })
      .from(actionTasks)
      .where(
        and(
          eq(actionTasks.userId, userId),
          eq(actionTasks.status, 'done'),
          gte(actionTasks.updatedAt, weekStart),
        ),
      )
      .groupBy(sql`DATE(${actionTasks.updatedAt})`)
      .orderBy(sql`DATE(${actionTasks.updatedAt})`);

    const byDate = new Map<string, number>();
    for (const row of rows) {
      byDate.set(row.date, Number(row.count));
    }

    const result: DailyTaskCount[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({
        date: dateStr,
        count: byDate.get(dateStr) ?? 0,
      });
    }
    return result;
  }
}
