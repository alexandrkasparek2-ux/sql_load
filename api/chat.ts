// POST /api/chat
// Body: { messages: [{role, content}], context: string }
// Returns: { reply: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const { messages, context } = req.body as {
    messages: { role: 'user' | 'model'; content: string }[];
    context:  string;
  };

  if (!messages?.length) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  // Build Gemini conversation history
  // System prompt is injected as the first "user" turn with model ack
  const systemPrompt = `Jsi výživový poradce specializovaný na cyklistiku a vytrvalostní sporty.
Odpovídáš stručně, prakticky a v češtině. Nepoužívej zbytečně dlouhé odpovědi.

Aktuální data uživatele:
${context}

Pravidla:
- Vždy zohledni tréninkový typ a cíl dne
- Doporučuj konkrétní potraviny nebo množství
- Pokud chybí data, řekni co by uživatel měl zadat
- Nepiš úvody jako "Samozřejmě!" nebo "Výborně!" – jdi rovnou k věci`;

  // Gemini format: contents array with role + parts
  const contents = [
    { role: 'user',  parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Rozumím. Jsem připraven radit s výživou pro cyklistiku.' }] },
    ...messages.map(m => ({
      role:  m.role,
      parts: [{ text: m.content }],
    })),
  ];

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature:     0.7,
            maxOutputTokens: 500,
            topP:            0.9,
          },
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
      const err = await geminiRes.text();
      console.error('Gemini error:', err);
      return res.status(502).json({ error: 'Gemini API error', detail: err });
    }

    const data = await geminiRes.json() as {
      candidates: { content: { parts: { text: string }[] } }[];
    };

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Omlouvám se, nepodařilo se získat odpověď.';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
