import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { cardContents } from '@server/database/schema';
import type { CardContent, ProfileGraphResponse, ProfileStageData, ProfileCard } from '@shared/api.interface';
import { HistoryService } from './history.service';

@Injectable()
export class CardService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject('KNOWLEDGE_EVENT_EMITTER') private readonly eventEmitter: EventEmitter,
    private readonly historyService: HistoryService,
  ) {}

  async getCards(userId: number): Promise<CardContent[]> {
    let cards = await this.db.select({
      id: cardContents.id,
      sectionKey: cardContents.sectionKey,
      content: cardContents.content,
    }).from(cardContents).where(eq(cardContents.userId, userId));

    if (cards.length === 0) {
      cards = await this.copyCardsFromAdmin(userId);
    }

    return cards.map((c) => ({
      ...c,
      content: c.content ?? '',
    }));
  }

  private async copyCardsFromAdmin(userId: number): Promise<Array<{ id: string; sectionKey: string; content: string | null }>> {
    const adminCards = await this.db.select({
      sectionKey: cardContents.sectionKey,
      content: cardContents.content,
    }).from(cardContents).where(eq(cardContents.userId, 1));

    if (adminCards.length === 0) return [];

    const values = adminCards.map((c) => ({
      sectionKey: c.sectionKey,
      content: c.content,
      userId,
    }));

    await this.db.insert(cardContents).values(values).onConflictDoNothing();

    return this.db.select({
      id: cardContents.id,
      sectionKey: cardContents.sectionKey,
      content: cardContents.content,
    }).from(cardContents).where(eq(cardContents.userId, userId));
  }

  async upsertCard(sectionKey: string, content: string, userId: number): Promise<CardContent | null> {
    const [result] = await this.db.insert(cardContents)
      .values({ sectionKey, content, userId })
      .onConflictDoUpdate({
        target: [cardContents.sectionKey, cardContents.userId],
        set: { content },
      })
      .returning({
        id: cardContents.id,
        sectionKey: cardContents.sectionKey,
        content: cardContents.content,
      });

    if (!result) return null;
    const card: CardContent = { ...result, content: result.content ?? '' };

    this.eventEmitter.emit('change', {
      type: 'card_updated',
      payload: card,
      timestamp: Date.now(),
      userId,
    });

    if (sectionKey === 'theme_preference') {
      this.historyService.recordHistory('theme_change', '切换了主题', {
        theme: content.slice(0, 100),
      }, userId);
    } else {
      this.historyService.recordHistory('card_edit', `编辑了${sectionKey}卡片`, {
        sectionKey,
      }, userId);
    }

    return card;
  }

  async batchUpsertCards(
    cards: { sectionKey: string; content: string }[],
    userId: number,
  ): Promise<CardContent[]> {
    const results: CardContent[] = [];
    for (const card of cards) {
      const result = await this.upsertCard(card.sectionKey, card.content, userId);
      if (result) results.push(result);
    }
    this.eventEmitter.emit('change', {
      type: 'graph_changed',
      payload: { cards: true },
      timestamp: Date.now(),
      userId,
    });
    return results;
  }

  async getProfileGraph(userId: number): Promise<ProfileGraphResponse> {
    const cards = await this.getCards(userId);
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

    const makeCard = (
      sectionKey: string,
      title: string,
      emoji: string,
      color: string,
    ): ProfileCard => {
      const content = contentMap.get(sectionKey) ?? '';
      return {
        sectionKey,
        title,
        emoji,
        color,
        content: content || '待完善',
        proficiency: parseProficiency(content),
      };
    };

    const stages: ProfileStageData[] = [
      {
        stage: 'foundation',
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
        stage: 'deep',
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
        stage: 'future',
        label: '未来方向',
        emoji: '🚀',
        gradient: 'linear-gradient(135deg, #FFE7A8, #FFD36B)',
        cards: [],
      },
    ];

    return { stages };
  }
}
