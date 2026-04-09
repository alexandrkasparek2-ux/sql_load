// POST /api/whoop-auth  → exchange code for tokens
// PUT  /api/whoop-auth  → refresh access token

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sql-load.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientId     = process.env.WHOOP_CLIENT_ID ?? '15fc9e46-8c11-40ed-afc6-ffebaee89493';
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientSecret) {
    return res.status(500).json({ error: 'WHOOP_CLIENT_SECRET not configured in Vercel env variables' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  if (req.method === 'POST') {
    // Authorization code → tokens (PKCE)
    const { code, code_verifier, redirect_uri } = body;
    if (!code || !code_verifier || !redirect_uri) {
      return res.status(400).json({ error: 'Missing code, code_verifier or redirect_uri' });
    }

    const params = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      code_verifier,
      redirect_uri,
      client_id:     clientId,
      client_secret: clientSecret,
    });

    const r = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    return res.json(data);
  }

  if (req.method === 'PUT') {
    // Refresh token
    const { refresh_token } = body;
    if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' });

    const params = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token,
      client_id:     clientId,
      client_secret: clientSecret,
    });

    const r = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    return res.json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
