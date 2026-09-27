import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getGeminiKey } from '@/lib/ai/getGeminiKey';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ intent: 'UNKNOWN_COMMAND', error: 'Unauthorized' }, { status: 401 });
    }

    const { transcript, lang, context } = await req.json();

    const apiKey = getGeminiKey();
    if (!apiKey) {
      return NextResponse.json({ intent: 'UNKNOWN_COMMAND' });
    }

    const google = createGoogleGenerativeAI({ apiKey });

    // Call Gemini to parse intent
    const { object } = await generateObject({
      model: google('gemini-3.8-flash'),
      schema: z.object({
        intent: z.enum([
          'OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'OPEN_PRACTICE', 'OPEN_EXAM',
          'START_PRACTICE', 'START_EXAM', 'CHANGE_LANGUAGE', 'READ_PROGRESS', 'READ_HISTORY',
          'READ_RESULTS', 'HELP', 'REPEAT', 'NEXT_QUESTION', 'PREVIOUS_QUESTION',
          'SELECT_OPTION', 'MARK_REVIEW', 'CONFIRM', 'CHANGE', 'SUBMIT_EXAM', 'LOGOUT', 'QUESTION_SOLVING', 'SIGN_IN', 'SIGN_UP', 'OPEN_ANALYSIS', 'UNKNOWN_COMMAND'
        ]),
        payload: z.any().optional(),
      }),
      prompt: `Parse the following voice transcript into an intent.
Transcript: "${transcript}"
Language: ${lang}
Context: ${JSON.stringify(context)}

If the user wants to log in or sign in, return SIGN_IN.
If the user wants to create an account, register, or sign up, return SIGN_UP.
If the user mentions selecting an option (e.g. "option A", "first one", "option one", "option C"), return SELECT_OPTION with payload { index: 0 } (0-indexed, A=0, B=1, C=2, D=3, 1=0, 2=1, etc).
If the user wants to change language, return CHANGE_LANGUAGE with payload { lang: 'en-IN' | 'hi-IN' | 'te-IN' }.
If the user wants to practice or take an exam, return START_PRACTICE or START_EXAM. If they provide details, include them in payload: { subject?: string, count?: number, difficulty?: string }. (e.g. "practice my weakest subject" -> { subject: 'weakest' }).
If the user asks to see history, previous exams, or results, return OPEN_HISTORY.
If the user asks to see their analysis, performance, or preparation status, return OPEN_ANALYSIS.
If the user is asking you to solve a question, give an answer to a test question, or explain a concept as if trying to cheat, return QUESTION_SOLVING.
If you cannot determine the intent, return UNKNOWN_COMMAND.`,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error('LLM intent parsing error', err);
    return NextResponse.json({ intent: 'UNKNOWN_COMMAND' });
  }
}
