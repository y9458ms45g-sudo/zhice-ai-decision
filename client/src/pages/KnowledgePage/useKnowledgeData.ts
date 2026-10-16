import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  CardContent,
  KnowledgeGraphData,
  UpdateNodeRequest,
  CreateNodeRequest,
  CreateEdgeRequest,
  KnowledgeSseEvent,
  ActionTask,
  ActionTasksOverview,
  UpdateActionTaskRequest,
  CreateActionTaskRequest,
  Insight,
  ExtractedInsight,
  CreateInsightRequest,
  InsightSourceType,
} from '@shared/api.interface';

type ActivityActionType = 
  | 'add_task'
  | 'complete_task'
  | 'edit_card'
  | 'add_node'
  | 'edit_node'
  | 'delete_node'
  | 'add_edge';

function logActivity(actionType: ActivityActionType, content: string): void {
  void (async () => {
    try {
      await knowledgeApi.createActivityLog({ actionType, content });
    } catch (error) {
      logger.error('记录活动失败', error);
    }
  })();
}

const CARD_LABEL_MAP: Record<string, string> = {
  education: '教育经历',
  experience: '工作经历',
  techstack: '技术栈',
  constraints: '约束条件',
  strategy_phase1: '阶段一',
  strategy_phase2: '阶段二',
  strategy_phase3: '阶段三',
  monetization1: '变现一',
  monetization2: '变现二',
  monetization3: '变现三',
  deepdive1: '深耕一',
  deepdive2: '深耕二',
  deepdive3: '深耕三',
  deepdive4: '深耕四',
  progress: '进度',
};

function getCardLabel(sectionKey: string): string {
  return CARD_LABEL_MAP[sectionKey] ?? sectionKey;
}

const QUERY_KEYS = {
  graph: ['knowledge', 'graph'] as const,
  nodes: ['knowledge', 'nodes'] as const,
  edges: ['knowledge', 'edges'] as const,
  cards: ['knowledge', 'cards'] as const,
  actionTasks: ['knowledge', 'action-tasks'] as const,
  actionTasksOverview: ['knowledge', 'action-tasks-overview'] as const,
  insights: ['knowledge', 'insights'] as const,
};

// --- Queries ---

export function useGraphQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.graph,
    queryFn: async (): Promise<KnowledgeGraphData> => {
      const data = await knowledgeApi.getGraph();
      if (data.nodes.length === 0) {
        return knowledgeApi.initGraph();
      }
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCardsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.cards,
    queryFn: (): Promise<CardContent[]> => knowledgeApi.getCards(),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

// --- Mutations ---

export function useUpdateNodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNodeRequest }): Promise<KnowledgeNode> =>
      knowledgeApi.updateNode(id, data),
    onMutate: async ({ id, data }): Promise<{ previousNodes: KnowledgeNode[]; previousGraph: KnowledgeGraphData | undefined }> => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.graph });
      const previousGraph = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      const previousNodes = previousGraph?.nodes ?? [];

      if (previousGraph) {
        queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
          ...previousGraph,
          nodes: previousGraph.nodes.map((n: KnowledgeNode): KnowledgeNode =>
            n.id === id ? { ...n, ...data } : n,
          ),
        });
      }
      return { previousNodes, previousGraph };
    },
    onError: (error, _variables, context): void => {
      logger.error('更新节点失败', error);
      if (context?.previousGraph) {
        queryClient.setQueryData(QUERY_KEYS.graph, context.previousGraph);
      }
    },
  });
}

export function useCreateNodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNodeRequest): Promise<KnowledgeNode> => knowledgeApi.createNode(data),
    onSuccess: (newNode): void => {
      const previous = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      if (previous) {
        queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
          ...previous,
          nodes: [...previous.nodes, newNode],
        });
      }
      logActivity('add_node', `添加了节点「${newNode.name}」`);
    },
  });
}

