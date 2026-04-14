import './setup.js';
import { describe, it, expect } from 'vitest';
import { isUserBusy, withUserLock } from '../src/utils/sessionLock.js';

describe('withUserLock', () => {
  it('serialises concurrent calls for the same user', async () => {
    const order: string[] = [];
    const a = withUserLock(1, async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 30));
      order.push('a-end');
      return 'a';
    });
    const b = withUserLock(1, async () => {
      order.push('b-start');
      return 'b';
    });
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toBe('a');
    expect(rb).toBe('b');
    expect(order).toEqual(['a-start', 'a-end', 'b-start']);
  });

  it('does not serialise across users', async () => {
    const order: string[] = [];
    const a = withUserLock(10, async () => {
      order.push('10-start');
      await new Promise((r) => setTimeout(r, 20));
      order.push('10-end');
    });
    const b = withUserLock(11, async () => {
      order.push('11-start');
      order.push('11-end');
    });
    await Promise.all([a, b]);
    // User 11's work must have started before user 10's ended.
    const tenEnd = order.indexOf('10-end');
    const elevenStart = order.indexOf('11-start');
    expect(elevenStart).toBeLessThan(tenEnd);
  });

  it('releases the lock even when the callback throws', async () => {
    await expect(
      withUserLock(99, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    // After the failure the lock should be released, so isUserBusy is false
    // once the microtask queue drains.
    await Promise.resolve();
    expect(isUserBusy(99)).toBe(false);
  });
});
