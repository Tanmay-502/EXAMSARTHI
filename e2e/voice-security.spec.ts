import { test, expect } from '@playwright/test';
import { SafeActionRegistry } from '../src/lib/voice/safeActionRegistry';

test.describe('Voice Security Boundary (Phase 10)', () => {
  test('exam mode rejects unsafe intents', () => {
    const registry = new SafeActionRegistry();
    
    // Allowed actions
    expect(registry.isActionAllowed('NEXT_QUESTION', 'exam_active')).toBe(true);
    expect(registry.isActionAllowed('SELECT_OPTION', 'exam_active')).toBe(true);
    
    // Rejected actions (anti-cheating)
    expect(registry.isActionAllowed('OPEN_DASHBOARD', 'exam_active')).toBe(false);
    expect(registry.isActionAllowed('OPEN_PRACTICE', 'exam_active')).toBe(false);
    expect(registry.isActionAllowed('LOGOUT', 'exam_active')).toBe(false);
    expect(registry.isActionAllowed('READ_CONTEXT', 'exam_active')).toBe(true);
    expect(registry.isActionAllowed('REPEAT', 'exam_active')).toBe(true);
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
    expect(registry.isActionAllowed('READ_CONTEXT', 'analysis')).toBe(true);
    expect(registry.isActionAllowed('REPEAT', 'analysis')).toBe(true);
  });

  test('settings context authorizes only explicit settings mutations', () => {
    const registry = new SafeActionRegistry();
    for (const action of [
      'SET_SPEECH_RATE',
      'SET_VOICE_DEFAULT',
      'SET_VOICE_LANGUAGE',
      'SET_HIGH_CONTRAST',
      'SET_FONT_SCALE',
      'SET_LEARNING_PROFILE_CONSENT',
      'TEST_VOICE',
    ] as const) {
      expect(registry.isActionAllowed(action, 'settings')).toBe(true);
      expect(registry.isActionAllowed(action, 'dashboard')).toBe(false);
      expect(registry.isActionAllowed(action, 'exam_active')).toBe(false);
    }
  });

});