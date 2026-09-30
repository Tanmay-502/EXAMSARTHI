import { z } from 'zod'

export const naturalIntentNameSchema = z.enum([
  'OPEN_DASHBOARD', 'OPEN_HISTORY', 'OPEN_SETTINGS', 'OPEN_PRACTICE', 'OPEN_EXAM',
  'START_PRACTICE', 'START_EXAM', 'CHANGE_LANGUAGE', 'READ_PROGRESS', 'READ_HISTORY',
  'READ_RESULTS', 'READ_CONTEXT', 'HELP', 'REPEAT', 'NEXT_QUESTION', 'PREVIOUS_QUESTION',
  'SELECT_OPTION', 'MARK_REVIEW', 'CONFIRM', 'CHANGE', 'SUBMIT_EXAM', 'LOGOUT',
  'QUESTION_SOLVING', 'SIGN_IN', 'OPEN_ANALYSIS', 'UNKNOWN_COMMAND',
  'TIME_LEFT', 'JUMP_TO_QUESTION', 'REVIEW_UNANSWERED', 'REVIEW_MARKED',
  'READ_QUESTION', 'READ_OPTIONS',
  'SET_SPEECH_RATE', 'SET_VOICE_DEFAULT', 'SET_VOICE_LANGUAGE', 'SET_HIGH_CONTRAST',
  'SET_FONT_SCALE', 'SET_LEARNING_PROFILE_CONSENT', 'TEST_VOICE',
])

export const naturalIntentEnvelopeSchema = z.object({
  intent: naturalIntentNameSchema,
  payload: z.unknown().optional().nullable(),
})

const languagePayloadSchema = z.object({
  lang: z.enum(['en-IN', 'hi-IN', 'te-IN']),
}).strict()

const indexPayloadSchema = z.object({
  index: z.number().int().min(0).max(3),
}).strict()

const jumpPayloadSchema = z.object({
  index: z.number().int().min(0).max(99),
}).strict()

const practicePayloadSchema = z.object({
  subject: z.string().trim().min(1).max(100).optional(),
  count: z.number().int().min(1).max(100).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  exam_id: z.string().trim().min(1).max(100).optional(),
  exam_name: z.string().trim().min(1).max(200).optional(),
}).strict().optional().nullable()

const examPayloadSchema = z.object({
  exam_id: z.string().trim().min(1).max(100).optional(),
  exam_name: z.string().trim().min(1).max(200).optional(),
}).strict().optional().nullable()

const speechRatePayloadSchema = z.object({ rate: z.number().min(0.75).max(1.5) }).strict()
const fontScalePayloadSchema = z.object({ scale: z.number().min(1).max(1.5) }).strict()
const booleanPayloadSchema = z.object({ enabled: z.boolean() }).strict()
const voiceLanguagePayloadSchema = z.object({ lang: z.enum(['en-IN','hi-IN','te-IN']) }).strict()
const emptyPayloadSchema = z.undefined().or(z.null()).or(z.object({}).strict())

export function validateNaturalIntentPayload(intent: z.infer<typeof naturalIntentNameSchema>, payload: unknown) {
  switch (intent) {
    case 'CHANGE_LANGUAGE':
      return languagePayloadSchema.safeParse(payload)
    case 'SELECT_OPTION':
      return indexPayloadSchema.safeParse(payload)
    case 'JUMP_TO_QUESTION':
      return jumpPayloadSchema.safeParse(payload)
    case 'START_PRACTICE':
    case 'OPEN_PRACTICE':
      return practicePayloadSchema.safeParse(payload)
    case 'START_EXAM':
    case 'OPEN_EXAM':
      return examPayloadSchema.safeParse(payload)
    case 'SET_SPEECH_RATE':
      return speechRatePayloadSchema.safeParse(payload)
    case 'SET_FONT_SCALE':
      return fontScalePayloadSchema.safeParse(payload)
    case 'SET_HIGH_CONTRAST':
    case 'SET_LEARNING_PROFILE_CONSENT':
      return booleanPayloadSchema.safeParse(payload)
    case 'SET_VOICE_LANGUAGE':
      return voiceLanguagePayloadSchema.safeParse(payload)
    case 'SET_VOICE_DEFAULT':
    case 'TEST_VOICE':
      return emptyPayloadSchema.safeParse(payload)
    default:
      return emptyPayloadSchema.safeParse(payload)
  }
}