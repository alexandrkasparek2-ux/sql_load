// GET /api/athlete-summary?user_id=<uuid>&days=<N>
// Header: Authorization: Bearer <BOT_API_TOKEN>
//
// Returns an aggregated view of the athlete's recent nutrition + training
// data from Supabase, safe to hand to an LLM. Read-only, no user-writable
// state. Intended to be called by the cycling-coach-bot running on Railway.
//
// Env vars required:
//   - SUPABASE_URL (already configured for the web app via VITE_SUPABASE_URL
//     — but this server function needs the non-prefixed form too)
//   - SUPABASE_SERVICE_ROLE_KEY (server-only, never exposed to the browser)
//   - BOT_API_TOKEN (shared secret between bot and this endpoint)

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedToken = (process.env.BOT_API_TOKEN || '').trim();
  const supabaseUrl =
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!expectedToken) {
    return res
      .status(500)
      .json({ error: 'BOT_API_TOKEN not configured on the server' });
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      error:
        'Supabase credentials missing (need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
    });
  }

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ') || auth.slice(7).trim() !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = String(req.query.user_id || '').trim();
  const days = Math.min(Math.max(Number(req.query.days || 7), 1), 60);
  if (!userId) {
    return res.status(400).json({ error: 'Missing user_id query parameter' });
  }

  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const [profileR, trainingR, foodR] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase
        .from('training_days')
        .select('date, training_type, ride_hours, water_glasses')
        .eq('user_id', userId)
        .gte('date', since)
        .order('date', { ascending: false }),
      supabase
        .from('food_entries')
        .select('date, kcal, carbs, protein, fat, fiber')
        .eq('user_id', userId)
        .gte('date', since),
    ]);

    if (profileR.error) throw profileR.error;
    if (trainingR.error) throw trainingR.error;
    if (foodR.error) throw foodR.error;

    // Aggregate food entries per calendar date.
    const perDay = new Map();
    for (const row of foodR.data ?? []) {
      const d = row.date;
      const bucket = perDay.get(d) ?? {
        date: d,
        kcal: 0,
        carbs_g: 0,
        protein_g: 0,
        fat_g: 0,
        fiber_g: 0,
      };
      bucket.kcal += Number(row.kcal ?? 0);
      bucket.carbs_g += Number(row.carbs ?? 0);
      bucket.protein_g += Number(row.protein ?? 0);
      bucket.fat_g += Number(row.fat ?? 0);
      bucket.fiber_g += Number(row.fiber ?? 0);
      perDay.set(d, bucket);
    }
    const nutritionByDay = Array.from(perDay.values()).sort((a, b) =>
      a.date < b.date ? 1 : -1
    );

    return res.status(200).json({
      ok: true,
      fetched_at: new Date().toISOString(),
      window_days: days,
      profile: profileR.data ?? null,
      training_days: trainingR.data ?? [],
      nutrition_by_day: nutritionByDay,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
    });
  }
}
