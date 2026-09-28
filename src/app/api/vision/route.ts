import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getGeminiKey } from '@/lib/ai/getGeminiKey';
import { checkRateLimit } from '@/lib/security/rateLimit';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
}).strict();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rate = checkRateLimit(`vision:${user.id}`);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const { sessionId, questionId } = parsed.data;
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('id, candidate_id, status, question_ids')
      .eq('id', sessionId)
      .eq('candidate_id', user.id)
      .single();

    if (sessionError || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const roster = Array.isArray(session.question_ids)
      ? session.question_ids.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    if (!roster.includes(questionId)) {
      return NextResponse.json({ error: 'Question does not belong to this session' }, { status: 403 });
    }

    const adminClient = await createAdminClient();
    const { data: question, error: questionError } = await adminClient
      .from('questions')
      .select('image_url, image_alt_text')
      .eq('id', questionId)
      .single();

    if (questionError || !question?.image_url) {
      return NextResponse.json({ error: 'No image is available for this question' }, { status: 404 });
    }

    if (question.image_alt_text) {
      return NextResponse.json({ description: question.image_alt_text });
    }

    const apiKey = getGeminiKey();
    if (!apiKey) {
      return NextResponse.json({
        description: 'This question contains an image or diagram, but the vision accessibility service is not currently configured.',
      });
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const { text } = await generateText({
      model: google('gemini-3.8-flash'),
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this diagram or image clearly and concisely for a visually impaired student taking an exam. Do not solve the question. Just describe the visual contents (shapes, text, structure, relationships). Start immediately with the description.' },
          { type: 'image', image: question.image_url },
        ],
      }],
    });

    return NextResponse.json({ description: text });
  } catch (error) {
    console.error('Vision API error:', error);
    return NextResponse.json({
      description: 'This question contains a diagram, but I encountered an error while trying to analyze it.',
    });
  }
}
