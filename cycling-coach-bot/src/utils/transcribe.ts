import { withRetry } from './retry.js';

/**
 * Transcribe a Telegram voice message (OGG Opus) using OpenAI Whisper.
 *
 * Telegram doesn't host the file directly — we download it from the file path
 * the Bot API gives us, then forward the bytes to Whisper as multipart form
 * data. Returns the recognised text (trimmed).
 */
export async function transcribeVoice(
  fileUrl: string,
  opts: { filename?: string; mimeType?: string; language?: string } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set — voice messages disabled');
  }

  const audioRes = await withRetry(
    async () => {
      const r = await fetch(fileUrl);
      if (!r.ok) throw new Error(`Telegram file download ${r.status}`);
      return r;
    },
    { label: 'tg-file-download' }
  );

  const bytes = new Uint8Array(await audioRes.arrayBuffer());
  const blob = new Blob([bytes], {
    type: opts.mimeType || 'audio/ogg',
  });

  const model = process.env.WHISPER_MODEL || 'whisper-1';
  const form = new FormData();
  form.append('file', blob, opts.filename || 'voice.ogg');
  form.append('model', model);
  form.append('response_format', 'json');
  if (opts.language) form.append('language', opts.language);

  const resp = await withRetry(
    async () => {
      const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        throw new Error(`Whisper ${r.status}: ${body.slice(0, 200)}`);
      }
      return r;
    },
    { label: 'whisper', retries: 2, baseMs: 800 }
  );

  const j = (await resp.json()) as { text?: string };
  return (j.text ?? '').trim();
}
