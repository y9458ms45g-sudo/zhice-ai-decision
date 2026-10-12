import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, count, desc } from 'drizzle-orm';
import { operationHistory, activityLogs } from '@server/database/schema';
import type {
  ActivityLogsResponse,
  OperationHistoryResponse,
  CreateOperationHistoryRequest,
  CreateActivityLogRequest,
} from '@shared/api.interface';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getOperationHistory(
    limit: number,
    offset: number,
    userId: number,
  ): Promise<OperationHistoryResponse> {
    const [itemsResult, countResult] = await Promise.all([
      this.db
        .select({
          id: operationHistory.id,
          actionType: operationHistory.actionType,
          description: operationHistory.description,
          detail: operationHistory.detail,
          createdAt: operationHistory.createdAt,
        })
        .from(operationHistory)
        .where(eq(operationHistory.userId, userId))
        .orderBy(desc(operationHistory.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() })
        .from(operationHistory)
        .where(eq(operationHistory.userId, userId)),
    ]);

    return {
      items: itemsResult.map((item) => ({
        id: item.id,
        actionType: item.actionType,
        description: item.description,
        detail: item.detail as Record<string, unknown> | undefined,
        createdAt: item.createdAt.toISOString(),
      })),
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async createOperationHistory(
    dto: CreateOperationHistoryRequest,
    userId: number,
  ): Promise<void> {
    const description = dto.description.slice(0, 500);
    const actionType = dto.actionType.slice(0, 30);
    await this.db.insert(operationHistory).values({
      actionType,
      description,
      detail: dto.detail as Record<string, unknown> | undefined,
      userId,
    });
  }

  recordHistory(
    actionType: string,
    description: string,
    detail?: Record<string, unknown>,
    userId?: number,
  ): void {
    void this.db.insert(operationHistory).values({
      actionType: actionType.slice(0, 30),
      description: description.slice(0, 500),
      detail,
      userId: userId ?? 1,
    }).catch((err) => {
      this.logger.error('记录操作历史失败', err);
    });
  }

  async getActivityLogs(limit: number): Promise<ActivityLogsResponse> {
    const [items, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: activityLogs.id,
          actionType: activityLogs.actionType,
          content: activityLogs.content,
          createdAt: activityLogs.createdAt,
        })
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit),
      this.db
        .select({ total: count() })
        .from(activityLogs),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      total: Number(total),
    };
  }

  async createActivityLog(dto: CreateActivityLogRequest): Promise<void> {
    const content = dto.content.slice(0, 500);
    await this.db.insert(activityLogs).values({
      actionType: dto.actionType,
      content,
    });
  }
}
