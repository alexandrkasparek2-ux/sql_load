// POST /api/chat
// Body: { messages: [{role, content}], context: string }
// Returns: { reply: string }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const messages = body.messages || [];
    const context  = body.context  || '';

    if (!messages.length) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const systemPrompt = `Jsi výživový poradce specializovaný na cyklistiku a vytrvalostní sporty.
Odpovídáš stručně, prakticky a v češtině. Nepoužívej zbytečně dlouhé odpovědi.

Aktuální data uživatele:
${context}

Pravidla:
- Vždy zohledni tréninkový typ a cíl dne
- Doporučuj konkrétní potraviny nebo množství
- Pokud chybí data, řekni co by uživatel měl zadat
- Nepiš úvody jako "Samozřejmě!" nebo "Výborně!" – jdi rovnou k věci`;

    const contents = [
      { role: 'user',  parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Rozumím. Jsem připraven radit s výživou pro cyklistiku.' }] },
      ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 500, topP: 0.9 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, errText);
      return res.status(502).json({ error: `Gemini ${geminiRes.status}: ${errText.slice(0, 300)}` });
    }

    const data = await geminiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Omlouvám se, nepodařilo se získat odpověď.';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
