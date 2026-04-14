import './setup.js';
import { describe, it, expect } from 'vitest';
import {
  appendMessage,
  deleteToken,
  getRecentMessages,
  getToken,
  listMonitoredUsers,
  saveToken,
  setMonitoring,
  upsertUser,
  wasAlertSentRecently,
  logAlert,
} from '../src/db/schema.js';

describe('db/schema', () => {
  it('upserts a user idempotently', () => {
    const a = upsertUser(1001);
    const b = upsertUser(1001);
    expect(a.id).toBe(b.id);
    expect(a.telegram_id).toBe(1001);
  });

  it('stores and retrieves OAuth tokens per provider', () => {
    const u = upsertUser(2002);
    saveToken({
      user_id: u.id,
      provider: 'strava',
      access_token: 'acc',
      refresh_token: 'ref',
      expires_at: 10,
      extra_json: null,
    });
    const row = getToken(u.id, 'strava');
    expect(row?.access_token).toBe('acc');
    expect(row?.refresh_token).toBe('ref');

    saveToken({
      user_id: u.id,
      provider: 'strava',
      access_token: 'acc2',
      refresh_token: 'ref2',
      expires_at: 20,
      extra_json: null,
    });
    expect(getToken(u.id, 'strava')?.access_token).toBe('acc2');

    deleteToken(u.id, 'strava');
    expect(getToken(u.id, 'strava')).toBeUndefined();
  });

  it('tracks monitoring opt-in and lists only enabled users', () => {
    const u1 = upsertUser(3003);
    const u2 = upsertUser(3004);
    setMonitoring(u1.id, true);
    setMonitoring(u2.id, false);
    const enabled = listMonitoredUsers().map((u) => u.telegram_id);
    expect(enabled).toContain(3003);
    expect(enabled).not.toContain(3004);
  });

  it('appends and returns conversation messages in chronological order', () => {
    const u = upsertUser(4004);
    appendMessage({
      user_id: u.id,
      role: 'user',
      content: 'hi',
      created_at: 1,
    });
    appendMessage({
      user_id: u.id,
      role: 'assistant',
      content: 'hey',
      created_at: 2,
    });
    const msgs = getRecentMessages(u.id, 10);
    expect(msgs.map((m) => m.content)).toEqual(['hi', 'hey']);
  });

  it('dedups alerts inside the window', () => {
    const u = upsertUser(5005);
    expect(wasAlertSentRecently(u.id, 'k', 60)).toBe(false);
    logAlert(u.id, 'k');
    expect(wasAlertSentRecently(u.id, 'k', 60)).toBe(true);
    expect(wasAlertSentRecently(u.id, 'other', 60)).toBe(false);
  });
});
