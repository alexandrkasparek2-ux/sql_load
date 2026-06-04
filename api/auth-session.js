import { getSession } from './_auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const session = getSession(req);
  if (!session) {
    res.status(401).json({ user: null });
    return;
  }

  res.status(200).json({ user: { id: session.userId } });
}
