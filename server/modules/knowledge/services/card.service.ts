import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { cardContents } from '@server/database/schema';
import type { CardContent } from '@shared/api.interface';
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
}
