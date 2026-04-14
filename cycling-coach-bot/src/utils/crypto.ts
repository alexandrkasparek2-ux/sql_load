import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/**
 * AES-256-GCM wrapper for sensitive strings (OAuth access/refresh tokens).
 *
 * Enabled by setting TOKEN_ENCRYPTION_KEY to any non-empty string; we hash it
 * with SHA-256 to produce the 32-byte key so operators can use any value from
 * `fly secrets set` / `railway variables set`.
 *
 * Ciphertext format (base64 of):
 *   [12-byte IV][16-byte auth tag][ciphertext]
 *
 * When no key is configured, encrypt/decrypt are no-ops so existing plaintext
 * databases keep working and migration to encryption is optional.
 */

const ALG = 'aes-256-gcm';
const ENVELOPE_PREFIX = 'v1:';

function getKey(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  return createHash('sha256').update(raw, 'utf8').digest();
}

export function isEncryptionEnabled(): boolean {
  return getKey() !== null;
}

export function encrypt(plain: string | null): string | null {
  if (plain == null) return null;
  const key = getKey();
  if (!key) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENVELOPE_PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(stored: string | null): string | null {
  if (stored == null) return null;
  if (!stored.startsWith(ENVELOPE_PREFIX)) return stored; // legacy plaintext
  const key = getKey();
  if (!key) {
    throw new Error(
      'Found encrypted token but TOKEN_ENCRYPTION_KEY is not set.'
    );
  }
  const raw = Buffer.from(stored.slice(ENVELOPE_PREFIX.length), 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
