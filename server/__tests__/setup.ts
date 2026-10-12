import { vi } from 'vitest';

vi.mock('@lark-apaas/fullstack-nestjs-core', () => ({
  DRIZZLE_DATABASE: 'DRIZZLE_DATABASE',
}));

const makeColumn = (name: string, tableName: string) => ({
  column: name,
  name,
  tableName,
  dataType: 'string',
  columnType: 'PgVarchar',
  primary: false,
  notNull: true,
  hasDefault: false,
});

vi.mock('@server/database/schema', () => {
  const cardCols = {
    id: makeColumn('id', 'card_contents'),
    sectionKey: makeColumn('section_key', 'card_contents'),
    content: makeColumn('content', 'card_contents'),
    userId: makeColumn('user_id', 'card_contents'),
  };
  const taskCols = {
    id: makeColumn('id', 'action_tasks'),
    title: makeColumn('title', 'action_tasks'),
    status: makeColumn('status', 'action_tasks'),
    taskType: makeColumn('task_type', 'action_tasks'),
    dueDate: makeColumn('due_date', 'action_tasks'),
    sortOrder: makeColumn('sort_order', 'action_tasks'),
    isStarred: makeColumn('is_starred', 'action_tasks'),
    userId: makeColumn('user_id', 'action_tasks'),
    createdAt: makeColumn('_created_at', 'action_tasks'),
    updatedAt: makeColumn('_updated_at', 'action_tasks'),
  };
  const nodeCols = {
    id: makeColumn('id', 'nodes'),
    name: makeColumn('name', 'nodes'),
    description: makeColumn('description', 'nodes'),
    icon: makeColumn('icon', 'nodes'),
    color: makeColumn('color', 'nodes'),
    x: makeColumn('x', 'nodes'),
    y: makeColumn('y', 'nodes'),
    isCenter: makeColumn('is_center', 'nodes'),
    userId: makeColumn('user_id', 'nodes'),
  };
  const userCols = {
    id: makeColumn('id', 'users'),
    email: makeColumn('email', 'users'),
    passwordHash: makeColumn('password_hash', 'users'),
    nickname: makeColumn('nickname', 'users'),
  };

  const makeTable = (cols: Record<string, any>, name: string) => ({
    ...cols,
    [Symbol.for('drizzle:Name')]: name,
    _: { name, columns: cols },
    $inferSelect: {} as any,
    $inferInsert: {} as any,
  });

  return {
    cardContents: makeTable(cardCols, 'card_contents'),
    actionTasks: makeTable(taskCols, 'action_tasks'),
    nodes: makeTable(nodeCols, 'nodes'),
    users: makeTable(userCols, 'users'),
    customTimestamptz: () => ({} as any),
    userProfile: () => ({} as any),
  };
});

vi.mock('drizzle-orm', () => ({
  eq: (column: any, value: any) => ({
    _tag: 'eq',
    left: column,
    right: { value: { val: value } },
  }),
  and: (...conditions: any[]) => ({
    _tag: 'and',
    conditions,
  }),
  count: () => ({ fn: 'count' }),
  gte: (column: any, value: any) => ({
    _tag: 'gte',
    left: column,
    right: { value: { val: value } },
  }),
  lt: (column: any, value: any) => ({
    _tag: 'lt',
    left: column,
    right: { value: { val: value } },
  }),
  desc: (column: any) => ({ _tag: 'desc', column }),
  sql: (strings: TemplateStringsArray, ...values: any[]) => ({
    _tag: 'sql',
    text: strings.reduce((acc, str, i) => {
      const val = values[i];
      let valStr = '';
      if (val !== undefined) {
        if (val && typeof val === 'object' && val.column) {
          valStr = val.column;
        } else if (typeof val === 'string') {
          valStr = val;
        } else if (val !== null) {
          valStr = String(val);
        }
      }
      return acc + str + valStr;
    }, ''),
  }),
  inArray: () => ({ _tag: 'inArray' }),
}));
