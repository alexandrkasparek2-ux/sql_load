// GET /api/whoop-sync
// Header: Authorization: Bearer <access_token>
// Returns: { recovery, sleep, cycle }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sql-load.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token   = auth.slice(7);
  const headers = { Authorization: `Bearer ${token}` };

  const BASE = 'https://api.prod.whoop.com/developer/v1';

  try {
    const [recRes, sleepRes, cycleRes] = await Promise.all([
      fetch(`${BASE}/recovery?limit=1`, { headers }),
      fetch(`${BASE}/sleep?limit=1`,    { headers }),
      fetch(`${BASE}/cycle?limit=1`,    { headers }),
    ]);

    // 401 = token expired
    if (recRes.status === 401) return res.status(401).json({ error: 'token_expired' });

    const [recData, sleepData, cycleData] = await Promise.all([
      recRes.ok   ? recRes.json()   : null,
      sleepRes.ok ? sleepRes.json() : null,
      cycleRes.ok ? cycleRes.json() : null,
    ]);

    return res.json({
      recovery: recData?.records?.[0]   ?? null,
      sleep:    sleepData?.records?.[0] ?? null,
      cycle:    cycleData?.records?.[0] ?? null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(502).json({ error: 'Whoop API unreachable', detail: String(err) });
  }
}
