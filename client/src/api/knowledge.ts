import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { guestStore } from './guest-data';
import { isGuestMode } from './guest-mode';
import type {
  KnowledgeGraphData,
  KnowledgeNode,
  KnowledgeEdge,
  CardContent,
  CreateNodeRequest,
  UpdateNodeRequest,
  CreateEdgeRequest,
  UpdateCardContentRequest,
  BatchUpdateCardsRequest,
  AiAnalyzeResponse,
  KnowledgeSseEvent,
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
  Insight,
  ExtractedInsight,
  CreateInsightRequest,
   InsightSourceType,
   ProfileGraphResponse,
 } from '@shared/api.interface';

export async function getGraph(): Promise<KnowledgeGraphData> {
  if (isGuestMode()) {
    return guestStore.getGraph();
  }
  try {
    const res = await axiosForBackend.get('/api/knowledge/graph');
    return res.data;
  } catch (error) {
    logger.error('获取知识图谱失败', error);
    throw error;
  }
}

export async function initGraph(): Promise<KnowledgeGraphData> {
  if (isGuestMode()) {
    return guestStore.initGraph();
  }
  try {
    const res = await axiosForBackend.post('/api/knowledge/init');
    return res.data;
  } catch (error) {
    logger.error('初始化知识图谱失败', error);
    throw error;
  }
}

export async function resetGraph(): Promise<KnowledgeGraphData> {
  if (isGuestMode()) {
    return guestStore.initGraph();
  }
  try {
    const res = await axiosForBackend.post('/api/knowledge/reset');
    return res.data;
  } catch (error) {
    logger.error('重置知识图谱失败', error);
    throw error;
  }
}

export async function createNode(data: CreateNodeRequest): Promise<KnowledgeNode> {
  if (isGuestMode()) {
    return guestStore.createNode(data);
  }
  try {
    const res = await axiosForBackend.post('/api/knowledge/nodes', data);
    return res.data;
  } catch (error) {
    logger.error('创建节点失败', error);
    throw error;
  }
}

export async function updateNode(id: string, data: UpdateNodeRequest): Promise<KnowledgeNode> {
  if (isGuestMode()) {
    return guestStore.updateNode(id, data);
  }
  try {
    const res = await axiosForBackend.patch(`/api/knowledge/nodes/${id}`, data);
    return res.data;
  } catch (error) {
    logger.error('更新节点失败', error);
    throw error;
  }
}

export async function deleteNode(id: string): Promise<void> {
  if (isGuestMode()) {
    return guestStore.deleteNode(id);
  }
  try {
    await axiosForBackend.delete(`/api/knowledge/nodes/${id}`);
  } catch (error) {
    logger.error('删除节点失败', error);
    throw error;
  }
}

export async function createEdge(data: CreateEdgeRequest): Promise<KnowledgeEdge> {
  if (isGuestMode()) {
    return guestStore.createEdge(data);
  }
  try {
    const res = await axiosForBackend.post('/api/knowledge/edges', data);
    return res.data;
  } catch (error) {
    logger.error('创建连线失败', error);
    throw error;
  }
}

export async function deleteEdge(id: string): Promise<void> {
  if (isGuestMode()) {
    return guestStore.deleteEdge(id);
  }
  try {
    await axiosForBackend.delete(`/api/knowledge/edges/${id}`);
  } catch (error) {
    logger.error('删除连线失败', error);
    throw error;
  }
}

export async function getCards(): Promise<CardContent[]> {
  if (isGuestMode()) {
    return guestStore.getCards();
  }
  try {
    const res = await axiosForBackend.get('/api/knowledge/cards');
    return res.data;
  } catch (error) {
    logger.error('获取卡片内容失败', error);
    throw error;
  }
}

export async function getProfileGraph(): Promise<ProfileGraphResponse> {
  if (isGuestMode()) {
    const cards: CardContent[] = await guestStore.getCards();
    const contentMap = new Map<string, string>();
    cards.forEach((c: CardContent): void => {
      contentMap.set(c.sectionKey, c.content);
    });
    const parseProficiency = (content: string): number | undefined => {
      const match = content.match(/熟练度[：:]*\s*[★☆]+/);
      if (!match) return undefined;
      const stars = match[0].match(/★/g);
      return stars ? stars.length : undefined;
    };
    const makeCard = (sectionKey: string, title: string, emoji: string, color: string) => ({
      sectionKey,
      title,
      emoji,
      color,
      content: contentMap.get(sectionKey) || '待完善',
      proficiency: parseProficiency(contentMap.get(sectionKey) || ''),
    });
    return {
      stages: [
        {
          stage: 'foundation' as const,
          label: '基础能力',
          emoji: '🌱',
          gradient: 'linear-gradient(135deg, #FFC9DE, #FF9DBB)',
          cards: [
            makeCard('education', '教育背景', '🎓', 'var(--blush)'),
            makeCard('experience', '实践经历', '💼', 'var(--powder)'),
            makeCard('techstack', '技术栈', '🛠️', 'var(--mint)'),
            makeCard('constraints', '关键约束', '🎯', 'var(--lav)'),
          ],
        },
        {
          stage: 'deep' as const,
          label: '专业深耕',
          emoji: '🌊',
          gradient: 'linear-gradient(135deg, #B8E8E0, #84D3B6)',
          cards: [
            makeCard('deep_backend', '后端开发', '⚙️', 'var(--mint)'),
            makeCard('deep_fullstack', '深度全栈', '🧩', 'var(--lav)'),
            makeCard('deep_ai_pm', 'AI产品经理', '🤖', 'var(--butter)'),
            makeCard('deep_frontend', 'FED前端', '🎨', 'var(--peach)'),
          ],
        },
        {
          stage: 'future' as const,
          label: '未来方向',
          emoji: '🚀',
          gradient: 'linear-gradient(135deg, #FFE7A8, #FFD36B)',
          cards: [],
        },
      ],
    };
  }
  try {
    const res = await axiosForBackend.get('/api/knowledge/profile-graph');
    return res.data;
  } catch (error) {
    logger.error('获取综合画像图谱失败', error);
    throw error;
  }
}

