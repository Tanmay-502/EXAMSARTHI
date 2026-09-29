import { z } from 'zod'

export const SUPPORTED_LOCALES = ['hi-IN', 'te-IN'] as const

const TranslationSchema = z.object({
  content_text: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).length(4),
}).strict()

const VerificationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('expression'),
    expression: z.string().regex(/^[0-9+\-*/().\s]+$/),
  }).strict(),
  z.object({
    kind: z.literal('fraction'),
    numerator: z.number().finite(),
    denominator: z.number().finite().refine(value => value !== 0),
  }).strict(),
  z.object({
    kind: z.literal('hcf'),
    a: z.number().finite(),
    b: z.number().finite(),
  }).strict(),
  z.object({
    kind: z.literal('quadratic_roots'),
    a: z.number().finite().refine(value => value !== 0),
    b: z.number().finite(),
    c: z.number().finite(),
    select: z.enum(['min', 'max']),
  }).strict(),

  z.object({
    kind: z.literal('sequence'),
    terms: z.array(z.number().finite()).min(2),
    rule: z.enum(['add', 'increasing_even_difference', 'next_square']),
    step: z.number().finite().optional(),
    nextDifference: z.number().finite().optional(),
  }).strict(),
  z.object({
    kind: z.literal('letter_sequence'),
    letters: z.array(z.string().regex(/^[A-Z]$/)).min(2),
    step: z.number().int().positive(),
  }).strict(),
  z.object({
    kind: z.literal('letter_shift'),
    input: z.string().regex(/^[A-Z]+$/),
    shift: z.number().int(),
  }).strict(),
  z.object({
    kind: z.literal('direction'),
    moves: z.array(z.tuple([z.enum(['N', 'S', 'E', 'W']), z.number().positive()])),
    answer: z.enum(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']),
  }).strict(),
  z.object({
    kind: z.literal('bar_chart_max'),
    values: z.array(z.number().finite()).min(1),
    expected_index: z.number().int().nonnegative(),
  }).strict(),

  z.object({
    kind: z.literal('direction_distance'),
    moves: z.array(z.tuple([z.enum(['N', 'S', 'E', 'W']), z.number().positive()])),
    distance: z.number().nonnegative(),
    direction: z.enum(['N', 'S', 'E', 'W']),
  }).strict(),
  z.object({
    kind: z.literal('weekday_offset'),
    start: z.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
    days: z.number().int().nonnegative(),
  }).strict(),
  z.object({
    kind: z.literal('clock_angle'),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }).strict(),
]).optional()

export const QuestionSchema = z.object({
  order_index: z.number().int().positive(),
  subject: z.string().trim().min(1).max(120),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  content_text: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).length(4),
  correct_answer_index: z.number().int().min(0).max(3),
  source: z.string().trim().min(1),
  exam_year: z.number().int().nullable().default(null),
  verified: z.boolean().default(false),
  translation_reviewed: z.boolean().default(false),
  explanation: z.string().trim().min(1),
  image_url: z.string().trim().min(1).nullable().default(null),
  image_alt_text: z.string().trim().min(1).nullable().default(null),
  translations: z.object({
    'hi-IN': TranslationSchema,
    'te-IN': TranslationSchema,
  }).strict(),
  verification: VerificationSchema,
}).strict()

export const ExamFileSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  duration_minutes: z.number().int().min(0),
  kind: z.enum(['exam', 'practice_bank']),
  questions: z.array(QuestionSchema).min(1),
}).strict()

export type ExamFile = z.infer<typeof ExamFileSchema>
export type ExamQuestion = z.infer<typeof QuestionSchema>

const PLACEHOLDER_PATTERN = /(?:\bdemo\b|\bplaceholder\b|\blorem\b|\bsample exam\b|\boption\s+[a-d]\b)/iu

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '')
}

function assertDistinctOptions(options: string[], label: string): void {
  if (options.length !== 4) throw new Error(`${label} must contain exactly four options`)
  const normalized = options.map(normalizeText)
  if (normalized.some(value => value.length === 0)) throw new Error(`${label} contains an empty option`)
  if (new Set(normalized).size !== 4) throw new Error(`${label} contains duplicate options`)
}

function assertNoMixedIndicScripts(value: string, label: string): void {
  const hasDevanagari = /[\u0900-\u097F]/u.test(value)
  const hasTelugu = /[\u0C00-\u0C7F]/u.test(value)
  if (hasDevanagari && hasTelugu) {
    throw new Error(`${label} mixes Devanagari and Telugu scripts`)
  }
}

export function validateExamFile(input: unknown, fileLabel: string): ExamFile {
  const parsed = ExamFileSchema.parse(input)
  const stems = new Set<string>()

  if (parsed.kind === 'exam' && parsed.duration_minutes < 30) {
    throw new Error(`${fileLabel}: timed exams must be at least 30 minutes`)
  }

  for (const question of parsed.questions) {
    assertDistinctOptions(question.options, `${fileLabel} question ${question.order_index} options`)
    if (PLACEHOLDER_PATTERN.test([
      question.content_text,
      ...question.options,
      question.translations['hi-IN'].content_text,
      ...question.translations['hi-IN'].options,
      question.translations['te-IN'].content_text,
      ...question.translations['te-IN'].options,
    ].join(' '))) {
      throw new Error(`${fileLabel} question ${question.order_index}: placeholder/demo text is not allowed`)
    }

    const stem = normalizeText(question.content_text)
    if (stems.has(stem)) {
      throw new Error(`${fileLabel}: duplicate question stem detected at order ${question.order_index}`)
    }
    stems.add(stem)

    if (question.image_url && !question.image_alt_text) {
      throw new Error(`${fileLabel} question ${question.order_index}: image_alt_text is required when image_url is set`)
    }
    if (question.correct_answer_index < 0 || question.correct_answer_index > 3) {
      throw new Error(`${fileLabel} question ${question.order_index}: answer index is out of range`)
    }

    for (const locale of SUPPORTED_LOCALES) {
      const translation = question.translations[locale]
      assertDistinctOptions(translation.options, `${fileLabel} question ${question.order_index} ${locale} options`)
      assertNoMixedIndicScripts(translation.content_text, `${fileLabel} question ${question.order_index} ${locale} stem`)
      translation.options.forEach((option, optionIndex) => {
        assertNoMixedIndicScripts(option, `${fileLabel} question ${question.order_index} ${locale} option ${optionIndex + 1}`)
      })
    }
  }

  const orderIndexes = parsed.questions.map(question => question.order_index)
  const expected = Array.from({ length: parsed.questions.length }, (_, index) => index + 1)
  if (JSON.stringify(orderIndexes) !== JSON.stringify(expected)) {
    throw new Error(`${fileLabel}: order_index values must be consecutive starting at 1`)
  }

  return parsed
}
