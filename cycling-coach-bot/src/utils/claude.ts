import Anthropic from '@anthropic-ai/sdk';
import { COACH_SYSTEM_PROMPT } from '../prompts/coach.js';
import { logger } from './logger.js';
import { withRetry } from './retry.js';
import type {
  AthleteData,
  AthleteProfile,
  CoachResponse,
  ConversationMessage,
} from '../types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

export async function getCoachingResponse(
  userMessage: string,
  athleteData: AthleteData,
  conversationHistory: ConversationMessage[],
  profile?: AthleteProfile
): Promise<CoachResponse> {
  const history = conversationHistory.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const profileBlock =
    profile &&
    (profile.ftp_watts || profile.weight_kg || profile.max_hr || profile.goal)
      ? `ATHLETE_PROFILE (self-reported):\n\`\`\`json\n${JSON.stringify(
          profile,
          null,
          2
        )}\n\`\`\`\n\n`
      : '';

  const dataBlock = `ATHLETE_DATA (JSON):\n\`\`\`json\n${JSON.stringify(
    athleteData,
    null,
    2
  )}\n\`\`\``;

  const userTurn = `${profileBlock}${dataBlock}\n\nATHLETE_QUESTION: ${userMessage}`;

  // Prompt caching: the coaching system prompt is static across every call,
  // so we mark it as a cache breakpoint. Anthropic returns cached tokens at
  // ~10% of the input cost, which dominates spend on a chatty bot.
  const resp = await withRetry(
    () =>
      client.messages.create({
        model: MODEL,
        max_tokens: 1500,
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
    // JSON.parse failed — typically because the response was truncated at
    // max_tokens mid-string. Try to rescue the partial fields with a regex
    // before giving up and dumping raw text.
    const rescued = rescuePartialCoachJson(cleaned);
    if (rescued) return rescued;
    // Final fallback: dump raw text as summary so we never hard-fail.
    return {
      summary: cleaned.slice(0, 400),
      analysis: [],
      recommendation: '',
    };
  }
}

/**
 * Best-effort extraction of summary / analysis / recommendation / question
 * from a malformed Claude response. Handles truncation at max_tokens: we
 * may have a valid opening `{` but the closing `}` never arrived.
 */
function rescuePartialCoachJson(text: string): CoachResponse | null {
  if (!text.trimStart().startsWith('{')) return null;

  const unescape = (raw: string): string => {
    try {
      return JSON.parse('"' + raw + '"');
    } catch {
      return raw;
    }
  };

  const stringField = (key: string): string | undefined => {
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
    const m = text.match(re);
    return m ? unescape(m[1]) : undefined;
  };

  const summary = stringField('summary');
  const recommendation = stringField('recommendation');
  const question = stringField('question');

  const analysis: string[] = [];
  const arrM = text.match(/"analysis"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
  if (arrM) {
    const re = /"((?:[^"\\]|\\.)*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(arrM[1]))) analysis.push(unescape(m[1]));
  }

  if (!summary && analysis.length === 0 && !recommendation) return null;

  return {
    summary: summary ?? '',
    analysis,
    recommendation: recommendation ?? '',
    question,
  };
}

/**
 * Escape a user-provided string for Telegram's HTML parse mode. HTML mode
 * only needs `<`, `>`, `&` escaped — much more forgiving than legacy Markdown,
 * which blows up on a single unbalanced `*` / `_` / `` ` ``.
 */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Escape for HTML, then convert Claude's Markdown-style `**bold**` into
 * `<b>…</b>`. Claude occasionally slips Markdown syntax into JSON field
 * values despite the system prompt; rendering it instead of showing literal
 * stars is nicer than fighting the model.
 */
function renderInline(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

/**
 * Render a CoachResponse for Telegram. Returned string is safe to send with
 * `parse_mode: 'HTML'`. Callers MUST use HTML parse mode (not Markdown).
 */
export function formatForTelegram(r: CoachResponse): string {
  const parts: string[] = [];
  if (r.summary) parts.push(renderInline(r.summary));
  if (r.analysis.length) {
    parts.push('\n📊 <b>Analysis</b>');
    for (const a of r.analysis) parts.push(`• ${renderInline(a)}`);
  }
  if (r.recommendation) {
    parts.push('\n✅ <b>Recommendation</b>');
    parts.push(renderInline(r.recommendation));
  }
  if (r.question) {
    parts.push(`\n❓ ${renderInline(r.question)}`);
  }
  return parts.join('\n');
}
