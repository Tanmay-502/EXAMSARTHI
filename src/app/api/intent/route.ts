import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { transcript, lang, context } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ intent: 'UNKNOWN' });
    }

    // Call Gemini to parse intent
    const { object } = await generateObject({
      model: google('models/gemini-1.5-pro'),
      schema: z.object({
        intent: z.enum([
          'OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'OPEN_PRACTICE', 'OPEN_EXAM',
          'START_PRACTICE', 'START_EXAM', 'CHANGE_LANGUAGE', 'READ_PROGRESS', 'READ_HISTORY',
          'READ_RESULTS', 'HELP', 'REPEAT', 'NEXT_QUESTION', 'PREVIOUS_QUESTION',
          'SELECT_OPTION', 'MARK_REVIEW', 'CONFIRM', 'CHANGE', 'SUBMIT_EXAM', 'LOGOUT', 'QUESTION_SOLVING', 'UNKNOWN'
        ]),
        payload: z.any().optional(),
      }),
      prompt: `Parse the following voice transcript into an intent.
Transcript: "${transcript}"
Language: ${lang}
Context: ${context}

If the user mentions selecting an option (e.g. "option A", "first one", "option one", "option C"), return SELECT_OPTION with payload { index: 0 } (0-indexed, A=0, B=1, C=2, D=3, 1=0, 2=1, etc).
If the user wants to change language, return CHANGE_LANGUAGE with payload { lang: 'en-IN' | 'hi-IN' | 'te-IN' }.
If the user wants to practice or take an exam, return START_PRACTICE or START_EXAM. If they provide details, include them in payload: { subject?: string, count?: number, difficulty?: string }.
If the user is asking you to solve a question, give an answer to a test question, or explain a concept as if trying to cheat, return QUESTION_SOLVING.
If you cannot determine the intent, return UNKNOWN.`,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error('LLM intent parsing error', err);
    return NextResponse.json({ intent: 'UNKNOWN' });
  }
}
