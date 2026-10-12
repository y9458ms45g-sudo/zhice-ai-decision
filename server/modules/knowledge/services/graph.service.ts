import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { nodes, actionTasks } from '@server/database/schema';
import type {
  KnowledgeNode,
  KnowledgeGraphData,
  ActionTaskStatus,
  ActionTaskType,
} from '@shared/api.interface';
import { NodeService } from './node.service';
import { EdgeService } from './edge.service';
import { CardService } from './card.service';

const DEFAULT_NODES: Omit<KnowledgeNode, 'id'>[] = [
  { name: '我', description: '个人中心', icon: '🐱', color: '#FFC9DE', x: 0, y: 0, isCenter: true },
  { name: '问心工作室', description: '个人品牌', icon: '🎀', color: '#DCC9F7', x: 280, y: -230, isCenter: false },
  { name: '个人技能', description: '变现能力底座', icon: '💡', color: '#FFCC80', x: -280, y: -230, isCenter: false },
  { name: 'AIGC小说', description: 'AI创作小说', icon: '📝', color: '#FFE7A8', x: -490, y: -400, isCenter: false },
  { name: '剪辑接单', description: '视频剪辑', icon: '🎬', color: '#FFD4B8', x: -540, y: -230, isCenter: false },
  { name: '自媒体', description: '内容创作', icon: '📱', color: '#FFB8C9', x: -330, y: -490, isCenter: false },
  { name: '后端开发', description: 'Node.js/Go', icon: '⚙️', color: '#C7DEFA', x: 540, y: -220, isCenter: false },
  { name: '深度全栈', description: '全栈能力', icon: '🔗', color: '#B8D4FA', x: 500, y: -380, isCenter: false },
  { name: 'AI产品经理', description: 'AI产品设计', icon: '🎯', color: '#B9E7D4', x: 180, y: -460, isCenter: false },
  { name: 'FED前端', description: '前端开发', icon: '🎨', color: '#B8E8E0', x: 360, y: -480, isCenter: false },
  { name: '生存约束', description: '时间与资源', icon: '⏳', color: '#FFB8B8', x: 0, y: 360, isCenter: false },
  { name: '新闻学', description: '内容素养', icon: '📰', color: '#D4B8FA', x: -310, y: 180, isCenter: false },
  { name: '内容运营', description: '运营能力', icon: '💬', color: '#FFE7A8', x: 340, y: 120, isCenter: false },
];

const DEFAULT_CARDS: { sectionKey: string; content: string }[] = [
  {
    sectionKey: 'education',
    content: '新闻传播学本科，辅修计算机科学。系统学习过内容生产、传播理论与媒介研究，同时具备扎实的编程基础。',
  },
  {
    sectionKey: 'experience',
    content: '3年后端开发经验，2年内容运营经验。主导过多个全栈项目的从0到1搭建，熟悉产品从需求到上线的完整链路。',
  },
  {
    sectionKey: 'techstack',
    content: '前端：React / TypeScript / Tailwind CSS\n后端：Node.js / NestJS / PostgreSQL\nAI：Prompt工程 / AI产品设计 / 大模型应用开发\n工具：Figma / Final Cut Pro / Notion',
  },
  {
    sectionKey: 'constraints',
    content: '• 每日有效工作时间：6小时\n• 每月需保证基础收入覆盖生活成本\n• 优先选择可复利积累的方向\n• 不接纯体力劳动型外包',
  },
  {
    sectionKey: 'strategy_phase1',
    content: '**第1阶段：生存期（0-3个月）**\n以快速变现为核心目标，通过剪辑接单和外包开发保证现金流，同时积累作品和客户资源。',
  },
  {
    sectionKey: 'strategy_phase2',
    content: '**第2阶段：成长期（3-9个月）**\n建立个人品牌矩阵，自媒体内容稳定产出，AIGC小说形成系列，逐步降低对外包收入的依赖。',
  },
  {
    sectionKey: 'strategy_phase3',
    content: '**第3阶段：复利期（9-18个月）**\n形成被动收入体系，知识产品和内容产品持续产生收益，开始深耕AI产品方向，打造个人护城河。',
  },
  {
    sectionKey: 'monetize_novel',
    content: '**AIGC小说变现**\n利用AI辅助创作网文，多平台分发。\n当前进度：已完成世界观设定，正在连载第1部作品。',
  },
  {
    sectionKey: 'monetize_editing',
    content: '**剪辑接单**\n短视频剪辑、口播剪辑、Vlog包装。\n当前进度：稳定每月3-5单，客单价800-2000元。',
  },
  {
    sectionKey: 'monetize_media',
    content: '**自媒体矩阵**\n小红书 + B站 + 公众号，分享AI工具使用和个人成长内容。\n当前进度：小红书粉丝2000+，月均涨粉500。',
  },
  {
    sectionKey: 'deep_backend',
    content: '**后端开发**\n深耕Node.js生态，掌握微服务架构、数据库优化、性能调优。\n熟练度：★★★★☆',
  },
  {
    sectionKey: 'deep_fullstack',
    content: '**深度全栈**\n从前端到后端到部署运维的全链路能力，能独立完成产品从0到1。\n熟练度：★★★★☆',
  },
  {
    sectionKey: 'deep_ai_pm',
    content: '**AI产品经理**\n理解大模型能力边界，擅长AI产品的需求设计和Prompt工程。\n熟练度：★★★☆☆',
  },
  {
    sectionKey: 'deep_frontend',
    content: '**FED前端**\nReact生态专家，关注用户体验和交互设计，追求像素级还原。\n熟练度：★★★★☆',
  },
  {
    sectionKey: 'progress_90days',
    content: '45',
  },
  {
    sectionKey: 'theme_preference',
    content: 'light',
  },
];

