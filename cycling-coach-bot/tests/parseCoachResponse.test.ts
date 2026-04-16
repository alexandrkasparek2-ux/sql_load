import './setup.js';
import { describe, it, expect } from 'vitest';
import { parseCoachResponse, formatForTelegram } from '../src/utils/claude.js';

describe('parseCoachResponse', () => {
  it('parses a clean JSON response', () => {
    const r = parseCoachResponse(
      JSON.stringify({
        summary: 'Recovery low.',
        analysis: ['WHOOP 42%', 'TSB -34'],
        recommendation: 'Rest today.',
        question: 'Sleep issues?',
      })
    );
    expect(r.summary).toBe('Recovery low.');
    expect(r.analysis).toEqual(['WHOOP 42%', 'TSB -34']);
    expect(r.recommendation).toBe('Rest today.');
    expect(r.question).toBe('Sleep issues?');
  });

  it('strips ```json fences', () => {
    const r = parseCoachResponse(
      '```json\n' +
        JSON.stringify({
          summary: 's',
          analysis: ['a'],
          recommendation: 'r',
        }) +
        '\n```'
    );
    expect(r.summary).toBe('s');
    expect(r.analysis).toEqual(['a']);
  });

  it('falls back to raw text when JSON is malformed', () => {
    const r = parseCoachResponse('totally not json');
    expect(r.summary).toBe('totally not json');
    expect(r.analysis).toEqual([]);
  });

  it('coerces non-string analysis entries', () => {
    const r = parseCoachResponse(
      JSON.stringify({
        summary: 's',
        analysis: [1, true],
        recommendation: 'r',
      })
    );
    expect(r.analysis).toEqual(['1', 'true']);
  });

  it('rescues a JSON response truncated mid-analysis', () => {
    // Claude ran out of max_tokens halfway through the second analysis item.
    const truncated =
      '{"summary":"Recovery low.","analysis":["WHOOP 42%","TSB -34 — overreach';
    const r = parseCoachResponse(truncated);
    expect(r.summary).toBe('Recovery low.');
    expect(r.analysis).toEqual(['WHOOP 42%']);
    expect(r.recommendation).toBe('');
  });

  it('rescues a JSON response truncated inside recommendation', () => {
    const truncated =
      '{"summary":"ok","analysis":["a1","a2"],"recommendation":"rest today';
    const r = parseCoachResponse(truncated);
    expect(r.summary).toBe('ok');
    expect(r.analysis).toEqual(['a1', 'a2']);
    // recommendation itself wasn't closed so it stays empty — better than
    // leaking the raw JSON blob at the user.
    expect(r.recommendation).toBe('');
  });
});

describe('formatForTelegram', () => {
  it('renders all sections with HTML tags', () => {
    const out = formatForTelegram({
      summary: 'OK',
      analysis: ['a1', 'a2'],
      recommendation: 'do x',
      question: 'y?',
    });
    expect(out).toContain('OK');
    expect(out).toContain('📊 <b>Analysis</b>');
    expect(out).toContain('• a1');
    expect(out).toContain('✅ <b>Recommendation</b>');
    expect(out).toContain('❓ y?');
  });

  it('omits empty sections', () => {
    const out = formatForTelegram({
      summary: 'only summary',
      analysis: [],
      recommendation: '',
    });
    expect(out.trim()).toBe('only summary');
  });

  it('escapes < > & in user-provided fields', () => {
    const out = formatForTelegram({
      summary: 'TSS <300 & HR >150',
      analysis: ['power < FTP'],
      recommendation: 'avoid > zone 4',
    });
    expect(out).toContain('TSS &lt;300 &amp; HR &gt;150');
    expect(out).toContain('• power &lt; FTP');
    expect(out).toContain('avoid &gt; zone 4');
    expect(out).not.toContain('TSS <300');
  });

  it('converts **bold** inside Claude output to <b> tags', () => {
    const out = formatForTelegram({
      summary: 'Target zones: **Z2 @ 60-75%** this week',
      analysis: ['**4h sobota** (Z2)'],
      recommendation: 'Keep **intensity low**',
    });
    expect(out).toContain('<b>Z2 @ 60-75%</b>');
    expect(out).toContain('<b>4h sobota</b>');
    expect(out).toContain('<b>intensity low</b>');
    expect(out).not.toContain('**');
  });
});
