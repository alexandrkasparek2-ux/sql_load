import './setup.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('token crypto', () => {
  const prev = process.env.TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (prev == null) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = prev;
  });

  it('is a no-op when no key is configured', async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    const { encrypt, decrypt, isEncryptionEnabled } = await import(
      '../src/utils/crypto.js'
    );
    expect(isEncryptionEnabled()).toBe(false);
    expect(encrypt('hello')).toBe('hello');
    expect(decrypt('hello')).toBe('hello');
    expect(encrypt(null)).toBeNull();
    expect(decrypt(null)).toBeNull();
  });

  it('round-trips with a key', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'super-secret-env-value';
    const { encrypt, decrypt, isEncryptionEnabled } = await import(
      '../src/utils/crypto.js'
    );
    expect(isEncryptionEnabled()).toBe(true);
    const c = encrypt('access_abc123');
    expect(c).not.toBeNull();
    expect(c!.startsWith('v1:')).toBe(true);
    expect(c).not.toContain('access_abc123');
    expect(decrypt(c)).toBe('access_abc123');
  });

  it('produces different ciphertexts for the same input (IV)', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'k';
    const { encrypt } = await import('../src/utils/crypto.js');
    expect(encrypt('x')).not.toBe(encrypt('x'));
  });

  it('decrypts legacy plaintext values transparently', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'k';
    const { decrypt } = await import('../src/utils/crypto.js');
    // Tokens inserted before encryption was enabled lack the v1: prefix.
    expect(decrypt('plaintext-token')).toBe('plaintext-token');
  });

  it('throws if encrypted value is present but key is missing', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'k';
    const withKey = await import('../src/utils/crypto.js');
    const cipher = withKey.encrypt('secret')!;

    vi.resetModules();
    delete process.env.TOKEN_ENCRYPTION_KEY;
    const noKey = await import('../src/utils/crypto.js');
    expect(() => noKey.decrypt(cipher)).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });
});
