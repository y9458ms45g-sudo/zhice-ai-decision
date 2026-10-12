import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '@server/common/guards/jwt-auth.guard';
import { NodeService } from './services/node.service';
import { EdgeService } from './services/edge.service';
import { CardService } from './services/card.service';
import { TaskService } from './services/task.service';
import { HistoryService } from './services/history.service';
import { AiService } from './services/ai.service';
import { GraphService } from './services/graph.service';
import { DashboardService } from './services/dashboard.service';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraphData,
  CardContent,
  CreateNodeRequest,
  UpdateNodeRequest,
  CreateEdgeRequest,
  UpdateCardContentRequest,
  BatchUpdateCardsRequest,
  AiAnalyzeResponse,
  ActionTask,
  ActionTasksOverview,
  CreateActionTaskRequest,
  UpdateActionTaskRequest,
  ActivityLogsResponse,
  AiConversationsResponse,
  UserStatsResponse,
  CreateActivityLogRequest,
  OperationHistoryResponse,
  CreateOperationHistoryRequest,
  DashboardStats,
} from '@shared/api.interface';

@Controller('api/knowledge')
export class KnowledgeController {
  constructor(
    private readonly nodeService: NodeService,
    private readonly edgeService: EdgeService,
    private readonly cardService: CardService,
    private readonly taskService: TaskService,
    private readonly historyService: HistoryService,
    private readonly aiService: AiService,
    private readonly graphService: GraphService,
    private readonly dashboardService: DashboardService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('graph')
  async getGraph(@Req() req: Request): Promise<KnowledgeGraphData> {
    return this.graphService.getGraph(req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('init')
  async initGraph(@Req() req: Request): Promise<KnowledgeGraphData> {
    return this.graphService.initDefaultGraph(req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('nodes')
  async getNodes(@Req() req: Request): Promise<KnowledgeNode[]> {
    return this.nodeService.getNodes(req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('nodes')
  async createNode(
    @Req() req: Request,
    @Body() dto: CreateNodeRequest,
  ): Promise<KnowledgeNode> {
    if (!dto.name) throw new BadRequestException('节点名称不能为空');
    return this.nodeService.createNode(dto, req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('nodes/:id')
  async updateNode(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateNodeRequest,
  ): Promise<KnowledgeNode> {
    const node = await this.nodeService.updateNode(id, dto, req.user!.user_id);
    if (!node) throw new ForbiddenException('节点不存在或无权操作');
    return node;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('nodes/:id')
  async deleteNode(@Req() req: Request, @Param('id') id: string): Promise<void> {
    const deleted = await this.nodeService.deleteNode(id, req.user!.user_id);
    if (!deleted) throw new ForbiddenException('节点不存在或无权操作');
  }

  @UseGuards(JwtAuthGuard)
  @Get('edges')
  async getEdges(@Req() req: Request): Promise<KnowledgeEdge[]> {
    return this.edgeService.getEdges(req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('edges')
  async createEdge(
    @Req() req: Request,
    @Body() dto: CreateEdgeRequest,
  ): Promise<KnowledgeEdge> {
    if (!dto.fromNode || !dto.toNode) {
      throw new BadRequestException('连线两端不能为空');
    }
    return this.edgeService.createEdge(dto, req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('edges/:id')
  async deleteEdge(@Req() req: Request, @Param('id') id: string): Promise<void> {
    const deleted = await this.edgeService.deleteEdge(id, req.user!.user_id);
    if (!deleted) throw new ForbiddenException('连线不存在或无权操作');
  }

  @UseGuards(JwtAuthGuard)
  @Get('cards')
  async getCards(@Req() req: Request): Promise<CardContent[]> {
    return this.cardService.getCards(req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cards/:sectionKey')
  async updateCard(
    @Req() req: Request,
    @Param('sectionKey') sectionKey: string,
    @Body() dto: UpdateCardContentRequest,
  ): Promise<CardContent> {
    const card = await this.cardService.upsertCard(sectionKey, dto.content, req.user!.user_id);
    if (!card) throw new ForbiddenException('卡片不存在或无权操作');
    return card;
  }

  @UseGuards(JwtAuthGuard)
  @Post('cards/batch')
  async batchUpdateCards(
    @Req() req: Request,
    @Body() dto: BatchUpdateCardsRequest,
  ): Promise<CardContent[]> {
    return this.cardService.batchUpsertCards(dto.cards, req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stream')
  async stream(@Req() req: Request, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const userId = req.user!.user_id;
    const emitter = this.graphService.getEventEmitter();

    const handler = (event: { type: string; payload?: unknown; timestamp: number; userId?: number }): void => {
      if (event.userId !== undefined && event.userId !== userId) {
        return;
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    emitter.on('change', handler);

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    const heartbeat = setInterval((): void => {
      res.write(`: ping\n\n`);
    }, 25000);

    req.on('close', (): void => {
      clearInterval(heartbeat);
      emitter.off('change', handler);
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('analyze')
  async analyze(@Req() req: Request): Promise<AiAnalyzeResponse> {
    return this.aiService.analyze(req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/stats')
  getDashboardStats(@Req() req: Request): Promise<DashboardStats> {
    return this.dashboardService.getStats(req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('action-tasks')
  async getActionTasks(@Req() req: Request): Promise<ActionTask[]> {
    return this.taskService.getActionTasks(req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('action-tasks/overview')
  async getActionTasksOverview(@Req() req: Request): Promise<ActionTasksOverview> {
    return this.taskService.getActionTasksOverview(req.user!.user_id);
  }

  @Get('activity-logs')
  getActivityLogs(@Query('limit') limit?: string): Promise<ActivityLogsResponse> {
    const n = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    return this.historyService.getActivityLogs(n);
  }

  @Post('activity-logs')
  createActivityLog(@Body() dto: CreateActivityLogRequest): Promise<void> {
    if (!dto.actionType || !dto.content) {
      throw new BadRequestException('actionType 和 content 不能为空');
    }
    return this.historyService.createActivityLog(dto);
  }

  @Get('ai-conversations')
  getAiConversations(): Promise<AiConversationsResponse> {
    return this.aiService.getAiConversations();
  }

  @Get('user-stats')
  getUserStats(): Promise<UserStatsResponse> {
    return this.taskService.getUserStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get('operation-history')
  getOperationHistory(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<OperationHistoryResponse> {
    const lim = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    const off = offset ? parseInt(offset, 10) : 0;
    return this.historyService.getOperationHistory(lim, off, req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('operation-history')
  createOperationHistory(
    @Req() req: Request,
    @Body() dto: CreateOperationHistoryRequest,
  ): Promise<void> {
    if (!dto.actionType || !dto.description) {
      throw new BadRequestException('actionType 和 description 不能为空');
    }
    return this.historyService.createOperationHistory(dto, req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('action-tasks')
  async createActionTask(
    @Req() req: Request,
    @Body() dto: CreateActionTaskRequest,
  ): Promise<ActionTask> {
    if (!dto.title?.trim()) throw new BadRequestException('任务标题不能为空');
    return this.taskService.createActionTask(dto, req.user!.user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('action-tasks/:id')
  async updateActionTask(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateActionTaskRequest,
  ): Promise<ActionTask> {
    const task = await this.taskService.updateActionTask(id, dto, req.user!.user_id);
    if (!task) throw new ForbiddenException('任务不存在或无权操作');
    return task;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('action-tasks/:id')
  async deleteActionTask(@Req() req: Request, @Param('id') id: string): Promise<void> {
    const deleted = await this.taskService.deleteActionTask(id, req.user!.user_id);
    if (!deleted) throw new ForbiddenException('任务不存在或无权操作');
  }
}
