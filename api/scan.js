// POST /api/scan
// Body: { image: string (base64), mediaType: string, mode: 'food' | 'recipe' }
// Returns: { result: ScanResult | RecipeResult }

const SYSTEM_INSTRUCTION = 'You are a nutrition expert. Always respond with a single valid JSON object only. Never use markdown code blocks. Never add any text before or after the JSON.';

const FOOD_PROMPT = `Analyzuj jídlo na fotce a vrať JSON v tomto přesném formátu:
{"dish_name":"název jídla česky","ingredients":[{"name":"název česky","estimated_amount":"150g","category":"protein|carb|fat|vegetable|fruit|dairy|other","kcal_estimate":0}],"estimated_macros":{"kcal":0,"carbs_g":0,"protein_g":0,"fat_g":0},"confidence":"high|medium|low","cycling_note":"poznámka pro cyklistu"}

Pokud na fotce není jídlo: {"error":"not_food","message":"Na fotce nebylo rozpoznáno jídlo."}
Pokud je fotka nekvalitní: {"error":"low_quality","message":"Fotka je příliš tmavá nebo rozmazaná."}`;

const RECIPE_PROMPT = `Přečti recept na fotce a vrať JSON v tomto přesném formátu:
{"recipe_name":"název receptu česky","servings":4,"ingredients":[{"name":"název česky","amount":"200g","grams":200,"category":"protein|carb|fat|vegetable|fruit|dairy|other","kcal_total":0}],"per_serving_macros":{"kcal":0,"carbs_g":0,"protein_g":0,"fat_g":0},"confidence":"high|medium|low","cycling_note":"poznámka pro cyklistu"}

Důležité: "kcal_total" u každé ingredience = celkové kcal pro celé množství té ingredience v receptu (ne na porci). "per_serving_macros" = makra na 1 porci (celkové makra děleno počtem porcí).

Pokud na fotce není recept: {"error":"not_recipe","message":"Na fotce nebyl rozpoznán recept."}
Pokud je text nečitelný: {"error":"low_quality","message":"Text receptu je nečitelný."}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { image, mediaType = 'image/jpeg', mode = 'food', apiKey: userApiKey } = body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const apiKey = (userApiKey || process.env.ANTHROPIC_API_KEY || '').trim();
    if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' });

    const prompt = mode === 'recipe' ? RECIPE_PROMPT : FOOD_PROMPT;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: SYSTEM_INSTRUCTION,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('Claude error:', claudeRes.status, errText);
      return res.status(502).json({ error: `API error ${claudeRes.status}: ${errText.slice(0, 200)}` });
    }

    const data = await claudeRes.json();
    const rawText = data.content?.[0]?.text || '';

    let result;
    // 1) přímý parse
    try { result = JSON.parse(rawText); } catch { /* try next */ }
    // 2) strip markdown fences
    if (!result) {
      try { result = JSON.parse(rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()); } catch { /* try next */ }
    }
    // 3) regex extract first {...} block
    if (!result) {
      const m = rawText.match(/\{[\s\S]*\}/);
      if (m) try { result = JSON.parse(m[0]); } catch { /* fail */ }
    }

    if (!result) {
      console.error('JSON parse failed, raw response:', rawText.slice(0, 600));
      return res.status(502).json({ error: 'Nepodařilo se zpracovat odpověď AI. Raw: ' + rawText.slice(0, 150) });
    }

    return res.status(200).json({ result });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
