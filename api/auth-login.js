import { createSessionCookie, verifyPassword } from './_auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!verifyPassword(req.body?.password ?? '')) {
    res.status(401).json({ error: 'Nesprávné heslo.' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  res.status(200).json({
    user: { id: process.env.CYCLOFUEL_USER_ID || 'cyclofuel-main-user' },
  });
}
