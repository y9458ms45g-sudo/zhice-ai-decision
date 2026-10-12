/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { guestStore } from '../guest-data';
import type { CardContent, ActionTask } from '@shared/api.interface';

const GUEST_KEY = 'zhice_guest_data';

describe('guest-data localStorage 存取', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      (): `${string}-${string}-${string}-${string}-${string}` => `uuid-${Math.random().toString(36).slice(2)}-xxxx-xxxx-xxxx-xxxxxxxxxxxx` as `${string}-${string}-${string}-${string}-${string}`,
    );
    localStorage.clear();
  });

  it('首次读取时自动写入默认数据到localStorage', () => {
    expect(localStorage.getItem(GUEST_KEY)).toBeNull();
    const data = guestStore.getRawData();
    expect(localStorage.getItem(GUEST_KEY)).toBeTruthy();
    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.cards.length).toBeGreaterThan(0);
    expect(data.tasks.length).toBeGreaterThan(0);
  });

  it('clear() 会清空 localStorage 中的游客数据', () => {
    guestStore.getRawData();
    expect(localStorage.getItem(GUEST_KEY)).toBeTruthy();
    guestStore.clear();
    expect(localStorage.getItem(GUEST_KEY)).toBeNull();
  });

  it('hasData() 根据 localStorage 内容正确判断', () => {
    expect(guestStore.hasData()).toBe(false);
    guestStore.getRawData();
    expect(guestStore.hasData()).toBe(true);
    guestStore.clear();
    expect(guestStore.hasData()).toBe(false);
  });

  it('localStorage 内容损坏时，回退到默认数据', () => {
    localStorage.setItem(GUEST_KEY, '{invalid json!!!');
    const data = guestStore.getRawData();
    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.cards.length).toBeGreaterThan(0);
  });

  it('已存在合法数据时，不覆盖而是直接读取', () => {
    const existing = { nodes: [{ id: 'test-id', name: '测试节点', description: '', icon: '🌟', color: '#fff', x: 0, y: 0, isCenter: true }], edges: [], cards: [], tasks: [] };
    localStorage.setItem(GUEST_KEY, JSON.stringify(existing));
    const data = guestStore.getRawData();
    expect(data.nodes.length).toBe(1);
    expect(data.nodes[0].id).toBe('test-id');
  });
});

describe('guest-data 卡片操作', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      (): `${string}-${string}-${string}-${string}-${string}` => `uuid-${Math.random().toString(36).slice(2)}-xxxx-xxxx-xxxx-xxxxxxxxxxxx` as `${string}-${string}-${string}-${string}-${string}`,
    );
    localStorage.clear();
    guestStore.getRawData();
  });

  it('updateCard 能更新已有卡片', async () => {
    const beforeCards: CardContent[] = await guestStore.getCards();
    const eduCard = beforeCards.find((c: CardContent): boolean => c.sectionKey === 'education');
    expect(eduCard).toBeDefined();

    await guestStore.updateCard('education', '新的教育内容');
    const afterCards: CardContent[] = await guestStore.getCards();
    const updated = afterCards.find((c: CardContent): boolean => c.sectionKey === 'education');
    expect(updated?.content).toBe('新的教育内容');
  });

  it('updateCard 能新增不存在的卡片（upsert语义）', async () => {
    const beforeCards: CardContent[] = await guestStore.getCards();
    expect(beforeCards.find((c: CardContent): boolean => c.sectionKey === 'new_section')).toBeUndefined();

    await guestStore.updateCard('new_section', '新卡片内容');
    const afterCards: CardContent[] = await guestStore.getCards();
    const newCard = afterCards.find((c: CardContent): boolean => c.sectionKey === 'new_section');
    expect(newCard).toBeDefined();
    expect(newCard?.content).toBe('新卡片内容');
  });

  it('batchUpdateCards 能批量更新多张卡片', async () => {
    const results = await guestStore.batchUpdateCards([
      { sectionKey: 'education', content: 'batch edu' },
      { sectionKey: 'experience', content: 'batch exp' },
      { sectionKey: 'brand_new', content: 'batch new' },
    ]);
    expect(results.length).toBe(3);
    expect(results[0].content).toBe('batch edu');
    expect(results[2].sectionKey).toBe('brand_new');

    const cards: CardContent[] = await guestStore.getCards();
    expect(cards.find((c: CardContent): boolean => c.sectionKey === 'education')?.content).toBe('batch edu');
    expect(cards.find((c: CardContent): boolean => c.sectionKey === 'brand_new')?.content).toBe('batch new');
  });
});

