import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getGeminiKey } from '@/lib/ai/getGeminiKey';
import { checkRateLimit } from '@/lib/security/rateLimit';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ intent: 'UNKNOWN_COMMAND', error: 'Unauthorized' }, { status: 401 });

    const rate = checkRateLimit(`intent:${user.id}`);
    if (!rate.allowed) {
      return NextResponse.json({ intent: 'UNKNOWN_COMMAND', error: 'Rate limit exceeded' }, {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      });
    }

    const { transcript, lang, context } = await req.json();
    if (typeof transcript !== 'string' || transcript.length === 0 || transcript.length > 2000) {
      return NextResponse.json({ intent: 'UNKNOWN_COMMAND' }, { status: 400 });
    }
    if (!['en-IN', 'hi-IN', 'te-IN'].includes(lang)) {
      return NextResponse.json({ intent: 'UNKNOWN_COMMAND' }, { status: 400 });
    }

    const safeContext = context && typeof context === 'object'
      ? Object.fromEntries(Object.entries(context).slice(0, 12).map(([key, value]) => [
          key.slice(0, 80),
          typeof value === 'string' ? value.slice(0, 300) : value,
        ]))
      : null;

    const apiKey = getGeminiKey();
    if (!apiKey) return NextResponse.json({ intent: 'UNKNOWN_COMMAND' });

    const google = createGoogleGenerativeAI({ apiKey });
    const models = [
      process.env.EXAMSAARTHI_INTENT_MODEL || 'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ].filter((model, index, list) => list.indexOf(model) === index);
    const buildOptions = () => z.object({
      intent: z.enum([
          'OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'OPEN_PRACTICE', 'OPEN_EXAM',
          'START_PRACTICE', 'START_EXAM', 'CHANGE_LANGUAGE', 'READ_PROGRESS', 'READ_HISTORY',
          'READ_RESULTS', 'HELP', 'REPEAT', 'NEXT_QUESTION', 'PREVIOUS_QUESTION',
          'SELECT_OPTION', 'MARK_REVIEW', 'CONFIRM', 'CHANGE', 'SUBMIT_EXAM', 'LOGOUT',
          'QUESTION_SOLVING', 'SIGN_IN', 'OPEN_ANALYSIS', 'UNKNOWN_COMMAND',
          'TIME_LEFT', 'JUMP_TO_QUESTION', 'REVIEW_UNANSWERED', 'REVIEW_MARKED',
          'READ_QUESTION', 'READ_OPTIONS'
      ]),
      payload: z.unknown().optional(),
    });

    let object: z.infer<ReturnType<typeof buildOptions>> | null = null;
    for (const model of models) {
      try {
        const result = await generateObject({
          model: google(model),
          maxRetries: 0,
          schema: buildOptions(),
          prompt: `Parse the following voice transcript into an intent.
Transcript: "${transcript}"
Language: ${lang}
Context: ${JSON.stringify(safeContext)}

If the user wants to log in or sign in, return SIGN_IN.
If the user mentions selecting an option, return SELECT_OPTION with payload { index: 0-3 }.
If the user wants to change language, return CHANGE_LANGUAGE with payload { lang: 'en-IN' | 'hi-IN' | 'te-IN' }.
If the user wants to practice or take an exam, return START_PRACTICE or START_EXAM. Preserve provided names/details.
If the user asks to see history or results, return OPEN_HISTORY.
If the user asks to see analysis, return OPEN_ANALYSIS.
If the user asks to go to dashboard/home, return OPEN_DASHBOARD.
If the user asks to read/list available exams, return OPEN_EXAM.
If the user asks for an exam/practice operation, return the matching operation intent.
Never return an intent outside the enum.
If the user is asking you to solve a question, return QUESTION_SOLVING.
If you cannot determine the intent, return UNKNOWN_COMMAND.`,
        });
        object = result.object;
        break;
      } catch (error) {
        console.warn(`[VOICE_INTENT] Model ${model} unavailable; trying fallback.`, error);
      }
    }

    return NextResponse.json(object ?? { intent: 'UNKNOWN_COMMAND' });
  } catch (err) {
    console.error('LLM intent parsing error', err);
    return NextResponse.json({ intent: 'UNKNOWN_COMMAND' });
  }
}
