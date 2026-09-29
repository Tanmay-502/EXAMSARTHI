import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { validateExamFile } from './examDataSchema'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_EXAM_ID = 'e2f9d6c3-1b8a-4c5e-8d2a-1b4e9f3c7a8b'
const DEMO_BANK_TITLES = ['Demo Practice Bank', 'General Knowledge & Reasoning Demo']
const DEMO_BANK_PATH = path.resolve(process.cwd(), 'data/demo_practice_bank.json')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    replace: args.includes('--replace'),
    purgeDemo: args.includes('--purge-demo'),
    filePath: args.find(arg => !arg.startsWith('--')) || null,
  }
}

async function purgeDemoData() {
  let demoStems: string[] = []

  if (fs.existsSync(DEMO_BANK_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DEMO_BANK_PATH, 'utf8'))
      const candidateQuestions = Array.isArray(raw?.questions) ? raw.questions : []
      demoStems = candidateQuestions
        .map((question: { content_text?: unknown }) => question?.content_text)
        .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    } catch (error) {
      console.warn('Could not parse legacy demo_practice_bank.json; continuing with demo exam ID purge.', error)
    }
  }

  if (demoStems.length > 0) {
    const { error: questionDeleteError } = await supabase
      .from('questions')
      .delete()
      .in('content_text', demoStems)

    if (questionDeleteError) {
      throw new Error(`Failed to delete legacy demo-bank questions: ${questionDeleteError.message}`)
    }
  }

  const titleFilter = DEMO_BANK_TITLES.map(title => `"${title}"`).join(',')
  const { error: examDeleteError } = await supabase
    .from('exams')
    .delete()
    .or(`id.eq.${DEMO_EXAM_ID},title.in.(${titleFilter})`)

  if (examDeleteError) {
    throw new Error(`Failed to delete legacy demo exams: ${examDeleteError.message}`)
  }

  console.log(`Purged legacy demo exam ${DEMO_EXAM_ID}, demo-bank titles, and ${demoStems.length} demo-bank stems.`)
}

async function ingestFile(filePath: string, replace: boolean) {
  const absolutePath = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(absolutePath)) throw new Error(`File not found: ${absolutePath}`)

  const raw = JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
  const examData = validateExamFile(raw, filePath)

  const { data: existingExam, error: existingExamError } = await supabase
    .from('exams')
    .select('id, kind')
    .eq('title', examData.title)
    .maybeSingle()

  if (existingExamError) throw new Error(`Failed to check existing exam: ${existingExamError.message}`)

  if (existingExam && !replace) {
    console.log(`Exam "${examData.title}" already exists (${existingExam.id}); skipping. Use --replace to replace it.`)
    return
  }

  if (existingExam && replace) {
    const { count: sessionCount, error: sessionCountError } = await supabase
      .from('exam_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', existingExam.id)

    if (sessionCountError) throw new Error(`Failed to check existing exam sessions: ${sessionCountError.message}`)
    if ((sessionCount || 0) > 0) {
      throw new Error(`Refusing --replace for "${examData.title}" because ${sessionCount} exam session(s) reference it. Use a new title instead of destroying historical session/question relationships.`)
    }

    if (existingExam.kind === 'practice_bank') {
      const { data: existingQuestions, error: existingQuestionsError } = await supabase
        .from('questions')
        .select('id')
        .eq('exam_id', existingExam.id)

      if (existingQuestionsError) {
        throw new Error(`Failed to inspect practice-bank question references: ${existingQuestionsError.message}`)
      }

      const questionIds = new Set((existingQuestions || []).map(question => question.id))
      if (questionIds.size > 0) {
        const { data: practiceSessions, error: practiceSessionsError } = await supabase
          .from('exam_sessions')
          .select('id, question_ids')
          .eq('is_practice', true)

        if (practiceSessionsError) {
          throw new Error(`Failed to inspect practice-session rosters: ${practiceSessionsError.message}`)
        }

        const referenced = (practiceSessions || []).some(session =>
          Array.isArray(session.question_ids) &&
          session.question_ids.some((questionId: unknown) =>
            typeof questionId === 'string' && questionIds.has(questionId)
          )
        )

        if (referenced) {
          throw new Error(`Refusing --replace for "${examData.title}" because a practice session references its question roster.`)
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('exams')
      .delete()
      .eq('id', existingExam.id)

    if (deleteError) throw new Error(`Failed to remove existing exam before replacement: ${deleteError.message}`)
  }

  let examId: string | null = null

  try {
    const { data: examInsert, error: examError } = await supabase
      .from('exams')
      .insert({
        title: examData.title,
        description: examData.description,
        duration_minutes: examData.duration_minutes,
        kind: examData.kind,
      })
      .select('id')
      .single()

    if (examError || !examInsert) throw examError || new Error('Failed to insert exam')
    examId = examInsert.id

    const questionRows = examData.questions.map(question => ({
      exam_id: examId,
      order_index: question.order_index,
      subject: question.subject,
      difficulty: question.difficulty,
      content_text: question.content_text,
      options: question.options,
      source: question.source,
      exam_year: question.exam_year,
      verified: question.verified,
      translation_reviewed: question.translation_reviewed,
      content_translations: {
        'hi-IN': question.translations['hi-IN'].content_text,
        'te-IN': question.translations['te-IN'].content_text,
      },
      options_translations: {
        'hi-IN': question.translations['hi-IN'].options,
        'te-IN': question.translations['te-IN'].options,
      },
      image_url: question.image_url,
      image_alt_text: question.image_alt_text,
    }))

    const { data: insertedQuestions, error: questionError } = await supabase
      .from('questions')
      .insert(questionRows)
      .select('id, order_index')

    if (questionError || !insertedQuestions) throw questionError || new Error('Failed to insert questions')

    const idsByOrder = new Map(insertedQuestions.map(row => [row.order_index, row.id]))
    const answerRows = examData.questions.map(question => {
      const questionId = idsByOrder.get(question.order_index)
      if (!questionId) throw new Error(`Missing inserted question for order ${question.order_index}`)
      return {
        question_id: questionId,
        correct_answer_index: question.correct_answer_index,
        explanation: question.explanation,
      }
    })

    const { error: answerError } = await supabase.from('question_answers').insert(answerRows)
    if (answerError) throw new Error(`Failed to insert answer keys: ${answerError.message}`)

    console.log(`✅ Ingested "${examData.title}" with ${examData.questions.length} questions as ${examData.kind}.`)
  } catch (error) {
    console.error('Ingestion failed:', error)
    if (examId) {
      const { error: rollbackError } = await supabase.from('exams').delete().eq('id', examId)
      if (rollbackError) console.error('Rollback failed:', rollbackError)
      else console.log(`Rolled back exam ${examId}.`)
    }
    throw error
  }
}

async function main() {
  const args = parseArgs()

  if (args.purgeDemo) await purgeDemoData()

  if (args.filePath) {
    await ingestFile(args.filePath, args.replace)
  } else if (!args.purgeDemo) {
    console.error('Usage: npm run ingest -- [--replace] <path-to-exam-json> | npm run ingest -- --purge-demo')
    process.exit(1)
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