describe('guest-data 任务操作', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      (): `${string}-${string}-${string}-${string}-${string}` => `uuid-${Math.random().toString(36).slice(2)}-xxxx-xxxx-xxxx-xxxxxxxxxxxx` as `${string}-${string}-${string}-${string}-${string}`,
    );
    localStorage.clear();
    guestStore.getRawData();
  });

  it('createActionTask 能新增任务，sortOrder 自动递增', async () => {
    const beforeTasks: ActionTask[] = await guestStore.getActionTasks();
    const maxSortBefore = Math.max(...beforeTasks.map((t: ActionTask): number => t.sortOrder));

    const newTask = await guestStore.createActionTask({ title: '新测试任务', taskType: 'learning' });
    expect(newTask.title).toBe('新测试任务');
    expect(newTask.status).toBe('todo');
    expect(newTask.sortOrder).toBe(maxSortBefore + 1);

    const afterTasks: ActionTask[] = await guestStore.getActionTasks();
    expect(afterTasks.length).toBe(beforeTasks.length + 1);
  });

  it('updateActionTask 能修改任务状态和标题', async () => {
    const tasks: ActionTask[] = await guestStore.getActionTasks();
    const first = tasks[0];

    const updated = await guestStore.updateActionTask(first.id, { title: '修改后的标题', status: 'done' });
    expect(updated.title).toBe('修改后的标题');
    expect(updated.status).toBe('done');

    const afterTasks: ActionTask[] = await guestStore.getActionTasks();
    const found = afterTasks.find((t: ActionTask): boolean => t.id === first.id);
    expect(found?.title).toBe('修改后的标题');
    expect(found?.status).toBe('done');
  });

  it('updateActionTask 对不存在的 id 抛错', async () => {
    await expect(guestStore.updateActionTask('non-existent-id', { title: 'x' })).rejects.toThrow('任务不存在');
  });

  it('deleteActionTask 能删除任务', async () => {
    const beforeTasks: ActionTask[] = await guestStore.getActionTasks();
    const first = beforeTasks[0];

    await guestStore.deleteActionTask(first.id);
    const afterTasks: ActionTask[] = await guestStore.getActionTasks();
    expect(afterTasks.length).toBe(beforeTasks.length - 1);
    expect(afterTasks.find((t: ActionTask): boolean => t.id === first.id)).toBeUndefined();
  });

  it('getActionTasksOverview 统计正确', async () => {
    const overview = await guestStore.getActionTasksOverview();
    expect(overview.total).toBeGreaterThan(0);
    expect(overview.done + overview.inProgress + overview.todo).toBe(overview.total);
  });
});

describe('guest-data 知识网络图操作', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      (): `${string}-${string}-${string}-${string}-${string}` => `uuid-${Math.random().toString(36).slice(2)}-xxxx-xxxx-xxxx-xxxxxxxxxxxx` as `${string}-${string}-${string}-${string}-${string}`,
    );
    localStorage.clear();
  });

  it('initGraph 重置数据为默认值', async () => {
    const graph1 = await guestStore.initGraph();
    expect(graph1.nodes.length).toBeGreaterThan(0);
    expect(graph1.edges.length).toBeGreaterThan(0);

    await guestStore.createNode({ name: '测试节点', x: 100, y: 100 });
    const graph2 = await guestStore.getGraph();
    expect(graph2.nodes.length).toBe(graph1.nodes.length + 1);

    const graph3 = await guestStore.initGraph();
    expect(graph3.nodes.length).toBe(graph1.nodes.length);
  });

  it('createNode 新增节点并持久化', async () => {
    await guestStore.initGraph();
    const before = await guestStore.getGraph();

    const node = await guestStore.createNode({
      name: '新增节点',
      description: '描述',
      icon: '🔥',
      color: '#f00',
      x: 50,
      y: 60,
      isCenter: false,
    });
    expect(node.name).toBe('新增节点');
    expect(node.id).toBeTruthy();

    const after = await guestStore.getGraph();
    expect(after.nodes.length).toBe(before.nodes.length + 1);
  });

  it('deleteNode 删除节点时同时删除关联边', async () => {
    const graph = await guestStore.initGraph();
    const centerNode = graph.nodes.find((n) => n.isCenter);
    expect(centerNode).toBeDefined();

    const beforeEdgeCount = graph.edges.length;
    await guestStore.deleteNode(centerNode!.id);

    const after = await guestStore.getGraph();
    expect(after.nodes.length).toBe(graph.nodes.length - 1);
    expect(after.edges.length).toBeLessThan(beforeEdgeCount);
    expect(after.edges.every((e) => e.fromNode !== centerNode!.id && e.toNode !== centerNode!.id)).toBe(true);
  });
});
