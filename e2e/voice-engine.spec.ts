import { test, expect } from '@playwright/test';
import { parseCommand } from '../src/lib/voice/commandParser';

test.describe('Voice Command Parser', () => {
  test('parses english commands correctly', () => {
    expect(parseCommand('next', 'en-IN').type).toBe('NEXT');
    expect(parseCommand('go to question 5', 'en-IN')).toEqual({ type: 'JUMP_TO_QUESTION', index: 4 });
    expect(parseCommand('option a', 'en-IN')).toEqual({ type: 'SELECT_OPTION', index: 0 });
    expect(parseCommand('option 2', 'en-IN')).toEqual({ type: 'SELECT_OPTION', index: 1 });
  });

  test('parses hindi commands correctly', () => {
    // Tests Hindi punctuation stripping
    expect(parseCommand('अगला।', 'hi-IN').type).toBe('NEXT');
    expect(parseCommand('ऑप्शन a', 'hi-IN')).toEqual({ type: 'SELECT_OPTION', index: 0 });
    expect(parseCommand('ऑप्शन 2', 'hi-IN')).toEqual({ type: 'SELECT_OPTION', index: 1 });
    expect(parseCommand('विकल्प एक', 'hi-IN')).toEqual({ type: 'SELECT_OPTION', index: 0 });
    expect(parseCommand('शुरू करें', 'hi-IN').type).toBe('START');
    expect(parseCommand('परीक्षा शुरू करें', 'hi-IN').type).toBe('DASHBOARD_EXAM');
  });

  test('parses telugu commands correctly', () => {
    expect(parseCommand('తదుపరి', 'te-IN').type).toBe('NEXT');
    expect(parseCommand('ఆప్షన్ 1', 'te-IN')).toEqual({ type: 'SELECT_OPTION', index: 0 });
  });

  test('practice words take precedence over the generic exam/test catch-alls', () => {
    expect(parseCommand('open practice exam', 'en-IN').type).toBe('DASHBOARD_PRACTICE');
    expect(parseCommand('practice test', 'en-IN').type).toBe('DASHBOARD_PRACTICE');
    expect(parseCommand('अभ्यास परीक्षा', 'hi-IN').type).toBe('DASHBOARD_PRACTICE');
    expect(parseCommand('प्रैक्टिस टेस्ट', 'hi-IN').type).toBe('DASHBOARD_PRACTICE');
    expect(parseCommand('ప్రాక్టీస్ పరీక్ష', 'te-IN').type).toBe('DASHBOARD_PRACTICE');
    expect(parseCommand('సాధన పరీక్ష', 'te-IN').type).toBe('DASHBOARD_PRACTICE');
    expect(parseCommand('exam', 'en-IN').type).toBe('DASHBOARD_EXAM');
  });

  test('handles unknown commands gracefully', () => {
    expect(parseCommand('random text', 'en-IN').type).toBe('UNKNOWN');
    expect(parseCommand('ऑप्शन 5', 'hi-IN').type).toBe('UNKNOWN'); // invalid index
  });
});
