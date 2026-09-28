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
  { screen: 'exam-selection', context: 'exam-selection', language: 'en-IN' },
  { screen: 'practice-setup', context: 'practice', language: 'en-IN' },
  { screen: 'active-practice', context: 'practice', language: 'en-IN' },
  { screen: 'active-exam', context: 'exam', language: 'en-IN' },
];

test.describe('Voice navigation escape decisions', () => {
  test('maps "open practice exam" consistently across screens', () => {
    const registry = new SafeActionRegistry();
    const command = parseCommand('open practice exam', 'en-IN');

    expect(command.type).toBe('DASHBOARD_PRACTICE');
    const action = registry.getActionMapping(command.type);
    expect(action).toBe('OPEN_PRACTICE');

    const results = rows.map((row) => ({
      screen: row.screen,
      allowed: registry.isActionAllowed(action!, row.context),
      escapes: shouldEscapeToGlobal('open practice exam', row.language, row.screen),
    }));

    expect(results).toEqual([
      { screen: 'dashboard', allowed: true, escapes: false },
      { screen: 'results', allowed: true, escapes: false },
      { screen: 'history', allowed: true, escapes: false },
      { screen: 'analysis', allowed: true, escapes: false },
      { screen: 'settings', allowed: true, escapes: false },
      { screen: 'exam-selection', allowed: true, escapes: true },
      { screen: 'practice-setup', allowed: true, escapes: false },
      { screen: 'active-practice', allowed: true, escapes: false },
      { screen: 'active-exam', allowed: false, escapes: false },
    ]);
  });
});