export async function updateCard(sectionKey: string, content: string): Promise<CardContent> {
  if (isGuestMode()) {
    return guestStore.updateCard(sectionKey, content);
  }
  try {
    const data: UpdateCardContentRequest = { content };
    const res = await axiosForBackend.patch(`/api/knowledge/cards/${sectionKey}`, data);
    return res.data;
  } catch (error) {
    logger.error('更新卡片失败', error);
    throw error;
  }
}

export async function batchUpdateCards(
  cards: { sectionKey: string; content: string }[],
): Promise<CardContent[]> {
  if (isGuestMode()) {
    return guestStore.batchUpdateCards(cards);
  }
  try {
    const data: BatchUpdateCardsRequest = { cards };
    const res = await axiosForBackend.post('/api/knowledge/cards/batch', data);
    return res.data;
  } catch (error) {
    logger.error('批量更新卡片失败', error);
    throw error;
  }
}

export async function analyzeKnowledge(): Promise<AiAnalyzeResponse> {
  if (isGuestMode()) {
    return guestStore.analyzeKnowledge();
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 28000);
    try {
      const res = await axiosForBackend.post('/api/knowledge/analyze', {}, {
        signal: controller.signal,
      });
      return res.data;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    logger.error('AI分析失败', error);
    throw error;
  }
}

