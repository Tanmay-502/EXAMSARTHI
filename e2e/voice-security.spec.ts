import { test, expect } from '@playwright/test';
import { SafeActionRegistry } from '../src/lib/voice/safeActionRegistry';

test.describe('Voice Security Boundary (Phase 10)', () => {
  test('exam mode rejects unsafe intents', () => {
    const registry = new SafeActionRegistry();
    
    // Allowed actions
    expect(registry.isActionAllowed('NEXT_QUESTION', 'exam')).toBe(true);
    expect(registry.isActionAllowed('SELECT_OPTION', 'exam')).toBe(true);
    
    // Rejected actions (anti-cheating)
    expect(registry.isActionAllowed('OPEN_DASHBOARD', 'exam')).toBe(false);
    expect(registry.isActionAllowed('OPEN_PRACTICE', 'exam')).toBe(false);
    expect(registry.isActionAllowed('LOGOUT', 'exam')).toBe(false);
  });

  test('dashboard mode allows open exam', () => {
    const registry = new SafeActionRegistry();
    
    expect(registry.isActionAllowed('OPEN_EXAM', 'dashboard')).toBe(true);
    expect(registry.isActionAllowed('NEXT_QUESTION', 'dashboard')).toBe(false);
  });

  test('study screens allow practice navigation', () => {
    const registry = new SafeActionRegistry();

    expect(registry.isActionAllowed('OPEN_PRACTICE', 'analysis')).toBe(true);
    expect(registry.isActionAllowed('START_PRACTICE', 'analysis')).toBe(true);
    expect(registry.isActionAllowed('OPEN_PRACTICE', 'history')).toBe(true);
    expect(registry.isActionAllowed('START_PRACTICE', 'history')).toBe(true);
    expect(registry.isActionAllowed('OPEN_ANALYSIS', 'analysis')).toBe(true);
  });

});