const DEFAULT_ACTION_TASKS: Array<{ title: string; status: ActionTaskStatus; taskType: ActionTaskType; dueDate: string; sortOrder: number }> = [
  { title: '注册AIGC小说平台账号，发第一篇小说', status: 'todo', taskType: 'money_making', dueDate: '2026-10-12', sortOrder: 1 },
  { title: '完善智策项目作品集，截图+录屏', status: 'todo', taskType: 'job_hunting', dueDate: '2026-10-15', sortOrder: 2 },
  { title: '接第一个剪辑/UI单', status: 'todo', taskType: 'money_making', dueDate: '2026-10-18', sortOrder: 3 },
  { title: '看吴恩达大模型课程前2周 + 读Function Calling文档 + 写Demo', status: 'todo', taskType: 'learning', dueDate: '2026-10-20', sortOrder: 4 },
  { title: '更新简历，突出AI全栈项目经验', status: 'todo', taskType: 'job_hunting', dueDate: '2026-10-20', sortOrder: 5 },
  { title: '自媒体账号发第一篇技术内容', status: 'todo', taskType: 'money_making', dueDate: '2026-10-25', sortOrder: 6 },
  { title: '投递广深杭AI产品经理/全栈开发岗位10个', status: 'todo', taskType: 'job_hunting', dueDate: '2026-10-25', sortOrder: 7 },
  { title: '自媒体粉丝到100', status: 'todo', taskType: 'money_making', dueDate: '2026-11-05', sortOrder: 8 },
  { title: '看向量数据库课程 + 读RAG论文 + 把城知改成ChromaDB', status: 'todo', taskType: 'learning', dueDate: '2026-11-03', sortOrder: 9 },
  { title: '整理面试常见问题，准备自我介绍', status: 'todo', taskType: 'job_hunting', dueDate: '2026-11-10', sortOrder: 10 },
  { title: '投递第二批岗位，根据面试反馈调整', status: 'todo', taskType: 'job_hunting', dueDate: '2026-11-20', sortOrder: 11 },
  { title: 'AIGC小说拿到第一笔稿费', status: 'todo', taskType: 'money_making', dueDate: '2026-11-20', sortOrder: 12 },
  { title: '过LangChain Quickstart + 做LangChain Agent Demo', status: 'todo', taskType: 'learning', dueDate: '2026-11-17', sortOrder: 13 },
  { title: '读CoT论文 + 加CoT Prompt + 写自动打分脚本', status: 'todo', taskType: 'learning', dueDate: '2026-12-01', sortOrder: 14 },
  { title: '月收入达到2000元', status: 'todo', taskType: 'money_making', dueDate: '2026-12-01', sortOrder: 15 },
  { title: '参加笔试面试，记录复盘', status: 'todo', taskType: 'job_hunting', dueDate: '2026-12-10', sortOrder: 16 },
  { title: '学Docker + 部署城知到云服务器', status: 'todo', taskType: 'learning', dueDate: '2026-12-15', sortOrder: 17 },
  { title: '画系统架构图 + 写5分钟项目介绍 + 刷面试题', status: 'todo', taskType: 'learning', dueDate: '2026-12-29', sortOrder: 18 },
];

const OLD_LAYOUT_SIGNS: Array<{ name: string; x: number; y: number; tolerance: number }> = [
  { name: '问心工作室', x: 280, y: -180, tolerance: 30 },
  { name: '个人技能', x: -280, y: 60, tolerance: 30 },
  { name: '后端开发', x: 460, y: -280, tolerance: 30 },
  { name: 'FED前端', x: 360, y: -320, tolerance: 30 },
  { name: '自媒体', x: -440, y: -80, tolerance: 30 },
  { name: '问心工作室', x: 400, y: -40, tolerance: 30 },
  { name: '个人技能', x: -320, y: 220, tolerance: 30 },
  { name: '后端开发', x: 700, y: -100, tolerance: 30 },
  { name: '自媒体', x: -540, y: 380, tolerance: 30 },
];

