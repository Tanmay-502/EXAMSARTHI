import { Locale } from '../i18n/registry';
import { parseCommand } from './commandParser';
import { SafeAction, SafeActionRegistry } from './safeActionRegistry';

export type NavigationEscapeScreen =
  | 'dashboard'
  | 'results'
  | 'history'
  | 'analysis'
  | 'settings'
  | 'exam_lobby'
  | 'practice_setup'
  | 'practice_active'
  | 'exam_active';

const escapeActionsByScreen: Record<NavigationEscapeScreen, ReadonlySet<SafeAction>> = {
  dashboard: new Set<SafeAction>(),
  results: new Set<SafeAction>(),
  history: new Set<SafeAction>(),
  analysis: new Set<SafeAction>(),
  settings: new Set<SafeAction>(),
  exam_lobby: new Set([
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
  practice_active: new Set<SafeAction>(),
  exam_active: new Set<SafeAction>(),
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
