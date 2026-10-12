import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { guestStore } from './guest-data';
import { exitGuestMode } from './guest-mode';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  KnowledgeNode,
  KnowledgeEdge,
  CardContent,
  ActionTask,
} from '@shared/api.interface';

export async function login(data: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await axiosForBackend.post('/api/auth/login', data);
    return response.data;
  } catch (error) {
    logger.error('登录失败', error);
    throw error;
  }
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  try {
    const response = await axiosForBackend.post('/api/auth/register', data);
    return response.data;
  } catch (error) {
    logger.error('注册失败', error);
    throw error;
  }
}

export const TOKEN_KEY = 'zhice_token';
export const USER_KEY = 'zhice_user';

export async function saveAuth(token: string, user: AuthResponse['user']): Promise<void> {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  try {
    await migrateGuestData();
  } catch (error) {
    logger.error('游客数据迁移失败', error);
  }
}

export async function migrateGuestData(): Promise<void> {
  if (!guestStore.hasData()) return;

  const rawData = guestStore.getRawData();
  const nodeIdMap = new Map<string, string>();

  try {
    for (const node of rawData.nodes) {
      const res = await axiosForBackend.post<KnowledgeNode>('/api/knowledge/nodes', {
        name: node.name,
        description: node.description,
        icon: node.icon,
        color: node.color,
        x: node.x,
        y: node.y,
        isCenter: node.isCenter,
      });
      nodeIdMap.set(node.id, res.data.id);
    }

    for (const edge of rawData.edges) {
      const newFrom = nodeIdMap.get(edge.fromNode);
      const newTo = nodeIdMap.get(edge.toNode);
      if (newFrom && newTo) {
        await axiosForBackend.post<KnowledgeEdge>('/api/knowledge/edges', {
          fromNode: newFrom,
          toNode: newTo,
        });
      }
    }

    if (rawData.cards.length > 0) {
      await axiosForBackend.post<CardContent[]>('/api/knowledge/cards/batch', {
        cards: rawData.cards.map((c: CardContent) => ({
          sectionKey: c.sectionKey,
          content: c.content,
        })),
      });
    }

    for (const task of rawData.tasks) {
      await axiosForBackend.post<ActionTask>('/api/knowledge/action-tasks', {
        title: task.title,
        status: task.status,
        taskType: task.taskType,
        dueDate: task.dueDate,
        isStarred: task.isStarred,
      });
    }

    guestStore.clear();
    exitGuestMode();
  } catch (error) {
    logger.error('迁移游客数据到云端失败', error);
    throw error;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthResponse['user'] | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse['user'];
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setupAuthInterceptor(onUnauthorized: () => void): void {
  axiosForBackend.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  axiosForBackend.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        clearAuth();
        onUnauthorized();
      }
      return Promise.reject(error);
    },
  );
}