@Injectable()
export class GraphService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject('KNOWLEDGE_EVENT_EMITTER') private readonly eventEmitter: EventEmitter,
    private readonly nodeService: NodeService,
    private readonly edgeService: EdgeService,
    private readonly cardService: CardService,
  ) {}

  async getGraph(userId: number): Promise<KnowledgeGraphData> {
    const [nodeList, edgeList] = await Promise.all([
      this.nodeService.getNodes(userId),
      this.edgeService.getEdges(userId),
    ]);
    return { nodes: nodeList, edges: edgeList };
  }

  async initDefaultGraph(userId: number): Promise<KnowledgeGraphData> {
    const existingNodes = await this.nodeService.getNodes(userId);
    if (existingNodes.length > 0) {
      await this.migrateLayoutIfNeeded(existingNodes);
      return this.getGraph(userId);
    }

    const nodeMap = new Map<string, string>();

    for (const nodeData of DEFAULT_NODES) {
      const created = await this.nodeService.createNode(nodeData, userId);
      nodeMap.set(nodeData.name, created.id);
    }

    const centerId = nodeMap.get('我');
    const studioId = nodeMap.get('问心工作室');
    const skillHubId = nodeMap.get('个人技能');
    const techChildren = ['后端开发', '深度全栈', 'AI产品经理', 'FED前端'];
    const monetizeChildren = ['AIGC小说', '剪辑接单', '自媒体'];
    const directChildren = ['问心工作室', '个人技能', '生存约束', '新闻学', '内容运营'];

    if (centerId) {
      for (const name of directChildren) {
        const childId = nodeMap.get(name);
        if (childId) {
          await this.edgeService.createEdge({ fromNode: centerId, toNode: childId }, userId);
        }
      }
    }

    if (studioId) {
      for (const name of techChildren) {
        const childId = nodeMap.get(name);
        if (childId) {
          await this.edgeService.createEdge({ fromNode: studioId, toNode: childId }, userId);
        }
      }
    }

    if (skillHubId) {
      for (const name of monetizeChildren) {
        const childId = nodeMap.get(name);
        if (childId) {
          await this.edgeService.createEdge({ fromNode: skillHubId, toNode: childId }, userId);
        }
      }
    }

    const extraEdges: [string, string][] = [
      ['后端开发', '深度全栈'],
      ['FED前端', '深度全栈'],
      ['AIGC小说', '自媒体'],
      ['内容运营', '自媒体'],
      ['新闻学', 'AI产品经理'],
    ];

    for (const [from, to] of extraEdges) {
      const fromId = nodeMap.get(from);
      const toId = nodeMap.get(to);
      if (fromId && toId) {
        await this.edgeService.createEdge({ fromNode: fromId, toNode: toId }, userId);
      }
    }

    for (const card of DEFAULT_CARDS) {
      await this.cardService.upsertCard(card.sectionKey, card.content, userId);
    }

    const existingTasks = await this.db.select().from(actionTasks).limit(1);
    if (existingTasks.length === 0) {
      for (const task of DEFAULT_ACTION_TASKS) {
        await this.db.insert(actionTasks).values({
          title: task.title,
          status: task.status,
          taskType: task.taskType,
          dueDate: task.dueDate,
          sortOrder: task.sortOrder,
        });
      }
    }

    this.eventEmitter.emit('change', {
      type: 'graph_changed',
      payload: { full: true },
      timestamp: Date.now(),
      userId,
    });
    return this.getGraph(userId);
  }

  async migrateLayoutIfNeeded(existingNodes: KnowledgeNode[]): Promise<void> {
    const nameToNode = new Map<string, KnowledgeNode>();
    existingNodes.forEach((n: KnowledgeNode): void => {
      nameToNode.set(n.name, n);
    });

    let matchCount = 0;
    for (const sign of OLD_LAYOUT_SIGNS) {
      const node = nameToNode.get(sign.name);
      if (!node) continue;
      if (
        Math.abs(node.x - sign.x) < sign.tolerance &&
        Math.abs(node.y - sign.y) < sign.tolerance
      ) {
        matchCount += 1;
      }
    }

    if (matchCount < 3) return;

    for (const defaultNode of DEFAULT_NODES) {
      const node = nameToNode.get(defaultNode.name);
      if (!node) continue;
      await this.db.update(nodes)
        .set({ x: defaultNode.x, y: defaultNode.y })
        .where(eq(nodes.id, node.id));
    }
  }

  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }
}
