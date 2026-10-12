import { EventEmitter } from 'events';
import { describe, it, expect, beforeEach } from 'vitest';
import { CardService } from '../card.service';
import { HistoryService } from '../history.service';
import {
  filterByConditions,
  selectColumns,
  buildSelectQuery,
} from '@server/__tests__/test-helper';

type CardRow = {
  id: string;
  sectionKey: string;
  content: string | null;
  userId: number;
};

function createMockDb(initialCards: CardRow[] = []) {
  let cards: CardRow[] = [...initialCards];
  let nextId = initialCards.length + 1;

  return {
    select: (cols: Record<string, any>) => ({
      from: (_table: unknown) => buildSelectQuery(cards, cols),
    }),
    insert: (_table: unknown) => ({
      values: (vals: CardRow | CardRow[]) => ({
        onConflictDoNothing: (): Promise<void> => {
          const arr = Array.isArray(vals) ? vals : [vals];
          for (const v of arr) {
            const exists = cards.some(
              (c) => c.sectionKey === v.sectionKey && c.userId === v.userId,
            );
            if (!exists) {
              cards.push({ id: `card-${nextId++}`, ...v });
            }
          }
          return Promise.resolve();
        },
        onConflictDoUpdate: (opts: {
          target: unknown[];
          set: Record<string, unknown>;
        }) => ({
          returning: (cols: Record<string, any>): Promise<Record<string, unknown>[]> => {
            const v = vals as CardRow;
            const setObj = opts.set as Partial<CardRow>;
            const existingIdx = cards.findIndex(
              (c) => c.sectionKey === v.sectionKey && c.userId === v.userId,
            );
            if (existingIdx >= 0) {
              cards[existingIdx] = { ...cards[existingIdx], ...setObj };
              return Promise.resolve(selectColumns([cards[existingIdx]], cols));
            }
            const newCard: CardRow = { id: `card-${nextId++}`, ...v };
            cards.push(newCard);
            return Promise.resolve(selectColumns([newCard], cols));
          },
        }),
      }),
    }),
  };
}

function createMockHistoryService() {
  return {
    recordHistory: () => Promise.resolve(),
  } as unknown as HistoryService;
}

describe('CardService', () => {
  let eventEmitter: EventEmitter;
  let service: CardService;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    const mockDb = createMockDb([
      { id: 'admin-1', sectionKey: 'education', content: 'admin edu', userId: 1 },
      { id: 'admin-2', sectionKey: 'experience', content: 'admin exp', userId: 1 },
      { id: 'u2-1', sectionKey: 'education', content: 'user2 edu', userId: 2 },
    ]);
    service = new CardService(
      mockDb as unknown as Parameters<typeof CardService.prototype.constructor>[0],
      eventEmitter,
      createMockHistoryService(),
    );
  });

  it('upsertCard: 新卡片能插入', async () => {
    const result = await service.upsertCard('techstack', 'React + Node', 2);
    expect(result).not.toBeNull();
    expect(result?.sectionKey).toBe('techstack');
    expect(result?.content).toBe('React + Node');

    const cards = await service.getCards(2);
    const tech = cards.find((c) => c.sectionKey === 'techstack');
    expect(tech).toBeDefined();
    expect(tech?.content).toBe('React + Node');
  });

  it('upsertCard: 已有卡片能更新', async () => {
    const result = await service.upsertCard('education', 'new content', 2);
    expect(result).not.toBeNull();
    expect(result?.content).toBe('new content');

    const cards = await service.getCards(2);
    const edu = cards.find((c) => c.sectionKey === 'education');
    expect(edu?.content).toBe('new content');
  });

  it('getCards: 按user_id过滤，只返回当前用户的卡片', async () => {
    const user2Cards = await service.getCards(2);
    expect(user2Cards.length).toBe(1);
    expect(user2Cards[0].sectionKey).toBe('education');
    expect(user2Cards[0].content).toBe('user2 edu');
  });

  it('新用户没有卡片时，能从admin复制初始数据', async () => {
    const user3Cards = await service.getCards(3);
    expect(user3Cards.length).toBe(2);
    const keys = user3Cards.map((c) => c.sectionKey).sort();
    expect(keys).toEqual(['education', 'experience']);
    expect(user3Cards.find((c) => c.sectionKey === 'education')?.content).toBe('admin edu');
  });
});
