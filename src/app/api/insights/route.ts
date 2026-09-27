import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getGeminiKey } from '@/lib/ai/getGeminiKey';
import { createClient } from '@/lib/supabase/server';
import { buildLearningProfile } from '@/app/exam/actions';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Security check: Refuse if there is an active exam.
    const { data: activeSessions } = await supabase
      .from('exam_sessions')
      .select('id')
      .eq('candidate_id', user.id)
      .eq('status', 'in_progress')
      .limit(1);

    if (activeSessions && activeSessions.length > 0) {
      return NextResponse.json({ error: 'Insights disabled during an active exam.' }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('learning_profile_consent')
      .eq('id', user.id)
      .single();

    if (!profile?.learning_profile_consent) {
      return NextResponse.json({ error: 'Consent not granted' }, { status: 403 });
    }

    const apiKey = getGeminiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const profile = await buildLearningProfile(user.id);

    if ('error' in profile) {
      return NextResponse.json({ error: profile.error }, { status: 400 });
    }

    const prompt = `You are the EXAMSAARTHI AI study assistant.
Given this candidate's learning profile, provide 2-3 specific, actionable study recommendations in plain text (no markdown formatting). Keep it encouraging and concise (max 3 sentences total).
Do not provide exam answers. Do not invent details.

Profile context:
- Strong Subjects: ${profile.strongSubjects.join(', ') || 'None yet'}
- Weak Subjects: ${profile.weakSubjects.join(', ') || 'None yet'}
- Recent accuracy trend: ${profile.recentAccuracy.join('%, ')}
- Total sessions completed: ${profile.totalSessions} (Practice: ${profile.practiceSessions}, Exam: ${profile.examSessions})
`;

    const { text } = await generateText({
      model: google('gemini-3.8-flash'),
      prompt,
    });

    return NextResponse.json({ insight: text });
  } catch (err) {
    console.error('Insights generation error:', err);
    const error = err as Error;
    if (error.message && error.message.includes('Consent not granted')) {
      return NextResponse.json({ error: 'Consent not granted' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
