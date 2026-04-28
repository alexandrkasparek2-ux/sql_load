// GET /api/ical?url=...
// Server-side proxy: fetches a TrainingPeaks .ics feed and returns parsed events.
// Keeps the private iCal token off the client network log.

function unfold(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '');
}

function unescapeVal(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function parseDate(prop) {
  if (!prop) return null;
  const v = prop.value.trim();
  const p = prop.params || '';
  const dateOnly = /^\d{8}$/.test(v) || p.includes('VALUE=DATE');
  if (dateOnly) return `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function parseDuration(text) {
  if (!text) return 0;
  const m1 = text.match(/[Dd]uration[:\s]+(\d+):(\d{2})(?::(\d{2}))?/);
  if (m1) return parseInt(m1[1]) * 60 + parseInt(m1[2]);
  const m2 = text.match(/[Dd]uration[:\s]+(\d+)\s*min/i);
  if (m2) return parseInt(m2[1]);
  const m3 = text.match(/(\d+)h\s*(\d+)?min?/i);
  if (m3) return parseInt(m3[1]) * 60 + (m3[2] ? parseInt(m3[2]) : 0);
  return 0;
}

function parseTSS(text) {
  if (!text) return 0;
  const m = text.match(/\bTSS[:\s]+(\d+)/i);
  return m ? parseInt(m[1]) : 0;
}

function mapSport(categories, summary) {
  const s = `${categories} ${summary}`.toLowerCase();
  if (/indoor|zwift|trainer|spin/i.test(s)) return 'cycling_indoor';
  if (/bike|cycl|ride|velo/i.test(s)) {
    if (/race|závod/i.test(s)) return 'race';
    const tss = parseTSS(summary);
    if (/interval|vo2|threshold|supra/i.test(s) || tss > 100) return 'hard';
    if (/tempo|sweet.?spot|\bss\b/i.test(s) || (tss > 60 && tss <= 100)) return 'medium';
    return 'light';
  }
  if (/run|jog|běh/i.test(s)) return 'running';
  if (/swim|plavání/i.test(s)) return 'swimming';
  if (/strength|gym|weight|silový/i.test(s)) return 'strength';
  if (/walk|chůze/i.test(s)) return 'walking';
  if (/hike|hiking/i.test(s)) return 'hiking';
  if (/yoga|stretch/i.test(s)) return 'yoga';
  if (/ski/i.test(s)) return 'skiing';
  return 'light';
}

function parseIcal(text) {
  const lines = unfold(text).split('\n');
  const events = [];
  let cur = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT')   { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;

    const ci = line.indexOf(':');
    if (ci === -1) continue;
    const rawKey = line.slice(0, ci).toUpperCase();
    const value  = line.slice(ci + 1);
    const si     = rawKey.indexOf(';');
    const key    = si !== -1 ? rawKey.slice(0, si) : rawKey;
    const params = si !== -1 ? rawKey.slice(si + 1) : '';
    cur[key] = { value: unescapeVal(value), params };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() + 21);

  return events
    .map(e => {
      const date = parseDate(e.DTSTART);
      if (!date) return null;
      const d = new Date(date + 'T00:00:00');
      if (d < today || d > cutoff) return null;

      const summary     = e.SUMMARY?.value     || '';
      const description = e.DESCRIPTION?.value || '';
      const categories  = e.CATEGORIES?.value  || '';

      const durationMin = parseDuration(description) || parseDuration(summary);
      const tss         = parseTSS(description) || parseTSS(summary);
      const sportType   = mapSport(categories, summary);

      return {
        date,
        title: summary,
        sportType,
        durationMin,
        tss,
        description: description.split('\n').slice(0, 6).join('\n'),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const rawUrl = req.query?.url;
  if (!rawUrl) return res.status(400).json({ error: 'Missing url parameter' });

  const url = String(rawUrl).replace(/^webcal:\/\//i, 'https://');
  try {
    const { hostname } = new URL(url);
    if (!['trainingpeaks.com', 'www.trainingpeaks.com'].includes(hostname)) {
      return res.status(400).json({ error: 'Only trainingpeaks.com URLs are supported' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'CycloFuel/1.0' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) return res.status(502).json({ error: `iCal fetch failed: ${r.status}` });

    const text   = await r.text();
    const events = parseIcal(text);
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({ events });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
