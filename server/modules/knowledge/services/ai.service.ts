import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc } from 'drizzle-orm';
import { aiConversations, activityLogs, operationHistory } from '@server/database/schema';
import type {
  KnowledgeNode,
  CardContent,
  ActionTask,
  AiAnalyzeResponse,
  AiSuggestionItem,
  AiConversationsResponse,
} from '@shared/api.interface';
import { NodeService } from './node.service';
import { CardService } from './card.service';
import { TaskService } from './task.service';
import { HistoryService } from './history.service';

const SECTION_LABEL_MAP: Record<string, string> = {
  education: '教育背景',
  experience: '实践经历',
  techstack: '技术栈',
  constraints: '生存约束',
  strategy_phase1: '第一阶段战略',
  strategy_phase2: '第二阶段战略',
  strategy_phase3: '第三阶段战略',
  monetize_novel: 'AIGC小说变现',
  monetize_editing: '剪辑接单变现',
  monetize_media: '自媒体变现',
  deep_backend: '后端深耕',
  deep_fullstack: '全栈深耕',
  deep_ai_pm: 'AI产品经理深耕',
  deep_frontend: '前端深耕',
  progress_90days: '90天进度',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly nodeService: NodeService,
    private readonly cardService: CardService,
    private readonly taskService: TaskService,
    private readonly historyService: HistoryService,
  ) {}

  async analyze(userId: number): Promise<AiAnalyzeResponse> {
    const [nodeList, cardList, taskList] = await Promise.all([
      this.nodeService.getNodes(userId),
      this.cardService.getCards(userId),
      this.taskService.getActionTasks(userId),
    ]);

    const nodeLines = nodeList
      .map((n: KnowledgeNode) => `- ${n.icon} ${n.name}：${n.description}`)
      .join('\n');

    const cardSections = cardList
      .map((c: CardContent) => {
        const label = SECTION_LABEL_MAP[c.sectionKey] ?? c.sectionKey;
        return `[${label}]\n${c.content}`;
      })
      .join('\n\n');

    const taskLines = taskList
      .map((t: ActionTask) => {
        const statusLabel = t.status === 'done' ? '已完成' : t.status === 'in_progress' ? '进行中' : '待办';
        const due = t.dueDate ? `（截止 ${t.dueDate}）` : '';
        return `- [${statusLabel}] ${t.title}${due}`;
      })
      .join('\n');

    const historyRows = await this.db
      .select({
        actionType: operationHistory.actionType,
        description: operationHistory.description,
        detail: operationHistory.detail,
        createdAt: operationHistory.createdAt,
      })
      .from(operationHistory)
      .where(eq(operationHistory.userId, userId))
      .orderBy(desc(operationHistory.createdAt))
      .limit(20);

    const doneTasks = historyRows
      .filter((h) => h.actionType === 'task_complete')
      .slice(0, 5)
      .map((h) => `- ${h.description}`)
      .join('\n');

    const recentCards = cardList.slice(0, 5);
    const recentCardLines = recentCards
      .map((c: CardContent) => {
        const label = SECTION_LABEL_MAP[c.sectionKey] ?? c.sectionKey;
        return `[${label}] ${(c.content ?? '').slice(0, 120)}`;
      })
      .join('\n');

    const historySummary = historyRows
      .slice(0, 10)
      .map((h) => `- [${h.actionType}] ${h.description}（${new Date(h.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}）`)
      .join('\n');

    const userData =
      `【知识网络节点】\n${nodeLines}\n\n` +
      `【个人卡片】\n${cardSections}\n\n` +
      `【行动任务列表】\n${taskLines || '暂无任务'}\n\n` +
      `【最近完成的任务】\n${doneTasks || '暂无'}\n\n` +
      `【最近编辑的卡片】\n${recentCardLines || '暂无'}\n\n` +
      `【最近操作记录】\n${historySummary || '暂无'}`;

    const systemPrompt =
      '你是一位温暖又犀利的个人职业决策助手，语气像靠谱的闺蜜/导师。'
      + '请基于用户的教育背景、技能栈、个人品牌情况、知识网络节点、当前任务以及最近的操作历史，'
      + '严格输出 3 条建议，分别对应以下三个主题：\n\n'
      + '【主题1】最该优先做的一件事\n'
      + '【主题2】最该补的一项能力\n'
      + '【主题3】3个月内可落地的一个行动\n\n'
      + '输出格式严格如下，每条建议之间用 === 分隔：\n'
      + '## 建议标题（不超过15字）\n'
      + '建议的具体内容，包含为什么要做、怎么做、预期效果。100字以内。\n\n'
      + '===\n'
      + '## 建议标题\n'
      + '建议的具体内容，包含为什么要做、怎么做、预期效果。100字以内。\n\n'
      + '===\n'
      + '## 建议标题\n'
      + '建议的具体内容，包含为什么要做、怎么做、预期效果。100字以内。\n\n'
      + '要求：\n'
      + '1. 必须恰好 3 条，分别对应上面 3 个主题，顺序不能变\n'
      + '2. 每条建议要具体、可执行，不要空泛的鸡汤\n'
      + '3. 结合用户的实际情况（技能、任务、个人品牌）给出个性化建议\n'
      + '4. 重点参考【最近完成的任务】【最近操作记录】，基于用户的近期动态给出更有针对性的建议\n'
      + '5. 只输出建议内容，不要任何额外说明、开场白或结束语';

    const prompt = `${systemPrompt}\n\n用户情况：\n${userData}`;

    const conversationRows = await this.db
      .select({ userInput: aiConversations.userInput, aiResponse: aiConversations.aiResponse })
      .from(aiConversations)
      .orderBy(desc(aiConversations.createdAt))
      .limit(5);

    const historyMessages = conversationRows
      .slice()
      .reverse()
      .flatMap((row) => [
        { role: 'user' as const, content: row.userInput ?? '请帮我分析一下当前情况并给出建议' },
        { role: 'assistant' as const, content: row.aiResponse },
      ]);

    let fullText = '';
    try {
      fullText = await this.callVolcengineAI(prompt, historyMessages);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('AI分析失败', errMsg);
      let userMsg = 'AI 分析暂时不可用，请稍后再试';
      if (errMsg.includes('ModelNotOpen')) {
        userMsg = '模型尚未开通，请在火山引擎方舟控制台开通对应模型后重试';
      } else if (errMsg.includes('NotFound') || errMsg.includes('endpoint')) {
        userMsg = '接入点 ID 不存在，请检查火山引擎方舟接入点配置';
      } else if (errMsg.includes('AccessDenied') || errMsg.includes('401') || errMsg.includes('403')) {
        userMsg = 'API Key 无效或无权限，请检查火山引擎 API Key 配置';
      } else if (errMsg.includes('timeout') || errMsg.includes('aborted')) {
        userMsg = 'AI 响应超时，请稍后再试';
      }
      throw new BadRequestException(userMsg);
    }

    const suggestions = this.parseSuggestions(fullText);

    const [saved] = await this.db
      .insert(aiConversations)
      .values({
        userInput: '请帮我分析一下当前情况并给出建议',
        aiResponse: fullText,
      })
      .returning({ id: aiConversations.id });

    void this.db.insert(activityLogs).values({
      actionType: 'ai_suggestion',
      content: '获取了AI决策建议',
    });

    this.historyService.recordHistory('ai_suggestion', '获取了AI决策建议', {
      suggestionCount: suggestions.length,
      conversationId: saved?.id,
      fullText,
      suggestions: suggestions.map((s) => ({ title: s.title, content: s.content })),
    }, userId);

    return {
      suggestions,
      rawText: fullText,
      conversationId: saved?.id,
    };
  }

  private async callVolcengineAI(
    userPrompt: string,
    history: { role: 'user' | 'assistant'; content: string }[] = [],
  ): Promise<string> {
    const apiKey = process.env.VOLCENGINE_API_KEY;
    const apiUrl = process.env.VOLCENGINE_API_URL ?? 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const model = process.env.VOLCENGINE_MODEL ?? 'doubao-seed-2-1-lite-260915';

    if (!apiKey) {
      throw new Error('VOLCENGINE_API_KEY 未配置');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: '你是一位温暖又犀利的个人职业决策助手，语气像靠谱的闺蜜/导师。',
            },
            ...history,
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`火山引擎 API 返回 ${response.status}：${errorBody.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data?.choices?.[0]?.message?.content ?? '';
      if (!content.trim()) {
        throw new Error('AI 返回内容为空');
      }
      return content;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseSuggestions(rawText: string): AiSuggestionItem[] {
    if (!rawText || !rawText.trim()) {
      return [];
    }

    const parts = rawText
      .split('===')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    const suggestions: AiSuggestionItem[] = [];

    for (const part of parts) {
      const lines = part.split('\n').filter((line: string) => line.trim().length > 0);
      if (lines.length === 0) continue;

      let title = '';
      let contentLines: string[] = [];

      const firstLine = lines[0].trim();
      if (firstLine.startsWith('## ')) {
        title = firstLine.slice(3).trim();
        contentLines = lines.slice(1);
      } else {
        title = firstLine;
        contentLines = lines.slice(1);
      }

      const content = contentLines
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .join('\n');

      if (title || content) {
        suggestions.push({ title, content });
      }
    }

    return suggestions;
  }

  async getAiConversations(): Promise<AiConversationsResponse> {
    const items = await this.db
      .select({
        id: aiConversations.id,
        userInput: aiConversations.userInput,
        aiResponse: aiConversations.aiResponse,
        createdAt: aiConversations.createdAt,
      })
      .from(aiConversations)
      .orderBy(desc(aiConversations.createdAt))
      .limit(20);
    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}