function getSseUrl(): string {
  const base = process.env.CLIENT_BASE_PATH || '/';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}/api/knowledge/stream`;
}

export function subscribeKnowledgeChanges(
  onEvent: (event: KnowledgeSseEvent) => void,
): { close: () => void } {
  if (isGuestMode()) {
    return { close: (): void => {} };
  }
  const url = getSseUrl();
  let closed = false;
  let abortController: AbortController | null = null;

  const connect = (): void => {
    if (closed) return;
    const controller = new AbortController();
    abortController = controller;
    const token = localStorage.getItem('zhice_token');
    const csrfToken = document.cookie
      .split('; ')
      .find((c: string): boolean => c.startsWith('suda-csrf-token='))
      ?.split('=')[1];

    fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'X-Suda-Csrf-Token': csrfToken } : {}),
      },
      signal: controller.signal,
    })
       .then((res) => {
         if (res.status === 401) {
           throw new Error('SSE_UNAUTHORIZED');
         }
         if (!res.ok || !res.body) {
           throw new Error(`SSE连接失败: ${res.status}`);
         }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const read = (): void => {
          reader.read().then(({ done, value }) => {
            if (done) return;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() ?? '';
            for (const chunk of lines) {
              if (!chunk.startsWith('data: ')) continue;
              const data = chunk.slice(6);
              if (!data.trim()) continue;
              try {
                const event: KnowledgeSseEvent = JSON.parse(data);
                if (event.type === 'connected') {
                  logger.info('SSE连接已建立');
                  continue;
                }
                onEvent(event);
              } catch (err) {
                logger.error('SSE事件解析失败', err);
              }
            }
            read();
          }).catch((err) => {
             if (closed || err?.name === 'AbortError') return;
            logger.debug('SSE连接断开，3秒后重连', err?.message || '');
            setTimeout(connect, 3000);
          });
        };
        read();
      })
       .catch((err) => {
         if (closed || err?.name === 'AbortError') return;
         if (err?.message === 'SSE_UNAUTHORIZED') {
           return;
         }
         logger.debug('SSE连接失败，3秒后重试', err?.message || '');
         setTimeout(connect, 3000);
       });
  };

  connect();

  return {
    close: (): void => {
      closed = true;
      if (abortController) {
        abortController.abort();
      }
    },
  };
}

export async function getActionTasks(): Promise<ActionTask[]> {
  if (isGuestMode()) {
    return guestStore.getActionTasks();
  }
  const res = await axiosForBackend.get('/api/knowledge/action-tasks');
  return res.data;
}

export async function getActionTasksOverview(): Promise<ActionTasksOverview> {
  if (isGuestMode()) {
    return guestStore.getActionTasksOverview();
  }
  const res = await axiosForBackend.get('/api/knowledge/action-tasks/overview');
  return res.data;
}

export async function createActionTask(dto: CreateActionTaskRequest): Promise<ActionTask> {
  if (isGuestMode()) {
    return guestStore.createActionTask(dto);
  }
  const res = await axiosForBackend.post('/api/knowledge/action-tasks', dto);
  return res.data;
}

export async function updateActionTask(
  id: string,
  dto: UpdateActionTaskRequest,
): Promise<ActionTask> {
  if (isGuestMode()) {
    return guestStore.updateActionTask(id, dto);
  }
  const res = await axiosForBackend.patch(`/api/knowledge/action-tasks/${id}`, dto);
  return res.data;
}

export async function deleteActionTask(id: string): Promise<void> {
  if (isGuestMode()) {
    return guestStore.deleteActionTask(id);
  }
  await axiosForBackend.delete(`/api/knowledge/action-tasks/${id}`);
}

export async function getActivityLogs(limit = 20): Promise<ActivityLogsResponse> {
  if (isGuestMode()) {
    return guestStore.getActivityLogs(limit);
  }
  const res = await axiosForBackend.get('/api/knowledge/activity-logs', {
    params: { limit },
  });
  return res.data;
}

export async function createActivityLog(
  dto: CreateActivityLogRequest,
): Promise<void> {
  if (isGuestMode()) {
    return guestStore.createActivityLog();
  }
  await axiosForBackend.post('/api/knowledge/activity-logs', dto);
}

export async function getAiConversations(): Promise<AiConversationsResponse> {
  if (isGuestMode()) {
    return guestStore.getAiConversations();
  }
  const res = await axiosForBackend.get('/api/knowledge/ai-conversations');
  return res.data;
}

export async function getUserStats(): Promise<UserStatsResponse> {
  if (isGuestMode()) {
    return guestStore.getUserStats();
  }
  const res = await axiosForBackend.get('/api/knowledge/user-stats');
  return res.data;
}

export async function getOperationHistory(
  limit = 20,
  offset = 0,
): Promise<OperationHistoryResponse> {
  if (isGuestMode()) {
    return guestStore.getOperationHistory(limit, offset);
  }
  const res = await axiosForBackend.get('/api/knowledge/operation-history', {
    params: { limit, offset },
  });
  return res.data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (isGuestMode()) {
    return guestStore.getDashboardStats();
  }
  const res = await axiosForBackend.get('/api/knowledge/dashboard/stats');
  return res.data;
}

export async function createOperationHistory(
  dto: CreateOperationHistoryRequest,
): Promise<void> {
  if (isGuestMode()) {
    return guestStore.createOperationHistory();
  }
  await axiosForBackend.post('/api/knowledge/operation-history', dto);
}

// --- Insights ---

export async function extractInsight(
  content: string,
  sourceType?: InsightSourceType,
  signal?: AbortSignal,
): Promise<ExtractedInsight> {
  if (isGuestMode()) {
    return {
      title: '示例观点标题',
      summary: '这是一段示例摘要内容，展示AI提取后的核心观点。',
      counterIntuitive: '反直觉的点是看似简单的事情其实很复杂。',
      applicableScenario: '适用于学习和工作中的决策场景。',
      actionItem: '立即尝试并记录反馈。',
      credibility: 'medium',
    };
  }
  try {
    const res = await axiosForBackend.post(
      '/api/knowledge/insights/extract',
      { content, sourceType },
      { signal, timeout: 45000 },
    );
    return res.data;
  } catch (error) {
    logger.error('提取观点失败', error);
    throw error;
  }
}

export async function createInsight(dto: CreateInsightRequest): Promise<Insight> {
  if (isGuestMode()) {
    return {
      id: `insight_${Date.now()}`,
      ...dto,
      createdAt: new Date().toISOString(),
    };
  }
  try {
    const res = await axiosForBackend.post('/api/knowledge/insights', dto);
    return res.data;
  } catch (error) {
    logger.error('创建观点失败', error);
    throw error;
  }
}

export async function getInsights(): Promise<Insight[]> {
  if (isGuestMode()) {
    return [];
  }
  try {
    const res = await axiosForBackend.get('/api/knowledge/insights');
    return res.data;
  } catch (error) {
    logger.error('获取观点列表失败', error);
    throw error;
  }
}

export async function linkInsightNode(
  id: string,
  linkedNodeId?: string,
): Promise<Insight> {
  if (isGuestMode()) {
    return {
      id,
      title: '',
      originalContent: '',
      sourceType: 'other',
      createdAt: new Date().toISOString(),
      linkedNodeId,
    };
  }
  try {
    const res = await axiosForBackend.patch(
      `/api/knowledge/insights/${id}/link`,
      { linkedNodeId },
    );
    return res.data;
  } catch (error) {
    logger.error('关联节点失败', error);
    throw error;
  }
}

export async function deleteInsight(id: string): Promise<void> {
  if (isGuestMode()) {
    return;
  }
  try {
    await axiosForBackend.delete(`/api/knowledge/insights/${id}`);
  } catch (error) {
    logger.error('删除观点失败', error);
    throw error;
  }
}
