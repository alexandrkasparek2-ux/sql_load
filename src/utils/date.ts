export function formatLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayLocalISO(): string {
  return formatLocalISODate(new Date());
}

export function addDaysLocalISO(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return formatLocalISODate(next);
}
