// GET /api/intervals-sync?athlete_id=iXXXXX&oldest=YYYY-MM-DD&newest=YYYY-MM-DD
// Proxy pro Intervals.icu API — skrývá Basic auth před přímým CORS

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sql-load.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });

  const { athlete_id, oldest, newest } = req.query;
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' });

  const params = new URLSearchParams();
  if (oldest) params.set('oldest', oldest);
  if (newest) params.set('newest', newest);

  const url = `https://intervals.icu/api/v1/athlete/${athlete_id}/activities?${params}`;

  const r = await fetch(url, { headers: { Authorization: auth } });
  const data = await r.json();
  if (!r.ok) return res.status(r.status).json({ error: data });
  return res.json(data);
}
