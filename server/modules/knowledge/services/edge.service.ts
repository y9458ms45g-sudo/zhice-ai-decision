import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and } from 'drizzle-orm';
import { edges } from '@server/database/schema';
import type {
  KnowledgeEdge,
  CreateEdgeRequest,
} from '@shared/api.interface';

@Injectable()
export class EdgeService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject('KNOWLEDGE_EVENT_EMITTER') private readonly eventEmitter: EventEmitter,
  ) {}

  async getEdges(userId: number): Promise<KnowledgeEdge[]> {
    const result = await this.db.select({
      id: edges.id,
      fromNode: edges.fromNode,
      toNode: edges.toNode,
    }).from(edges).where(eq(edges.userId, userId));
    return result;
  }

  async createEdge(dto: CreateEdgeRequest, userId: number): Promise<KnowledgeEdge> {
    const [created] = await this.db.insert(edges).values({
      fromNode: dto.fromNode,
      toNode: dto.toNode,
      userId,
    }).returning({
      id: edges.id,
      fromNode: edges.fromNode,
      toNode: edges.toNode,
    });
    this.eventEmitter.emit('change', {
      type: 'edge_created',
      payload: created,
      timestamp: Date.now(),
      userId,
    });
    return created;
  }

  async deleteEdge(id: string, userId: number): Promise<boolean> {
    const [deleted] = await this.db.delete(edges)
      .where(and(eq(edges.id, id), eq(edges.userId, userId)))
      .returning({ id: edges.id });
    if (deleted) {
      this.eventEmitter.emit('change', {
        type: 'edge_deleted',
        payload: { id },
        timestamp: Date.now(),
        userId,
      });
    }
    return !!deleted;
  }
}
