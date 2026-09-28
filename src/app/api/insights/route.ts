import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getGeminiKey } from '@/lib/ai/getGeminiKey';
import { createClient } from '@/lib/supabase/server';
import { buildLearningProfile } from '@/app/exam/actions';
import { checkRateLimit } from '@/lib/security/rateLimit';

const insightCache = new Map<string, { sessionId: string; insight: string }>();

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rate = checkRateLimit(`insights:${user.id}`);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } });
    }

    const { data: activeSessions } = await supabase.from('exam_sessions').select('id').eq('candidate_id', user.id).eq('status', 'in_progress').limit(1);
    if (activeSessions && activeSessions.length > 0) return NextResponse.json({ error: 'Insights disabled during an active exam.' }, { status: 403 });

    const { data: profile } = await supabase.from('profiles').select('learning_profile_consent').eq('id', user.id).single();
    if (!profile?.learning_profile_consent) return NextResponse.json({ error: 'Consent not granted' }, { status: 403 });

    const { data: latestSession } = await supabase
      .from('exam_sessions')
      .select('id')
      .eq('candidate_id', user.id)
      .eq('status', 'submitted')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestSession) return NextResponse.json({ error: 'Not enough data to build profile.' }, { status: 400 });

    const cached = insightCache.get(user.id);
    if (cached?.sessionId === latestSession.id) return NextResponse.json({ insight: cached.insight, cached: true });

    const apiKey = getGeminiKey();
    if (!apiKey) return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 });

    const google = createGoogleGenerativeAI({ apiKey });
    const learningProfile = await buildLearningProfile(user.id);
    if ('error' in learningProfile) return NextResponse.json({ error: learningProfile.error }, { status: 400 });

    const prompt = `You are the EXAMSAARTHI AI study assistant.
Given this candidate's learning profile, provide 2-3 specific, actionable study recommendations in plain text (no markdown formatting). Keep it encouraging and concise (max 3 sentences total).
Do not provide exam answers. Do not invent details.

Profile context:
- Strong Subjects: ${learningProfile.strongSubjects.join(', ') || 'None yet'}
- Weak Subjects: ${learningProfile.weakSubjects.join(', ') || 'None yet'}
- Recent accuracy trend: ${learningProfile.recentAccuracy.join('%, ')}
- Total sessions completed: ${learningProfile.totalSessions} (Practice: ${learningProfile.practiceSessions}, Exam: ${learningProfile.examSessions})
`;

    const { text } = await generateText({ model: google('gemini-3.8-flash'), prompt });
    insightCache.set(user.id, { sessionId: latestSession.id, insight: text });
    return NextResponse.json({ insight: text, cached: false });
  } catch (err) {
    console.error('Insights generation error:', err);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