export function useDeleteNodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> => knowledgeApi.deleteNode(id),
    onMutate: async (deletedId): Promise<{ previousGraph: KnowledgeGraphData | undefined }> => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.graph });
      const previousGraph = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      if (previousGraph) {
        queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
          nodes: previousGraph.nodes.filter((n: KnowledgeNode): boolean => n.id !== deletedId),
          edges: previousGraph.edges.filter(
            (e: KnowledgeEdge): boolean => e.fromNode !== deletedId && e.toNode !== deletedId,
          ),
        });
      }
      return { previousGraph };
    },
    onError: (error, _variables, context): void => {
      logger.error('删除节点失败', error);
      if (context?.previousGraph) {
        queryClient.setQueryData(QUERY_KEYS.graph, context.previousGraph);
      }
    },
  });
}

export function useCreateEdgeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEdgeRequest): Promise<KnowledgeEdge> => knowledgeApi.createEdge(data),
    onSuccess: (newEdge): void => {
      const previous = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      if (previous) {
        queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
          ...previous,
          edges: [...previous.edges, newEdge],
        });
      }
    },
  });
}

export function useDeleteEdgeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> => knowledgeApi.deleteEdge(id),
    onMutate: async (deletedId): Promise<{ previousGraph: KnowledgeGraphData | undefined }> => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.graph });
      const previousGraph = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      if (previousGraph) {
        queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
          ...previousGraph,
          edges: previousGraph.edges.filter((e: KnowledgeEdge): boolean => e.id !== deletedId),
        });
      }
      return { previousGraph };
    },
    onError: (error, _variables, context): void => {
      logger.error('删除连线失败', error);
      if (context?.previousGraph) {
        queryClient.setQueryData(QUERY_KEYS.graph, context.previousGraph);
      }
    },
  });
}

export function useUpdateCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionKey, content }: { sectionKey: string; content: string }): Promise<CardContent> =>
      knowledgeApi.updateCard(sectionKey, content),
    onMutate: async ({ sectionKey, content }): Promise<{ previousCards: CardContent[] | undefined }> => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cards });
      const previousCards = queryClient.getQueryData<CardContent[]>(QUERY_KEYS.cards);
      if (previousCards) {
        const existing = previousCards.find((c: CardContent): boolean => c.sectionKey === sectionKey);
        if (existing) {
          queryClient.setQueryData<CardContent[]>(
            QUERY_KEYS.cards,
            previousCards.map((c: CardContent): CardContent =>
              c.sectionKey === sectionKey ? { ...c, content } : c,
            ),
          );
        } else {
          queryClient.setQueryData<CardContent[]>(QUERY_KEYS.cards, [
            ...previousCards,
            { id: '', sectionKey, content } as CardContent,
          ]);
        }
      }
      return { previousCards };
    },
    onError: (error, _variables, context): void => {
      logger.error('保存卡片失败', error);
      if (context?.previousCards) {
        queryClient.setQueryData(QUERY_KEYS.cards, context.previousCards);
      }
    },
    onSuccess: (updatedCard): void => {
      const previous = queryClient.getQueryData<CardContent[]>(QUERY_KEYS.cards);
      if (previous) {
        const idx = previous.findIndex((c: CardContent): boolean => c.sectionKey === updatedCard.sectionKey);
        if (idx >= 0) {
          const next = [...previous];
          next[idx] = updatedCard;
          queryClient.setQueryData(QUERY_KEYS.cards, next);
        } else {
          queryClient.setQueryData(QUERY_KEYS.cards, [...previous, updatedCard]);
        }
      }
      const cardLabel = getCardLabel(updatedCard.sectionKey);
      logActivity('edit_card', `编辑了${cardLabel}卡片`);
    },
  });
}

export function useActionTasksQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.actionTasks,
    queryFn: (): Promise<ActionTask[]> => knowledgeApi.getActionTasks(),
    staleTime: 30 * 1000,
  });
}

export function useActionTasksOverviewQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.actionTasksOverview,
    queryFn: (): Promise<ActionTasksOverview> => knowledgeApi.getActionTasksOverview(),
    staleTime: 30 * 1000,
  });
}

export function useResetGraphMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<KnowledgeGraphData> => knowledgeApi.resetGraph(),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
    onError: (error): void => {
      logger.error('重置知识图谱失败', error);
    },
  });
}

