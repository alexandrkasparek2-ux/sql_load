import Anthropic from '@anthropic-ai/sdk';
import { COACH_SYSTEM_PROMPT } from '../prompts/coach.js';
import { logger } from './logger.js';
import { withRetry } from './retry.js';
import type { AthleteData, CoachResponse, ConversationMessage } from '../types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

export async function getCoachingResponse(
  userMessage: string,
  athleteData: AthleteData,
  conversationHistory: ConversationMessage[]
): Promise<CoachResponse> {
  const history = conversationHistory.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const dataBlock = `ATHLETE_DATA (JSON):\n\`\`\`json\n${JSON.stringify(
    athleteData,
    null,
    2
  )}\n\`\`\``;

  const userTurn = `${dataBlock}\n\nATHLETE_QUESTION: ${userMessage}`;

  // Prompt caching: the coaching system prompt is static across every call,
  // so we mark it as a cache breakpoint. Anthropic returns cached tokens at
  // ~10% of the input cost, which dominates spend on a chatty bot.
  const resp = await withRetry(
    () =>
      client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: [
          {
            type: 'text',
            text: COACH_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [...history, { role: 'user', content: userTurn }],
      }),
    { label: 'claude', retries: 2, baseMs: 700 }
  );

  const usage = resp.usage as any;
  if (usage) {
    logger.info(
      {
        input: usage.input_tokens,
        output: usage.output_tokens,
        cache_read: usage.cache_read_input_tokens ?? 0,
        cache_write: usage.cache_creation_input_tokens ?? 0,
      },
      'claude tokens'
    );
  }

  const text = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
    .trim();

  return parseCoachResponse(text);
}

export function parseCoachResponse(text: string): CoachResponse {
  // Strip fenced code blocks if present.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      summary: String(parsed.summary ?? ''),
      analysis: Array.isArray(parsed.analysis)
        ? parsed.analysis.map(String)
        : [],
      recommendation: String(parsed.recommendation ?? ''),
      question: parsed.question ? String(parsed.question) : undefined,
    };
  } catch {
    // Fallback: dump raw text as summary so we never hard-fail on the user.
    return {
      summary: cleaned.slice(0, 400),
      analysis: [],
      recommendation: '',
    };
  }
}

export function formatForTelegram(r: CoachResponse): string {
  const parts: string[] = [];
  if (r.summary) parts.push(r.summary);
  if (r.analysis.length) {
    parts.push('\n📊 *Analysis*');
    for (const a of r.analysis) parts.push(`• ${a}`);
  }
  if (r.recommendation) {
    parts.push('\n✅ *Recommendation*');
    parts.push(r.recommendation);
  }
  if (r.question) {
    parts.push(`\n❓ ${r.question}`);
  }
  return parts.join('\n');
}
