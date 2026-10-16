export interface KnowledgeNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  isCenter: boolean;
}

export interface KnowledgeEdge {
  id: string;
  fromNode: string;
  toNode: string;
}

export interface CardContent {
  id: string;
  sectionKey: string;
  content: string;
}

export type ProfileStage = 'foundation' | 'deep' | 'future';

export interface ProfileCard {
  sectionKey: string;
  title: string;
  emoji: string;
  color: string;
  content: string;
  proficiency?: number;
}

export interface ProfileStageData {
  stage: ProfileStage;
  label: string;
  emoji: string;
  gradient: string;
  cards: ProfileCard[];
}

export interface ProfileGraphResponse {
  stages: ProfileStageData[];
}

export type ActionTaskStatus = 'todo' | 'in_progress' | 'done';

export type ActionTaskType = 'learning' | 'job_hunting' | 'money_making';

export interface ActionTask {
  id: string;
  title: string;
  status: ActionTaskStatus;
  taskType: ActionTaskType;
  dueDate: string | null;
  sortOrder: number;
  isStarred: boolean;
}

export interface ActionTasksOverview {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  weekDone: number;
  weekTotal: number;
}

export interface CreateActionTaskRequest {
  title: string;
  status?: ActionTaskStatus;
  taskType?: ActionTaskType;
  dueDate?: string | null;
  isStarred?: boolean;
}

export interface UpdateActionTaskRequest {
  title?: string;
  status?: ActionTaskStatus;
  taskType?: ActionTaskType;
  dueDate?: string | null;
  sortOrder?: number;
  isStarred?: boolean;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface InitGraphRequest {
  nodes: Omit<KnowledgeNode, 'id'>[];
  edges: { fromNode: string; toNode: string }[];
}

export interface UpdateNodeRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  x?: number;
  y?: number;
  isCenter?: boolean;
}

export interface CreateNodeRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  x: number;
  y: number;
  isCenter?: boolean;
}

export interface CreateEdgeRequest {
  fromNode: string;
  toNode: string;
}

export interface UpdateCardContentRequest {
  content: string;
}

export interface BatchUpdateCardsRequest {
  cards: { sectionKey: string; content: string }[];
}

export interface AiSuggestionItem {
  title: string;
  content: string;
}

export interface AiAnalyzeResponse {
  suggestions: AiSuggestionItem[];
  rawText?: string;
  conversationId?: string;
}

export interface ActivityLog {
  id: string;
  actionType: string;
  content: string;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  userInput?: string;
  aiResponse: string;
  createdAt: string;
}

export interface ActivityLogsResponse {
  items: ActivityLog[];
  total: number;
}

export interface AiConversationsResponse {
  items: AiConversation[];
}

export interface UserStatsResponse {
  weekCompletedTasks: number;
  totalCompletedTasks: number;
  streakDays: number;
  lastAiSuggestionAt: string | null;
}

export interface TaskTypeDistribution {
  learning: number;
  job_hunting: number;
  money_making: number;
}

export interface DashboardStats {
  totalNodes: number;
  totalEdges: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  aiSuggestionsCount: number;
  todayActivity: number;
  weeklyProgress: number;
  weeklyTaskCounts: DailyTaskCount[];
  weekCompletedTasks: number;
  streakDays: number;
  lastAiSuggestionAt: string | null;
  taskTypeDistribution: TaskTypeDistribution;
  weekOverWeekChange: number;
}

export interface DailyTaskCount {
  date: string;
  count: number;
}

export interface OperationHistoryItem {
  id: string;
  actionType: string;
  description: string;
  detail?: Record<string, unknown>;
  createdAt: string;
}

export interface OperationHistoryResponse {
  items: OperationHistoryItem[];
  total: number;
}

export interface CreateOperationHistoryRequest {
  actionType: string;
  description: string;
  detail?: Record<string, unknown>;
}

export interface CreateActivityLogRequest {
  actionType: string;
  content: string;
}

export interface KnowledgeSseEvent {
  type:
    | 'connected'
    | 'node_updated'
    | 'node_created'
    | 'node_deleted'
    | 'card_updated'
    | 'edge_created'
    | 'edge_deleted'
    | 'graph_changed'
    | 'action_task_created'
    | 'action_task_updated'
    | 'action_task_deleted';
  payload?: Record<string, unknown>;
  timestamp: number;
}

export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  resetToken?: string;
  resetUrl?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export type InsightSourceType = 'douyin' | 'xiaohongshu' | 'zhihu' | 'other';
export type InsightCredibility = 'high' | 'medium' | 'low';

export interface Insight {
  id: string;
  title: string;
  originalContent: string;
  summary?: string;
  counterIntuitive?: string;
  applicableScenario?: string;
  actionItem?: string;
  credibility?: InsightCredibility;
  sourceType: InsightSourceType;
  linkedNodeId?: string;
  createdAt: string;
}

export interface ExtractInsightRequest {
  content: string;
  sourceType?: InsightSourceType;
}

export interface ExtractedInsight {
  title: string;
  summary: string;
  counterIntuitive: string;
  applicableScenario: string;
  actionItem: string;
  credibility: InsightCredibility;
}

export interface CreateInsightRequest {
  title: string;
  originalContent: string;
  summary?: string;
  counterIntuitive?: string;
  applicableScenario?: string;
  actionItem?: string;
  credibility?: InsightCredibility;
  sourceType: InsightSourceType;
}

export interface LinkInsightNodeRequest {
  linkedNodeId?: string;
}

export interface InsightListResponse {
  items: Insight[];
}
