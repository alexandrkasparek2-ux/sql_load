import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/schema.js';
import type { ConversationMessage } from '../types/index.js';
import { withRetry } from './retry.js';

/**
 * Rolling summary of older messages. Once a user's conversation grows past a
 * threshold, we collapse everything older than the last N turns into a single
 * synthetic assistant message tagged as a summary. This keeps the context fed
 * to Claude bounded without losing key facts (target events, recent bad
 * workouts, injury mentions, preferences).
 */

const SUMMARY_TRIGGER_COUNT = Number(
  process.env.CONVERSATION_SUMMARY_TRIGGER || 30
);
const KEEP_RECENT = Number(process.env.CONVERSATION_SUMMARY_KEEP_RECENT || 10);

const SUMMARY_MARKER = '[[SUMMARY]]';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

const SUMMARY_SYSTEM = `
You compress a cycling coach <-> athlete conversation into a short memo that
later turns will use as context. Preserve:
- Target events / races and dates.
- Recent injuries, illness, or medications (verbatim).
- Athlete's expressed preferences (rest days, training style, constraints).
- Key recent workouts or data points the athlete referenced.
- Open questions that still need a decision.

Write 6-10 bullet points, terse, no filler. Do not repeat generic coaching
advice.
`.trim();

export async function maybeSummarize(userId: number): Promise<void> {
  const total = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM conversations WHERE user_id = ?`)
      .get(userId) as { n: number }
  ).n;
  if (total < SUMMARY_TRIGGER_COUNT) return;

  // Grab all messages currently in the table, ordered oldest → newest.
  const all = db
    .prepare(
      `SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at ASC`
    )
    .all(userId) as ConversationMessage[];

  const olderCount = all.length - KEEP_RECENT;
  if (olderCount <= 0) return;

  const older = all.slice(0, olderCount);
  const rolling = older
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const summary = await withRetry(
    async () => {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: SUMMARY_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Conversation to compress:\n\n${rolling}`,
          },
        ],
      });
      const text = resp.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
        .trim();
      if (!text) throw new Error('empty summary');
      return text;
    },
    { label: 'summarize', retries: 2, baseMs: 700 }
  );

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM conversations WHERE id IN (${older.map(() => '?').join(',')})`)
      .run(...older.map((m) => m.id));
    db.prepare(
      `INSERT INTO conversations (user_id, role, content, created_at) VALUES (?, ?, ?, ?)`
    ).run(
      userId,
      'assistant',
      `${SUMMARY_MARKER} ${summary}`,
      older[0].created_at
    );
  });
  tx();
  console.log(`[summary] compressed ${older.length} msgs for user ${userId}`);
}

export function isSummaryMessage(m: ConversationMessage): boolean {
  return m.role === 'assistant' && m.content.startsWith(SUMMARY_MARKER);
}
