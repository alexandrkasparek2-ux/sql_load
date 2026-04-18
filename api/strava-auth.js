// POST /api/strava-auth  → exchange code for tokens
// PUT  /api/strava-auth  → refresh access token

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sql-load.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientId     = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  if (req.method === 'POST') {
    const { code, redirect_uri } = body;
    if (!code || !redirect_uri) {
      return res.status(400).json({ error: 'Missing code or redirect_uri' });
    }

    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        grant_type:    'authorization_code',
        redirect_uri,
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    return res.json(data);
  }

  if (req.method === 'PUT') {
    const { refresh_token } = body;
    if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' });

    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token,
        grant_type:    'refresh_token',
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    return res.json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
