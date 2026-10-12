export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function getColumnDbName(col: any): string {
  if (!col) return '';
  if (typeof col === 'string') return col;
  if (col.column) return col.column;
  if (col.name) return col.name;
  return String(col);
}

export function getPropName(col: any): string {
  const dbName = getColumnDbName(col);
  return snakeToCamel(dbName);
}

export type FilterParam = { column: string; value: any; op: string };

export function extractFilters(cond: any): FilterParam[] {
  const result: FilterParam[] = [];
  if (!cond) return result;
  if (cond._tag === 'and' && Array.isArray(cond.conditions)) {
    for (const c of cond.conditions) {
      result.push(...extractFilters(c));
    }
    return result;
  }
  if (cond._tag === 'eq' || cond._tag === 'gte' || cond._tag === 'lt') {
    const column = getColumnDbName(cond.left);
    let value: any;
    if (cond.right?.value !== undefined) {
      value = cond.right.value.val !== undefined ? cond.right.value.val : cond.right.value;
    }
    if (column) {
      result.push({ column, value, op: cond._tag });
    }
  }
  return result;
}

export function filterByConditions<T extends Record<string, any>>(rows: T[], cond: any): T[] {
  const params = extractFilters(cond);
  if (params.length === 0) return rows;
  return rows.filter((row) =>
    params.every((p) => {
      const prop = snakeToCamel(p.column);
      const rowVal = row[prop];
      if (rowVal === undefined) return false;
      switch (p.op) {
        case 'eq':
          return rowVal === p.value;
        case 'gte':
          return new Date(rowVal).getTime() >= new Date(p.value).getTime();
        case 'lt':
          return new Date(rowVal).getTime() < new Date(p.value).getTime();
        default:
          return true;
      }
    }),
  );
}

export function selectColumns<T extends Record<string, any>>(
  rows: T[],
  cols: Record<string, any>,
): Record<string, unknown>[] {
  const keys = Object.keys(cols);
  return rows.map((row) => {
    const r: Record<string, unknown> = {};
    for (const key of keys) {
      const colVal = cols[key];
      if (colVal && colVal._tag === 'sql') {
        const text: string = colVal.text ?? '';
        if (text.includes('max(') || text.includes('MAX(')) {
          const propMatch = text.match(/max\(([^)]+)\)/i);
          if (propMatch) {
            const colRef = propMatch[1].trim();
            const prop = colRef.startsWith('${') ? '' : snakeToCamel(colRef);
            if (prop && rows.length > 0) {
              let maxVal: number = 0;
              for (const r of rows) {
                const v = r[prop];
                if (typeof v === 'number' && v > maxVal) maxVal = v;
              }
              r[key] = maxVal;
              continue;
            }
          }
          r[key] = rows.length > 0 ? 0 : null;
          continue;
        }
        if (text.includes('count(') || text.includes('COUNT(')) {
          r[key] = rows.length;
          continue;
        }
        r[key] = null;
        continue;
      }
      const prop = getPropName(colVal);
      if (prop && row[prop] !== undefined) {
        r[key] = row[prop];
      } else if (row[key] !== undefined) {
        r[key] = row[key];
      } else {
        r[key] = undefined;
      }
    }
    return r;
  });
}

export function buildSelectQuery(store: any[], cols: Record<string, any>) {
  function makeResult(cond: any): any {
    const filtered = filterByConditions(store, cond);
    const result = selectColumns(filtered, cols);
    const promise = Promise.resolve(result);
    const chainable = {
      orderBy: (..._args: unknown[]) => makeResult(cond),
      limit: (_n: number) => makeResult(cond),
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
      finally: promise.finally.bind(promise),
    };
    return chainable;
  }
  return {
    where: makeResult,
  };
}
