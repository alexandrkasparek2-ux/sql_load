// GET /api/whoop-sync
// Header: Authorization: Bearer <access_token>
// Default:        Returns: { recovery, sleep, cycle }               (latest record of each)
// ?days=N:        Returns: { recoveries, sleeps, cycles, fetchedAt } (history for trend charts)

const BASE = 'https://api.prod.whoop.com/developer/v1';

class WhoopAuthError extends Error {}

async function fetchAllPages(url, headers, start, maxPages = 4) {
  const all = [];
  let nextToken;
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ limit: '25', start });
    if (nextToken) params.set('nextToken', nextToken);
    const r = await fetch(`${url}?${params}`, { headers });
    if (r.status === 401) throw new WhoopAuthError('token_expired');
    if (!r.ok) break;
    const data = await r.json();
    all.push(...(data.records ?? []));
    nextToken = data.next_token;
    if (!nextToken) break;
  }
  return all;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
  const days    = Number(req.query.days);

  try {
    if (days > 0) {
      const start = new Date(Date.now() - days * 86_400_000).toISOString();
      const [recoveries, sleeps, cycles] = await Promise.all([
        fetchAllPages(`${BASE}/recovery`,       headers, start),
        fetchAllPages(`${BASE}/activity/sleep`, headers, start),
        fetchAllPages(`${BASE}/cycle`,          headers, start),
      ]);
      return res.json({ recoveries, sleeps, cycles, fetchedAt: new Date().toISOString() });
    }

    const [recRes, sleepRes, cycleRes] = await Promise.all([
      fetch(`${BASE}/recovery?limit=1`,       { headers }),
      fetch(`${BASE}/activity/sleep?limit=1`, { headers }),
      fetch(`${BASE}/cycle?limit=1`,          { headers }),
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
    if (err instanceof WhoopAuthError) return res.status(401).json({ error: 'token_expired' });
    return res.status(502).json({ error: 'Whoop API unreachable', detail: String(err) });
  }
}
