import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and } from 'drizzle-orm';
import { nodes } from '@server/database/schema';
import type {
  KnowledgeNode,
  CreateNodeRequest,
  UpdateNodeRequest,
} from '@shared/api.interface';

@Injectable()
export class NodeService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject('KNOWLEDGE_EVENT_EMITTER') private readonly eventEmitter: EventEmitter,
  ) {}

  async getNodes(userId: number): Promise<KnowledgeNode[]> {
    const result = await this.db.select({
      id: nodes.id,
      name: nodes.name,
      description: nodes.description,
      icon: nodes.icon,
      color: nodes.color,
      x: nodes.x,
      y: nodes.y,
      isCenter: nodes.isCenter,
    }).from(nodes).where(eq(nodes.userId, userId));
    return result.map((n) => ({
      ...n,
      description: n.description ?? '',
      icon: n.icon ?? '',
    }));
  }

  async createNode(dto: CreateNodeRequest, userId: number): Promise<KnowledgeNode> {
    const [created] = await this.db.insert(nodes).values({
      name: dto.name,
      description: dto.description ?? '',
      icon: dto.icon ?? '',
      color: dto.color ?? '#FFC9DE',
      x: dto.x,
      y: dto.y,
      isCenter: dto.isCenter ?? false,
      userId,
    }).returning({
      id: nodes.id,
      name: nodes.name,
      description: nodes.description,
      icon: nodes.icon,
      color: nodes.color,
      x: nodes.x,
      y: nodes.y,
      isCenter: nodes.isCenter,
    });
    const result: KnowledgeNode = {
      ...created,
      description: created.description ?? '',
      icon: created.icon ?? '',
    };
    this.eventEmitter.emit('change', {
      type: 'node_created',
      payload: result,
      timestamp: Date.now(),
      userId,
    });
    return result;
  }

  async updateNode(id: string, dto: UpdateNodeRequest, userId: number): Promise<KnowledgeNode | null> {
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.icon !== undefined) patch.icon = dto.icon;
    if (dto.color !== undefined) patch.color = dto.color;
    if (dto.x !== undefined) patch.x = dto.x;
    if (dto.y !== undefined) patch.y = dto.y;
    if (dto.isCenter !== undefined) patch.isCenter = dto.isCenter;

    if (Object.keys(patch).length === 0) {
      const existing = await this.getNodes(userId).then(
        (list) => list.find((n) => n.id === id) ?? null,
      );
      return existing;
    }

    const [updated] = await this.db.update(nodes)
      .set(patch)
      .where(and(eq(nodes.id, id), eq(nodes.userId, userId)))
      .returning({
        id: nodes.id,
        name: nodes.name,
        description: nodes.description,
        icon: nodes.icon,
        color: nodes.color,
        x: nodes.x,
        y: nodes.y,
        isCenter: nodes.isCenter,
      });
    if (!updated) return null;
    const result: KnowledgeNode = {
      ...updated,
      description: updated.description ?? '',
      icon: updated.icon ?? '',
    };
    this.eventEmitter.emit('change', {
      type: 'node_updated',
      payload: result,
      timestamp: Date.now(),
      userId,
    });
    return result;
  }

  async deleteNode(id: string, userId: number): Promise<boolean> {
    const [deleted] = await this.db.delete(nodes)
      .where(and(eq(nodes.id, id), eq(nodes.userId, userId)))
      .returning({ id: nodes.id });
    if (deleted) {
      this.eventEmitter.emit('change', {
        type: 'node_deleted',
        payload: { id },
        timestamp: Date.now(),
        userId,
      });
    }
    return !!deleted;
  }
}
