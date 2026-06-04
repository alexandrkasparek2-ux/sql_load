import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'cyclofuel_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function decode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function secret() {
  if (!process.env.CYCLOFUEL_SESSION_SECRET) {
    throw new Error('Missing CYCLOFUEL_SESSION_SECRET.');
  }
  return process.env.CYCLOFUEL_SESSION_SECRET;
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => {
    const [key, ...rest] = part.trim().split('=');
    return [key, rest.join('=')];
  }).filter(([key]) => key));
}

export function verifyPassword(password) {
  if (!process.env.CYCLOFUEL_APP_PASSWORD) {
    throw new Error('Missing CYCLOFUEL_APP_PASSWORD.');
  }
  return safeEqual(password, process.env.CYCLOFUEL_APP_PASSWORD);
}

export function createSessionCookie() {
  const payload = encode(JSON.stringify({
    userId: process.env.CYCLOFUEL_USER_ID || 'cyclofuel-main-user',
    expiresAt: Date.now() + SESSION_SECONDS * 1000,
  }));
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSession(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(decode(payload));
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Přihlášení vypršelo. Přihlas se znovu.' });
    return null;
  }
  return session;
}
