import { Locale } from '../i18n/registry';
import { parseCommand } from './commandParser';
import { SafeAction, SafeActionRegistry } from './safeActionRegistry';

export type NavigationEscapeScreen =
  | 'dashboard'
  | 'results'
  | 'history'
  | 'analysis'
  | 'settings'
  | 'exam-selection'
  | 'practice-setup'
  | 'active-practice'
  | 'active-exam';

const escapeActionsByScreen: Record<NavigationEscapeScreen, ReadonlySet<SafeAction>> = {
  dashboard: new Set(),
  results: new Set(),
  history: new Set(),
  analysis: new Set(),
  settings: new Set(),
  'exam-selection': new Set([
    'OPEN_DASHBOARD',
    'OPEN_PRACTICE',
    'OPEN_HISTORY',
    'OPEN_SETTINGS',
    'OPEN_ANALYSIS',
    'READ_PROGRESS',
    'LOGOUT',
  ]),
  'practice-setup': new Set([
    'OPEN_DASHBOARD',
    'OPEN_EXAM',
    'OPEN_HISTORY',
    'OPEN_SETTINGS',
    'OPEN_ANALYSIS',
    'READ_PROGRESS',
    'LOGOUT',
  ]),
  'active-practice': new Set(),
  'active-exam': new Set(),
};

export function shouldEscapeToGlobal(
  transcript: string,
  lang: Locale,
  screen: NavigationEscapeScreen,
): boolean {
  const command = parseCommand(transcript, lang);
  const action = new SafeActionRegistry().getActionMapping(command.type);
  if (!action) return false;
  return escapeActionsByScreen[screen].has(action);
}
