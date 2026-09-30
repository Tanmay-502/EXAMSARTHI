import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/security/rateLimit'
import { getGeminiKey } from '@/lib/ai/getGeminiKey'

const MAX_AUDIO_BYTES = 1_500_000

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/opus',
])

const TRANSCRIPTION_VOCABULARY = [
  'ExamSaarthi',
  'dashboard',
  'practice',
  'exam',
  'history',
  'analysis',
  'settings',
  'results',
  'question',
  'option',
  'review',
  'submit',
  'next',
  'back',
  'Hindi',
  'Telugu',
  'English',
  'DBMS',
  'mathematics',
  'reasoning',
  'science',
  'general knowledge',
  'computer science',
  'history and polity',
  'quantitative aptitude',
]

const LOCALES = new Set(['en-IN', 'hi-IN', 'te-IN'])

function getClientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}

function normalizeMimeType(value: string) {
  return value.split(';', 1)[0].trim().toLowerCase()
}

export async function POST(request: Request) {
  const apiKey = getGeminiKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'Voice transcription is not configured.' }, { status: 503 })
  }

  const clientKey = getClientKey(request)
  const rate = checkRateLimit(`voice-transcribe:${clientKey}`, 6, 60_000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many voice transcription requests.', retryAfterSeconds: rate.retryAfterSeconds },
      { status: 429 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid audio request.' }, { status: 400 })
  }

  const audio = formData.get('audio')
  const requestedLang = formData.get('lang')
  const mimeType = audio instanceof File ? normalizeMimeType(audio.type || 'audio/webm') : ''

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Audio is required.' }, { status: 400 })
  }

  if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
    return NextResponse.json({ error: 'Unsupported audio format.' }, { status: 415 })
  }

  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio is too large or empty.' }, { status: 413 })
  }

  const lang = typeof requestedLang === 'string' && LOCALES.has(requestedLang)
    ? requestedLang
    : 'en-IN'

  const base64Audio = Buffer.from(await audio.arrayBuffer()).toString('base64')

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
        generationConfig: {
          audioTranscriptionConfig: {
            languageCodes: [lang],
            customVocabulary: TRANSCRIPTION_VOCABULARY,
            mode: 'SMART',
          },
        },
      }),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[VOICE_TRANSCRIBE] Gemini request failed:', response.status, detail.slice(0, 500))
    return NextResponse.json({ error: 'Voice transcription failed.' }, { status: 502 })
  }

  const payload = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: unknown }>
      }
    }>
  }

  const transcript = payload.candidates?.[0]?.content?.parts
    ?.map((part) => typeof part.text === 'string' ? part.text : '')
    .join(' ')
    .trim()
    .slice(0, 500) ?? ''

  if (!transcript) {
    return NextResponse.json({ error: 'No speech was detected.' }, { status: 422 })
  }

  return NextResponse.json({ transcript })
}
