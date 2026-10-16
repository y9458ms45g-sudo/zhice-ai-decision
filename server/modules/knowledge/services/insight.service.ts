import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, and } from 'drizzle-orm';
import { insights } from '@server/database/schema';
import type {
  Insight,
  ExtractedInsight,
  CreateInsightRequest,
  InsightCredibility,
} from '@shared/api.interface';

const SYSTEM_PROMPT =
  '你是一个职业发展信息提炼专家。用户会粘贴一段来自抖音/小红书/知乎的帖子原文。请提取以下结构化信息，用JSON返回：\n' +
  '- title: 一句话标题（不超过20字）\n' +
  '- summary: 核心观点（1-2句话，去掉情绪词和营销话术）\n' +
  '- counterIntuitive: 反直觉的点（大众容易忽略但实际重要的信息）\n' +
  '- applicableScenario: 这段经验适合什么人/什么场景\n' +
  '- actionItem: 读完可以立刻做的1-3个行动\n' +
  '- credibility: 可信度，取值 high/medium/low\n' +
  '只输出JSON，不要任何额外解释、Markdown代码块或前后缀文字。';

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async extractInsight(content: string, sourceType?: string): Promise<ExtractedInsight> {
    const apiKey = process.env.VOLCENGINE_API_KEY;
    const apiUrl = process.env.VOLCENGINE_API_URL ?? 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const model = process.env.INSIGHTS_MODEL ?? process.env.VOLCENGINE_MODEL ?? 'doubao-seed-2-1-pro';

    if (!apiKey) {
      throw new BadRequestException('VOLCENGINE_API_KEY 未配置');
    }

    const userPrompt = sourceType
      ? `【来源：${sourceType}】\n\n${content}`
      : content;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let rawText = '';
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
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 600,
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
      rawText = data?.choices?.[0]?.message?.content ?? '';
      if (!rawText.trim()) {
        throw new Error('AI 返回内容为空');
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('AI 提取失败', errMsg);
      if (errMsg.includes('timeout') || errMsg.includes('aborted')) {
        throw new BadRequestException('AI 响应超时，请重试');
      }
      throw new BadRequestException('AI 提取失败，请重试');
    } finally {
      clearTimeout(timeoutId);
    }

    return this.parseExtractedInsight(rawText);
  }

  private parseExtractedInsight(rawText: string): ExtractedInsight {
    let parsed: Record<string, unknown> | null = null;

    try {
      parsed = JSON.parse(rawText.trim()) as Record<string, unknown>;
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]) as Record<string, unknown>;
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new BadRequestException('AI 提取失败，请重试');
    }

    const credibilityRaw = parsed.credibility as string | undefined;
    const credibility: InsightCredibility =
      credibilityRaw === 'high' || credibilityRaw === 'medium' || credibilityRaw === 'low'
        ? credibilityRaw
        : 'medium';

    return {
      title: String(parsed.title ?? ''),
      summary: String(parsed.summary ?? ''),
      counterIntuitive: String(parsed.counterIntuitive ?? ''),
      applicableScenario: String(parsed.applicableScenario ?? ''),
      actionItem: String(parsed.actionItem ?? ''),
      credibility,
    };
  }

  async createInsight(dto: CreateInsightRequest, userId: number): Promise<Insight> {
    const [created] = await this.db
      .insert(insights)
      .values({
        userId,
        title: dto.title,
        originalContent: dto.originalContent,
        summary: dto.summary,
        counterIntuitive: dto.counterIntuitive,
        applicableScenario: dto.applicableScenario,
        actionItem: dto.actionItem,
        credibility: dto.credibility,
        sourceType: dto.sourceType,
      })
      .returning({
        id: insights.id,
        title: insights.title,
        originalContent: insights.originalContent,
        summary: insights.summary,
        counterIntuitive: insights.counterIntuitive,
        applicableScenario: insights.applicableScenario,
        actionItem: insights.actionItem,
        credibility: insights.credibility,
        sourceType: insights.sourceType,
        linkedNodeId: insights.linkedNodeId,
        createdAt: insights.createdAt,
      });

    return {
      id: created.id,
      title: created.title,
      originalContent: created.originalContent,
      summary: created.summary ?? undefined,
      counterIntuitive: created.counterIntuitive ?? undefined,
      applicableScenario: created.applicableScenario ?? undefined,
      actionItem: created.actionItem ?? undefined,
      credibility: (created.credibility as InsightCredibility | undefined) ?? undefined,
      sourceType: (created.sourceType as Insight['sourceType']) ?? 'other',
      linkedNodeId: created.linkedNodeId ?? undefined,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listInsights(userId: number): Promise<Insight[]> {
    const rows = await this.db
      .select({
        id: insights.id,
        title: insights.title,
        originalContent: insights.originalContent,
        summary: insights.summary,
        counterIntuitive: insights.counterIntuitive,
        applicableScenario: insights.applicableScenario,
        actionItem: insights.actionItem,
        credibility: insights.credibility,
        sourceType: insights.sourceType,
        linkedNodeId: insights.linkedNodeId,
        createdAt: insights.createdAt,
      })
      .from(insights)
      .where(eq(insights.userId, userId))
      .orderBy(desc(insights.createdAt));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      originalContent: row.originalContent,
      summary: row.summary ?? undefined,
      counterIntuitive: row.counterIntuitive ?? undefined,
      applicableScenario: row.applicableScenario ?? undefined,
      actionItem: row.actionItem ?? undefined,
      credibility: (row.credibility as InsightCredibility | undefined) ?? undefined,
      sourceType: (row.sourceType as Insight['sourceType']) ?? 'other',
      linkedNodeId: row.linkedNodeId ?? undefined,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async linkNode(
    id: string,
    linkedNodeId: string | undefined,
    userId: number,
  ): Promise<Insight | null> {
    const [updated] = await this.db
      .update(insights)
      .set({ linkedNodeId: linkedNodeId ?? null })
      .where(and(eq(insights.id, id), eq(insights.userId, userId)))
      .returning({
        id: insights.id,
        title: insights.title,
        originalContent: insights.originalContent,
        summary: insights.summary,
        counterIntuitive: insights.counterIntuitive,
        applicableScenario: insights.applicableScenario,
        actionItem: insights.actionItem,
        credibility: insights.credibility,
        sourceType: insights.sourceType,
        linkedNodeId: insights.linkedNodeId,
        createdAt: insights.createdAt,
      });

    if (!updated) {
      return null;
    }

    return {
      id: updated.id,
      title: updated.title,
      originalContent: updated.originalContent,
      summary: updated.summary ?? undefined,
      counterIntuitive: updated.counterIntuitive ?? undefined,
      applicableScenario: updated.applicableScenario ?? undefined,
      actionItem: updated.actionItem ?? undefined,
      credibility: (updated.credibility as InsightCredibility | undefined) ?? undefined,
      sourceType: (updated.sourceType as Insight['sourceType']) ?? 'other',
      linkedNodeId: updated.linkedNodeId ?? undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteInsight(id: string, userId: number): Promise<boolean> {
    const deleted = await this.db
      .delete(insights)
      .where(and(eq(insights.id, id), eq(insights.userId, userId)))
      .returning({ id: insights.id });

    return deleted.length > 0;
  }
}
