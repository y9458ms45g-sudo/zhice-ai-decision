import { Module } from '@nestjs/common';
import { EventEmitter } from 'events';
import { KnowledgeController } from './knowledge.controller';
import { NodeService } from './services/node.service';
import { EdgeService } from './services/edge.service';
import { CardService } from './services/card.service';
import { TaskService } from './services/task.service';
import { HistoryService } from './services/history.service';
import { AiService } from './services/ai.service';
import { GraphService } from './services/graph.service';
import { DashboardService } from './services/dashboard.service';

const KNOWLEDGE_EVENT_EMITTER = new EventEmitter();
KNOWLEDGE_EVENT_EMITTER.setMaxListeners(100);

@Module({
  controllers: [KnowledgeController],
  providers: [
    NodeService,
    EdgeService,
    CardService,
    TaskService,
    HistoryService,
    AiService,
    GraphService,
    DashboardService,
    {
      provide: 'KNOWLEDGE_EVENT_EMITTER',
      useValue: KNOWLEDGE_EVENT_EMITTER,
    },
  ],
})
export class KnowledgeModule {}
