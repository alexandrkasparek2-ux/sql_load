// POST /api/scan
// Body: { image: string (base64), mediaType: string, mode: 'food' | 'recipe' }
// Returns: { result: ScanResult | RecipeResult }

const FOOD_PROMPT = `Jsi výživový expert specializovaný na cyklistiku. Analyzuj jídlo na fotce.

DŮLEŽITÉ: Odpověz POUZE validním JSON objektem. Žádný text před ani za JSON. Žádné markdown bloky. Žádné vysvětlování.

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

const RECIPE_PROMPT = `Jsi výživový expert specializovaný na cyklistiku. Na fotce je recept (text, kniha, webová stránka). Přečti všechny ingredience z receptu.

DŮLEŽITÉ: Odpověz POUZE validním JSON objektem. Žádný text před ani za JSON. Žádné markdown bloky. Žádné vysvětlování.

Formát odpovědi:
{
  "recipe_name": "název receptu česky",
  "servings": číslo (počet porcí z receptu, výchozí 4 pokud není uvedeno),
  "ingredients": [
    {
      "name": "název ingredience česky",
      "amount": "množství přesně jak je v receptu např. 200g nebo 2 vejce nebo 3 lžíce",
      "grams": číslo (převod na gramy, u tekutin ml=g),
      "category": "protein nebo carb nebo fat nebo vegetable nebo fruit nebo dairy nebo other",
      "kcal_total": číslo (kcal pro celé uvedené množství)
    }
  ],
  "per_serving_macros": {
    "kcal": číslo,
    "carbs_g": číslo,
    "protein_g": číslo,
    "fat_g": číslo
  },
  "confidence": "high nebo medium nebo low",
  "cycling_note": "krátká poznámka zda je jídlo vhodné před/při/po jízdě"
}

Pokud na fotce není recept, vrať: {"error": "not_recipe", "message": "Na fotce nebyl rozpoznán recept."}
Pokud je fotka nekvalitní nebo text nečitelný, vrať: {"error": "low_quality", "message": "Text receptu je nečitelný."}

Analyzuj tento recept a vrať JSON.`;

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
    const { image, mediaType = 'image/jpeg', mode = 'food' } = body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const prompt = mode === 'recipe' ? RECIPE_PROMPT : FOOD_PROMPT;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
            maxOutputTokens: 1500,
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

    let result;
    try {
      // 1) přímý parse
      result = JSON.parse(rawText);
    } catch {
      try {
        // 2) odstranit markdown fences
        const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        result = JSON.parse(stripped);
      } catch {
        // 3) najít první { ... } blok v textu
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          try { result = JSON.parse(match[0]); } catch { /* fall through */ }
        }
        if (!result) {
          console.error('JSON parse error, raw:', rawText.slice(0, 500));
          return res.status(502).json({ error: 'Nepodařilo se zpracovat odpověď AI.' });
        }
      }
    }

    return res.status(200).json({ result });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
