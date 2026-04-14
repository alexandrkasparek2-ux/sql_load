/**
 * Per-user async mutex. Prevents two concurrent coaching turns for the same
 * user from racing on conversation history (both would read the same tail,
 * one would overwrite the other's assistant append) and from doubling Claude
 * spend when the user spams during a slow turn.
 *
 * Usage:
 *   await withUserLock(userId, async () => { ... });
 */

const locks = new Map<number, Promise<unknown>>();

export async function withUserLock<T>(
  userId: number,
  fn: () => Promise<T>
): Promise<T> {
  const prev = locks.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  const chained = prev.then(() => next);
  locks.set(userId, chained);
  try {
    await prev;
    return await fn();
  } finally {
    release();
    // Drop the bucket once nobody is waiting so the map doesn't grow.
    if (locks.get(userId) === chained) locks.delete(userId);
  }
}

/**
 * Best-effort: returns true if someone is currently holding the lock.
 * Useful for telling the user "hang on, still working on the previous one".
 */
export function isUserBusy(userId: number): boolean {
  return locks.has(userId);
}
