export type SafeAction = 
  | 'OPEN_DASHBOARD'
  | 'OPEN_HISTORY'
  | 'OPEN_SETTINGS'
  | 'OPEN_PRACTICE'
  | 'OPEN_EXAM'
  | 'START_PRACTICE'
  | 'START_EXAM'
  | 'CHANGE_LANGUAGE'
  | 'READ_PROGRESS'
  | 'READ_HISTORY'
  | 'READ_RESULTS'
  | 'HELP'
  | 'REPEAT'
  | 'NEXT_QUESTION'
  | 'PREVIOUS_QUESTION'
  | 'SELECT_OPTION'
  | 'MARK_REVIEW'
  | 'CONFIRM'
  | 'CHANGE'
  | 'SUBMIT_EXAM'
  | 'TIME_LEFT'
  | 'JUMP_TO_QUESTION'
  | 'REVIEW_UNANSWERED'
  | 'REVIEW_MARKED'
  | 'READ_QUESTION'
  | 'READ_OPTIONS'
  | 'LOGOUT';

export class SafeActionRegistry {
  private allowedActionsByContext: Record<string, SafeAction[]> = {
    landing: ['CHANGE_LANGUAGE', 'HELP'],
    dashboard: ['OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'OPEN_PRACTICE', 'OPEN_EXAM', 'START_PRACTICE', 'START_EXAM', 'CHANGE_LANGUAGE', 'HELP', 'LOGOUT', 'READ_PROGRESS'],
    exam: ['NEXT_QUESTION', 'PREVIOUS_QUESTION', 'SELECT_OPTION', 'MARK_REVIEW', 'CONFIRM', 'CHANGE', 'SUBMIT_EXAM', 'HELP', 'REPEAT', 'TIME_LEFT', 'JUMP_TO_QUESTION', 'REVIEW_UNANSWERED', 'REVIEW_MARKED', 'READ_QUESTION', 'READ_OPTIONS'],
    results: ['OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_PRACTICE', 'READ_RESULTS', 'HELP'],
    history: ['OPEN_DASHBOARD', 'READ_HISTORY', 'HELP'],
  };

  public isActionAllowed(action: SafeAction, context: string): boolean {
    // For 'exam', we strictly limit actions to prevent cheating
    const allowed = this.allowedActionsByContext[context] || [];
    return allowed.includes(action);
  }

  public getActionMapping(commandType: string): SafeAction | null {
    const map: Record<string, SafeAction> = {
      'NEXT': 'NEXT_QUESTION',
      'BACK': 'PREVIOUS_QUESTION',
      'REPEAT': 'REPEAT',
      'MARK_REVIEW': 'MARK_REVIEW',
      'SUBMIT': 'SUBMIT_EXAM',
      'HELP': 'HELP',
      'CONFIRM': 'CONFIRM',
      'CHANGE': 'CHANGE',
      'START': 'START_EXAM',
      'SELECT_OPTION': 'SELECT_OPTION',
      'SETTINGS': 'OPEN_SETTINGS',
      'HISTORY': 'OPEN_HISTORY',
      'LOGOUT': 'LOGOUT',
      'DASHBOARD_EXAM': 'OPEN_EXAM',
      'DASHBOARD_PRACTICE': 'OPEN_PRACTICE',
      'SET_LANGUAGE_ENGLISH': 'CHANGE_LANGUAGE',
      'SET_LANGUAGE_HINDI': 'CHANGE_LANGUAGE',
      'SET_LANGUAGE_TELUGU': 'CHANGE_LANGUAGE',
      'TIME_LEFT': 'TIME_LEFT',
      'JUMP_TO_QUESTION': 'JUMP_TO_QUESTION',
      'REVIEW_UNANSWERED': 'REVIEW_UNANSWERED',
      'REVIEW_MARKED': 'REVIEW_MARKED',
      'READ_QUESTION': 'READ_QUESTION',
      'READ_OPTIONS': 'READ_OPTIONS',
      'REMOVE_REVIEW': 'MARK_REVIEW', // toggle
    };
    return map[commandType] || null;
  }
}
