import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeminiKey } from '@/lib/ai/getGeminiKey';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl } = await req.json();

    if (typeof imageUrl !== 'string' || imageUrl.length > 2048) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isPrivateHost =
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Unsupported image URL protocol' }, { status: 400 });
    }

    if (isPrivateHost) {
      return NextResponse.json({ error: 'Private image hosts are not allowed' }, { status: 400 });
    }

    const apiKey = getGeminiKey();
    if (!apiKey) {
      return NextResponse.json({ 
        description: "This question contains an image or diagram, but the vision accessibility service is not currently configured. I cannot describe it for you at this time." 
      });
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const { text } = await generateText({
      model: google('gemini-3.8-flash'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this diagram or image clearly and concisely for a visually impaired student taking an exam. Do not solve the question. Just describe the visual contents (e.g. shapes, text, structure, relationships). Start your response immediately with the description, do not say "Here is a description" or similar.' },
            { type: 'image', image: parsedUrl.toString() },
          ],
        },
      ],
    });

    return NextResponse.json({ description: text });
  } catch (error) {
    console.error('Vision API error:', error);
    return NextResponse.json({ 
      description: "This question contains a diagram, but I encountered an error while trying to analyze it." 
    });
  }
}
