// GET /api/strava-sync?after=<unix_ts>&before=<unix_ts>&per_page=<n>
// Proxy for Strava API — keeps access_token off the client URL

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sql-load.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });

  const { after, before, per_page = '30' } = req.query;
  const params = new URLSearchParams({ per_page });
  if (after)  params.set('after',  after);
  if (before) params.set('before', before);

  const r = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params}`,
    { headers: { Authorization: auth } },
  );

  const data = await r.json();
  if (!r.ok) return res.status(r.status).json({ error: data });
  return res.json(data);
}
