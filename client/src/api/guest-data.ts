import type {
  KnowledgeGraphData,
  KnowledgeNode,
  KnowledgeEdge,
  CardContent,
  CreateNodeRequest,
  UpdateNodeRequest,
  CreateEdgeRequest,
  ActionTask,
  ActionTasksOverview,
  CreateActionTaskRequest,
  UpdateActionTaskRequest,
  ActivityLogsResponse,
  AiConversationsResponse,
  UserStatsResponse,
  OperationHistoryResponse,
  AiAnalyzeResponse,
  DashboardStats,
  DailyTaskCount,
} from '@shared/api.interface';

const GUEST_KEY = 'zhice_guest_data';

interface GuestData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  cards: CardContent[];
  tasks: ActionTask[];
}

function getDefaultData(): GuestData {
  const centerId = crypto.randomUUID();

  const nodes: KnowledgeNode[] = [
    {
      id: centerId,
      name: '我的知识网络',
      description: '',
      icon: '🌟',
      color: '#FFC9DE',
      x: 0,
      y: 0,
      isCenter: true,
    },
    {
      id: crypto.randomUUID(),
      name: '技术能力',
      description: '',
      icon: '⚙️',
      color: '#C7DEFA',
      x: -200,
      y: -120,
      isCenter: false,
    },
    {
      id: crypto.randomUUID(),
      name: '产品思维',
      description: '',
      icon: '💡',
      color: '#DCC9F7',
      x: 200,
      y: -120,
      isCenter: false,
    },
    {
      id: crypto.randomUUID(),
      name: '职业发展',
      description: '',
      icon: '🚀',
      color: '#FFE7A8',
      x: -220,
      y: 80,
      isCenter: false,
    },
    {
      id: crypto.randomUUID(),
      name: '变现路径',
      description: '',
      icon: '💰',
      color: '#B9E7D4',
      x: 220,
      y: 80,
      isCenter: false,
    },
    {
      id: crypto.randomUUID(),
      name: '兴趣爱好',
      description: '',
      icon: '🎨',
      color: '#FFB8C9',
      x: 0,
      y: 180,
      isCenter: false,
    },
    {
      id: crypto.randomUUID(),
      name: '健康生活',
      description: '',
      icon: '🌿',
      color: '#B8E8E0',
      x: -150,
      y: 200,
      isCenter: false,
    },
    {
      id: crypto.randomUUID(),
      name: '人际关系',
      description: '',
      icon: '💕',
      color: '#FFD4B8',
      x: 150,
      y: 200,
      isCenter: false,
    },
  ];

  const edges: KnowledgeEdge[] = nodes
    .filter((n: KnowledgeNode): boolean => !n.isCenter)
    .map((n: KnowledgeNode): KnowledgeEdge => ({
      id: crypto.randomUUID(),
      fromNode: centerId,
      toNode: n.id,
    }));

  const cards: CardContent[] = [
    {
      id: crypto.randomUUID(),
      sectionKey: 'education',
      content: '示例：某大学 · 计算机专业\nGPA 3.8/4.0 · 校级奖学金',
    },
    {
      id: crypto.randomUUID(),
      sectionKey: 'experience',
      content: '示例：3年前端开发经验\n主导过2个核心项目上线',
    },
    {
      id: crypto.randomUUID(),
      sectionKey: 'techstack',
      content: 'React / TypeScript / Node.js\n熟悉全栈开发流程',
    },
    {
      id: crypto.randomUUID(),
      sectionKey: 'constraints',
      content: '每日可投入 2 小时\n目标：3 个月内实现副业收入',
    },
    {
      id: crypto.randomUUID(),
      sectionKey: 'strategy_phase1',
      content: '第1阶段：打基础\n- 梳理现有技能体系\n- 选定深耕方向',
    },
    {
      id: crypto.randomUUID(),
      sectionKey: 'strategy_phase2',
      content: '第2阶段：快成长\n- 系统化学习提升\n- 项目实战积累',
    },
  ];

  const today = new Date();
  const offsetDate = (days: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const tasks: ActionTask[] = [
    {
      id: crypto.randomUUID(),
      title: '完成个人知识图谱梳理',
      status: 'in_progress',
      taskType: 'learning',
      dueDate: offsetDate(3),
      sortOrder: 0,
      isStarred: true,
    },
    {
      id: crypto.randomUUID(),
      title: '学习 React 19 新特性',
      status: 'todo',
      taskType: 'learning',
      dueDate: offsetDate(7),
      sortOrder: 1,
      isStarred: false,
    },
    {
      id: crypto.randomUUID(),
      title: '完成第一个副业项目',
      status: 'todo',
      taskType: 'money_making',
      dueDate: offsetDate(30),
      sortOrder: 2,
      isStarred: true,
    },
    {
      id: crypto.randomUUID(),
      title: '每日运动30分钟',
      status: 'done',
      taskType: 'learning',
      dueDate: offsetDate(-1),
      sortOrder: 3,
      isStarred: false,
    },
  ];

  return { nodes, edges, cards, tasks };
}

function readData(): GuestData {
  const raw = localStorage.getItem(GUEST_KEY);
  if (!raw) {
    const data = getDefaultData();
    localStorage.setItem(GUEST_KEY, JSON.stringify(data));
    return data;
  }
  try {
    return JSON.parse(raw) as GuestData;
  } catch {
    const data = getDefaultData();
    localStorage.setItem(GUEST_KEY, JSON.stringify(data));
    return data;
  }
}

function writeData(data: GuestData): void {
  localStorage.setItem(GUEST_KEY, JSON.stringify(data));
}

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return { start: monday, end: nextMonday };
}

function isInThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const { start, end } = getWeekRange();
  return date >= start && date < end;
}

export const guestStore = {
  getGraph(): Promise<KnowledgeGraphData> {
    const data = readData();
    return Promise.resolve({ nodes: data.nodes, edges: data.edges });
  },

  initGraph(): Promise<KnowledgeGraphData> {
    const data = getDefaultData();
    writeData(data);
    return Promise.resolve({ nodes: data.nodes, edges: data.edges });
  },

  createNode(data: CreateNodeRequest): Promise<KnowledgeNode> {
    const store = readData();
    const newNode: KnowledgeNode = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description ?? '',
      icon: data.icon ?? '📌',
      color: data.color ?? '#FFC9DE',
      x: data.x,
      y: data.y,
      isCenter: data.isCenter ?? false,
    };
    store.nodes.push(newNode);
    writeData(store);
    return Promise.resolve(newNode);
  },

  updateNode(id: string, data: UpdateNodeRequest): Promise<KnowledgeNode> {
    const store = readData();
    const idx = store.nodes.findIndex((n: KnowledgeNode): boolean => n.id === id);
    if (idx === -1) {
      return Promise.reject(new Error('节点不存在'));
    }
    store.nodes[idx] = { ...store.nodes[idx], ...data };
    writeData(store);
    return Promise.resolve(store.nodes[idx]);
  },

  deleteNode(id: string): Promise<void> {
    const store = readData();
    store.nodes = store.nodes.filter((n: KnowledgeNode): boolean => n.id !== id);
    store.edges = store.edges.filter(
      (e: KnowledgeEdge): boolean => e.fromNode !== id && e.toNode !== id,
    );
    writeData(store);
    return Promise.resolve();
  },

  createEdge(data: CreateEdgeRequest): Promise<KnowledgeEdge> {
    const store = readData();
    const newEdge: KnowledgeEdge = {
      id: crypto.randomUUID(),
      fromNode: data.fromNode,
      toNode: data.toNode,
    };
    store.edges.push(newEdge);
    writeData(store);
    return Promise.resolve(newEdge);
  },

  deleteEdge(id: string): Promise<void> {
    const store = readData();
    store.edges = store.edges.filter((e: KnowledgeEdge): boolean => e.id !== id);
    writeData(store);
    return Promise.resolve();
  },

  getCards(): Promise<CardContent[]> {
    const data = readData();
    return Promise.resolve(data.cards);
  },

  updateCard(sectionKey: string, content: string): Promise<CardContent> {
    const store = readData();
    const idx = store.cards.findIndex((c: CardContent): boolean => c.sectionKey === sectionKey);
    if (idx >= 0) {
      store.cards[idx] = { ...store.cards[idx], content };
    } else {
      store.cards.push({
        id: crypto.randomUUID(),
        sectionKey,
        content,
      });
    }
    writeData(store);
    const updated = store.cards.find((c: CardContent): boolean => c.sectionKey === sectionKey)!;
    return Promise.resolve(updated);
  },

  batchUpdateCards(cards: { sectionKey: string; content: string }[]): Promise<CardContent[]> {
    const store = readData();
    for (const card of cards) {
      const idx = store.cards.findIndex((c: CardContent): boolean => c.sectionKey === card.sectionKey);
      if (idx >= 0) {
        store.cards[idx] = { ...store.cards[idx], content: card.content };
      } else {
        store.cards.push({
          id: crypto.randomUUID(),
          sectionKey: card.sectionKey,
          content: card.content,
        });
      }
    }
    writeData(store);
    const result = cards.map(
      (c): CardContent => store.cards.find((sc: CardContent): boolean => sc.sectionKey === c.sectionKey)!,
    );
    return Promise.resolve(result);
  },

  getActionTasks(): Promise<ActionTask[]> {
    const data = readData();
    return Promise.resolve(data.tasks);
  },

  getActionTasksOverview(): Promise<ActionTasksOverview> {
    const data = readData();
    const tasks = data.tasks;
    const total = tasks.length;
    const done = tasks.filter((t: ActionTask): boolean => t.status === 'done').length;
    const inProgress = tasks.filter((t: ActionTask): boolean => t.status === 'in_progress').length;
    const todo = tasks.filter((t: ActionTask): boolean => t.status === 'todo').length;

    const weekTasks = tasks.filter((t: ActionTask): boolean => isInThisWeek(t.dueDate));
    const weekTotal = weekTasks.length;
    const weekDone = weekTasks.filter((t: ActionTask): boolean => t.status === 'done').length;

    return Promise.resolve({
      total,
      done,
      inProgress,
      todo,
      weekDone,
      weekTotal,
    });
  },

  createActionTask(dto: CreateActionTaskRequest): Promise<ActionTask> {
    const store = readData();
    const maxSort = store.tasks.reduce(
      (max: number, t: ActionTask): number => Math.max(max, t.sortOrder),
      -1,
    );
    const newTask: ActionTask = {
      id: crypto.randomUUID(),
      title: dto.title,
      status: dto.status ?? 'todo',
      taskType: dto.taskType ?? 'learning',
      dueDate: dto.dueDate ?? null,
      sortOrder: maxSort + 1,
      isStarred: dto.isStarred ?? false,
    };
    store.tasks.push(newTask);
    writeData(store);
    return Promise.resolve(newTask);
  },

  updateActionTask(id: string, dto: UpdateActionTaskRequest): Promise<ActionTask> {
    const store = readData();
    const idx = store.tasks.findIndex((t: ActionTask): boolean => t.id === id);
    if (idx === -1) {
      return Promise.reject(new Error('任务不存在'));
    }
    store.tasks[idx] = { ...store.tasks[idx], ...dto };
    writeData(store);
    return Promise.resolve(store.tasks[idx]);
  },

  deleteActionTask(id: string): Promise<void> {
    const store = readData();
    store.tasks = store.tasks.filter((t: ActionTask): boolean => t.id !== id);
    writeData(store);
    return Promise.resolve();
  },

  getActivityLogs(_limit = 20): Promise<ActivityLogsResponse> {
    return Promise.resolve({ items: [], total: 0 });
  },

  createActivityLog(): Promise<void> {
    return Promise.resolve();
  },

  getAiConversations(): Promise<AiConversationsResponse> {
    return Promise.resolve({ items: [] });
  },

  getUserStats(): Promise<UserStatsResponse> {
    const data = readData();
    const doneTasks = data.tasks.filter((t: ActionTask): boolean => t.status === 'done');
    const weekDone = doneTasks.filter((t: ActionTask): boolean => isInThisWeek(t.dueDate)).length;
    return Promise.resolve({
      weekCompletedTasks: weekDone,
      totalCompletedTasks: doneTasks.length,
      streakDays: 0,
      lastAiSuggestionAt: null,
    });
  },

  getOperationHistory(_limit = 20, _offset = 0): Promise<OperationHistoryResponse> {
    return Promise.resolve({ items: [], total: 0 });
  },

  getDashboardStats(): Promise<DashboardStats> {
    const data = readData();
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter(
      (t: ActionTask): boolean => t.status === 'done',
    ).length;
    const pendingTasks = data.tasks.filter(
      (t: ActionTask): boolean => t.status === 'todo',
    ).length;
    const inProgressTasks = data.tasks.filter(
      (t: ActionTask): boolean => t.status === 'in_progress',
    ).length;
    const weeklyProgress = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;
    const weeklyTaskCounts: DailyTaskCount[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      weeklyTaskCounts.push({
        date: d.toISOString().slice(0, 10),
        count: 0,
      });
    }
    return Promise.resolve({
      totalNodes: data.nodes.length,
      totalEdges: data.edges.length,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      aiSuggestionsCount: 0,
      todayActivity: 0,
      weeklyProgress,
      weeklyTaskCounts,
    });
  },

  createOperationHistory(): Promise<void> {
    return Promise.resolve();
  },

  analyzeKnowledge(): Promise<AiAnalyzeResponse> {
    return Promise.resolve({ suggestions: [] });
  },

  hasData(): boolean {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw) as GuestData;
      return data.nodes.length > 0 || data.cards.length > 0 || data.tasks.length > 0;
    } catch {
      return false;
    }
  },

  clear(): void {
    localStorage.removeItem(GUEST_KEY);
  },

  getRawData(): GuestData {
    return readData();
  },
};
