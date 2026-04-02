// POST /api/scan
// Body: { image: string (base64), mediaType: string }
// Returns: { result: ScanResult }

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
    const { image, mediaType = 'image/jpeg' } = body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const prompt = `Jsi výživový expert specializovaný na cyklistiku. Analyzuj jídlo na fotce a vrať POUZE validní JSON bez jakéhokoliv textu navíc, bez markdown bloků.

Formát odpovědi:
{
  "dish_name": "název jídla česky",
  "ingredients": [
    {
      "name": "název ingredience česky",
      "estimated_amount": "odhadnuté množství např. 150g",
      "category": "protein nebo carb nebo fat nebo vegetable nebo fruit nebo dairy nebo other",
      "kcal_estimate": číslo
    }
  ],
  "estimated_macros": {
    "kcal": číslo,
    "carbs_g": číslo,
    "protein_g": číslo,
    "fat_g": číslo
  },
  "confidence": "high nebo medium nebo low",
  "cycling_note": "krátká poznámka zda je jídlo vhodné před/při/po jízdě"
}

Pokud na fotce není jídlo, vrať: {"error": "not_food", "message": "Na fotce nebylo rozpoznáno jídlo."}
Pokud je fotka nekvalitní, vrať: {"error": "low_quality", "message": "Fotka je příliš tmavá nebo rozmazaná."}

Analyzuj toto jídlo a vrať JSON.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mediaType, data: image } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, errText);
      return res.status(502).json({ error: `API error ${geminiRes.status}: ${errText.slice(0, 200)}` });
    }

    const data = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error('JSON parse error, raw:', rawText.slice(0, 300));
      return res.status(502).json({ error: 'Nepodařilo se zpracovat odpověď AI.' });
    }

    return res.status(200).json({ result });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
