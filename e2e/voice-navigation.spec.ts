import { test, expect } from '@playwright/test';
import { parseCommand } from '../src/lib/voice/commandParser';
import { SafeActionRegistry } from '../src/lib/voice/safeActionRegistry';
import { shouldEscapeToGlobal, type NavigationEscapeScreen } from '../src/lib/voice/navigationEscape';

const rows: Array<{
  screen: NavigationEscapeScreen;
  context: string;
  language: 'en-IN' | 'hi-IN' | 'te-IN';
}> = [
  { screen: 'dashboard', context: 'dashboard', language: 'en-IN' },
  { screen: 'results', context: 'results', language: 'en-IN' },
  { screen: 'history', context: 'history', language: 'en-IN' },
  { screen: 'analysis', context: 'analysis', language: 'en-IN' },
  { screen: 'settings', context: 'settings', language: 'en-IN' },
  { screen: 'exam_lobby', context: 'exam_lobby', language: 'en-IN' },
  { screen: 'practice_setup', context: 'practice_setup', language: 'en-IN' },
  { screen: 'practice_active', context: 'practice', language: 'en-IN' },
  { screen: 'exam_active', context: 'exam_active', language: 'en-IN' },
];

test.describe('Voice navigation escape decisions', () => {
  test('lobby/setup may navigate away while active sessions are blocked', () => {
    const registry = new SafeActionRegistry();
    for (const [context, allowed] of [
      ['exam_lobby', true],
      ['exam_active', false],
      ['practice_setup', true],
      ['practice_active', false],
    ] as const) {
      const escapes = shouldEscapeToGlobal('go to dashboard', 'en-IN', context);
      expect(registry.isActionAllowed('OPEN_DASHBOARD', context)).toBe(allowed);
      expect(escapes).toBe(allowed);
    }
  });

  test('practice setup and active registries do not contradict the escape policy', () => {
    const registry = new SafeActionRegistry();
    expect(registry.isActionAllowed('OPEN_HISTORY', 'practice_setup')).toBe(true);
    expect(registry.isActionAllowed('OPEN_HISTORY', 'practice_active')).toBe(false);
    expect(registry.isActionAllowed('OPEN_SETTINGS', 'exam_lobby')).toBe(true);
    expect(registry.isActionAllowed('OPEN_SETTINGS', 'exam_active')).toBe(false);
  });
});
