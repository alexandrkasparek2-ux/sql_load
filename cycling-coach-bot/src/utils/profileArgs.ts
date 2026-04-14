import type { AthleteProfile } from '../types/index.js';

/**
 * Parse `/profile` arguments of the form `ftp=285 weight=72.5 maxhr=195 goal=haute-route`.
 * Unknown keys are ignored. Numeric fields must parse as finite positives.
 * Returns either a patch (subset of AthleteProfile) or an error describing
 * the first offending token.
 */
export function parseProfileArgs(
  raw: string
): { ok: true; patch: Partial<AthleteProfile> } | { ok: false; error: string } {
  const patch: Partial<AthleteProfile> = {};
  // Pull out goal="multi word" first so subsequent split doesn't mangle it.
  let rest = raw;
  const goalQuoted = /\bgoal\s*=\s*"([^"]*)"/i.exec(rest);
  if (goalQuoted) {
    patch.goal = goalQuoted[1].trim() || null;
    rest = rest.slice(0, goalQuoted.index) + rest.slice(goalQuoted.index + goalQuoted[0].length);
  }

  const tokens = rest.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const eq = token.indexOf('=');
    if (eq === -1) {
      return { ok: false, error: `Expected key=value, got "${token}"` };
    }
    const key = token.slice(0, eq).toLowerCase();
    const value = token.slice(eq + 1);
    switch (key) {
      case 'ftp':
      case 'ftp_watts': {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0 || n > 700) {
          return { ok: false, error: `ftp must be 1..700 watts (got "${value}")` };
        }
        patch.ftp_watts = Math.round(n);
        break;
      }
      case 'weight':
      case 'weight_kg': {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 20 || n > 200) {
          return { ok: false, error: `weight must be 20..200 kg (got "${value}")` };
        }
        patch.weight_kg = Math.round(n * 10) / 10;
        break;
      }
      case 'maxhr':
      case 'max_hr': {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 120 || n > 230) {
          return { ok: false, error: `maxhr must be 120..230 bpm (got "${value}")` };
        }
        patch.max_hr = Math.round(n);
        break;
      }
      case 'goal':
        patch.goal = value.trim() || null;
        break;
      default:
        return { ok: false, error: `Unknown key "${key}"` };
    }
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'No recognised fields. Try: ftp=285 weight=72 maxhr=195 goal=...' };
  }
  return { ok: true, patch };
}

export function formatProfile(p: AthleteProfile): string {
  const rows = [
    `FTP: ${p.ftp_watts != null ? `${p.ftp_watts} W` : '—'}`,
    `Weight: ${p.weight_kg != null ? `${p.weight_kg} kg` : '—'}`,
    `Max HR: ${p.max_hr != null ? `${p.max_hr} bpm` : '—'}`,
    `Goal: ${p.goal ?? '—'}`,
  ];
  if (p.ftp_watts != null && p.weight_kg != null) {
    rows.push(`W/kg @ FTP: ${(p.ftp_watts / p.weight_kg).toFixed(2)}`);
  }
  return rows.join('\n');
}