export function useCreateActionTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateActionTaskRequest): Promise<ActionTask> =>
      knowledgeApi.createActionTask(dto),
    onSuccess: (newTask): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actionTasks });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actionTasksOverview });
      logActivity('add_task', `添加了任务「${newTask.title || '未命名任务'}」`);
    },
    onError: (error): void => {
      logger.error('创建任务失败', error);
    },
  });
}

export function useUpdateActionTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateActionTaskRequest): Promise<ActionTask> =>
      knowledgeApi.updateActionTask(id, dto),
    onMutate: async ({ id, status, title, dueDate, sortOrder }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.actionTasks });
      const previous = queryClient.getQueryData<ActionTask[]>(QUERY_KEYS.actionTasks);
      if (previous) {
        queryClient.setQueryData<ActionTask[]>(
          QUERY_KEYS.actionTasks,
          previous.map((t: ActionTask): ActionTask =>
            t.id === id
              ? {
                  ...t,
                  ...(status !== undefined && { status }),
                  ...(title !== undefined && { title }),
                  ...(dueDate !== undefined && { dueDate }),
                  ...(sortOrder !== undefined && { sortOrder }),
                }
              : t,
          ),
        );
      }
      return { previous };
    },
    onError: (error, _vars, context): void => {
      logger.error('更新任务失败', error);
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.actionTasks, context.previous);
      }
    },
    onSuccess: (updatedTask, variables): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actionTasksOverview });
      if (variables.status === 'done') {
        logActivity('complete_task', `完成了任务「${updatedTask.title || '未命名任务'}」`);
      }
    },
  });
}

export function useDeleteActionTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> => knowledgeApi.deleteActionTask(id),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actionTasks });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actionTasksOverview });
    },
    onError: (error): void => {
      logger.error('删除任务失败', error);
    },
  });
}

// --- Insights ---

export function useInsightsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.insights,
    queryFn: (): Promise<Insight[]> => knowledgeApi.getInsights(),
    staleTime: 0,
  });
}

export function useExtractInsightMutation() {
  return useMutation({
    mutationFn: ({
      content,
      sourceType,
      signal,
    }: {
      content: string;
      sourceType?: InsightSourceType;
      signal?: AbortSignal;
    }): Promise<ExtractedInsight> =>
      knowledgeApi.extractInsight(content, sourceType, signal),
    onError: (error): void => {
      logger.error('提取观点失败', error);
    },
  });
}

export function useCreateInsightMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateInsightRequest): Promise<Insight> =>
      knowledgeApi.createInsight(dto),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.insights });
    },
    onError: (error): void => {
      logger.error('保存观点失败', error);
    },
  });
}

export function useLinkInsightNodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      linkedNodeId,
    }: {
      id: string;
      linkedNodeId?: string;
    }): Promise<Insight> => knowledgeApi.linkInsightNode(id, linkedNodeId),
    onMutate: async ({ id, linkedNodeId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.insights });
      const previous = queryClient.getQueryData<Insight[]>(QUERY_KEYS.insights);
      if (previous) {
        queryClient.setQueryData<Insight[]>(
          QUERY_KEYS.insights,
          previous.map((item: Insight): Insight =>
            item.id === id ? { ...item, linkedNodeId } : item,
          ),
        );
      }
      return { previous };
    },
    onError: (error, _vars, context): void => {
      logger.error('关联节点失败', error);
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.insights, context.previous);
      }
    },
  });
}

export function useDeleteInsightMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> => knowledgeApi.deleteInsight(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.insights });
      const previous = queryClient.getQueryData<Insight[]>(QUERY_KEYS.insights);
      if (previous) {
        queryClient.setQueryData<Insight[]>(
          QUERY_KEYS.insights,
          previous.filter((item: Insight): boolean => item.id !== deletedId),
        );
      }
      return { previous };
    },
    onError: (error, _vars, context): void => {
      logger.error('删除观点失败', error);
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.insights, context.previous);
      }
    },
  });
}

// --- SSE sync helpers ---

