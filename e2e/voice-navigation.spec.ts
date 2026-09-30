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
  { screen: 'practice_active', context: 'practice_active', language: 'en-IN' },
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

    expect(registry.isActionAllowed('OPEN_EXAM', 'exam_active')).toBe(false);
    expect(registry.isActionAllowed('OPEN_PRACTICE', 'exam_active')).toBe(false);
    expect(registry.isActionAllowed('START_PRACTICE', 'exam_active')).toBe(false);
    // START_EXAM is intentionally allowed in an active exam: ExamEngine consumes it locally
    // and does not navigate, while active practice must not be able to enter/restart an exam.
    expect(registry.isActionAllowed('START_EXAM', 'exam_active')).toBe(true);

    for (const action of ['OPEN_EXAM', 'START_EXAM', 'OPEN_PRACTICE', 'START_PRACTICE'] as const) {
      expect(registry.isActionAllowed(action, 'practice_active')).toBe(false);
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
