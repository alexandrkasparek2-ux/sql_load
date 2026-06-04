type WhereValue = string | number | boolean | null | { in: Array<string | number> };

interface SelectOptions {
  columns?: string[];
  where?: Record<string, WhereValue>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

async function request<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/cyclofuel-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Database request failed');
  }
  return payload.data as T;
}

export async function dbSelect<T>(table: string, options: SelectOptions = {}): Promise<T[]> {
  return request<T[]>({ action: 'select', table, ...options });
}

export async function dbMaybeSingle<T>(table: string, options: SelectOptions = {}): Promise<T | null> {
  const rows = await dbSelect<T>(table, { ...options, limit: 1 });
  return rows[0] ?? null;
}

export async function dbInsert<T>(table: string, row: Record<string, unknown>): Promise<T> {
  return request<T>({ action: 'insert', table, row });
}

export async function dbUpsert<T>(
  table: string,
  row: Record<string, unknown>,
  conflict?: string[],
): Promise<T> {
  return request<T>({ action: 'upsert', table, row, conflict });
}

export async function dbUpdate<T>(
  table: string,
  values: Record<string, unknown>,
  where: Record<string, WhereValue>,
): Promise<T[]> {
  return request<T[]>({ action: 'update', table, values, where });
}

export async function dbDelete(table: string, where: Record<string, WhereValue>): Promise<void> {
  await request<null>({ action: 'delete', table, where });
}