export function applySseEventToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  event: KnowledgeSseEvent,
): void {
  const { type, payload } = event;
  switch (type) {
    case 'node_updated': {
      const graph = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      if (graph && payload) {
        const { id, ...fields } = payload as { id: string } & Partial<KnowledgeNode>;
        queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
          ...graph,
          nodes: graph.nodes.map((n: KnowledgeNode): KnowledgeNode =>
            n.id === id ? { ...n, ...fields } : n,
          ),
        });
      }
      break;
    }
    case 'node_created': {
      const graph = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      if (graph && payload) {
        const newNode = payload as unknown as KnowledgeNode;
        if (!graph.nodes.some((n: KnowledgeNode): boolean => n.id === newNode.id)) {
          queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
            ...graph,
            nodes: [...graph.nodes, newNode],
          });
        }
      }
      break;
    }
    case 'node_deleted': {
      const graph = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      if (graph && payload) {
        const { id } = payload as { id: string };
        queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
          nodes: graph.nodes.filter((n: KnowledgeNode): boolean => n.id !== id),
          edges: graph.edges.filter(
            (e: KnowledgeEdge): boolean => e.fromNode !== id && e.toNode !== id,
          ),
        });
      }
      break;
    }
    case 'edge_created': {
      const graph = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      if (graph && payload) {
        const newEdge = payload as unknown as KnowledgeEdge;
        if (!graph.edges.some((e: KnowledgeEdge): boolean => e.id === newEdge.id)) {
          queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
            ...graph,
            edges: [...graph.edges, newEdge],
          });
        }
      }
      break;
    }
    case 'edge_deleted': {
      const graph = queryClient.getQueryData<KnowledgeGraphData>(QUERY_KEYS.graph);
      if (graph && payload) {
        const { id } = payload as { id: string };
        queryClient.setQueryData<KnowledgeGraphData>(QUERY_KEYS.graph, {
          ...graph,
          edges: graph.edges.filter((e: KnowledgeEdge): boolean => e.id !== id),
        });
      }
      break;
    }
    case 'card_updated': {
      const cards = queryClient.getQueryData<CardContent[]>(QUERY_KEYS.cards);
      if (cards && payload) {
        const updated = payload as unknown as CardContent;
        const idx = cards.findIndex((c: CardContent): boolean => c.sectionKey === updated.sectionKey);
        if (idx >= 0) {
          const next = [...cards];
          next[idx] = updated;
          queryClient.setQueryData(QUERY_KEYS.cards, next);
        } else {
          queryClient.setQueryData(QUERY_KEYS.cards, [...cards, updated]);
        }
      }
      break;
    }
    case 'action_task_created': {
      const tasks = queryClient.getQueryData<ActionTask[]>(QUERY_KEYS.actionTasks);
      if (tasks && payload) {
        const newTask = payload as unknown as ActionTask;
        if (!tasks.some((t: ActionTask): boolean => t.id === newTask.id)) {
          queryClient.setQueryData<ActionTask[]>(QUERY_KEYS.actionTasks, [...tasks, newTask]);
        }
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actionTasksOverview });
      break;
    }
    case 'action_task_updated': {
      const tasks = queryClient.getQueryData<ActionTask[]>(QUERY_KEYS.actionTasks);
      if (tasks && payload) {
        const updated = payload as unknown as ActionTask;
        queryClient.setQueryData<ActionTask[]>(
          QUERY_KEYS.actionTasks,
          tasks.map((t: ActionTask): ActionTask =>
            t.id === updated.id ? { ...t, ...updated } : t,
          ),
        );
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actionTasksOverview });
      break;
    }
    case 'action_task_deleted': {
      const tasks = queryClient.getQueryData<ActionTask[]>(QUERY_KEYS.actionTasks);
      if (tasks && payload) {
        const { id } = payload as { id: string };
        queryClient.setQueryData<ActionTask[]>(
          QUERY_KEYS.actionTasks,
          tasks.filter((t: ActionTask): boolean => t.id !== id),
        );
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.actionTasksOverview });
      break;
    }
    case 'graph_changed': {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.graph });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards });
      break;
    }
    default:
      break;
  }
}

export { QUERY_KEYS };
