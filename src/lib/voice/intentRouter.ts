import { Locale } from '../i18n/registry';
import { VoiceCommand, parseCommand as deterministicParse } from './commandParser';

export type Intent = VoiceCommand | { type: 'NATURAL_INTENT', intent: string, payload?: Record<string, unknown> | null };

export interface IntentProvider {
  parse(transcript: string, lang: Locale, context?: Record<string, unknown> | null): Promise<Intent>;
}

export class DeterministicIntentProvider implements IntentProvider {
  async parse(transcript: string, lang: Locale): Promise<Intent> {
    return deterministicParse(transcript, lang);
  }
}

export class OptionalLLMIntentProvider implements IntentProvider {
  private deterministic = new DeterministicIntentProvider();

  async parse(transcript: string, lang: Locale, context?: Record<string, unknown> | null): Promise<Intent> {
    // 1. Try deterministic first for fast actions (next, back, etc)
    const cmd = await this.deterministic.parse(transcript, lang);
    if (cmd.type !== 'UNKNOWN') {
      return cmd;
    }

    // 2. Fallback to LLM if it's natural language and configured
    // Since we don't want to break if LLM is unavailable, wrap in try-catch
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, lang, context }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        if (data.intent) {
          return { type: 'NATURAL_INTENT', intent: data.intent, payload: data.payload };
        }
      }
    } catch {
      console.warn("LLM intent parsing failed, falling back to unknown");
    }

    return { type: 'UNKNOWN' };
  }
}
