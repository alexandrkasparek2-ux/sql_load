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
});

describe('formatForTelegram', () => {
  it('renders all sections with Markdown headers', () => {
    const out = formatForTelegram({
      summary: 'OK',
      analysis: ['a1', 'a2'],
      recommendation: 'do x',
      question: 'y?',
    });
    expect(out).toContain('OK');
    expect(out).toContain('📊 *Analysis*');
    expect(out).toContain('• a1');
    expect(out).toContain('✅ *Recommendation*');
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
});
