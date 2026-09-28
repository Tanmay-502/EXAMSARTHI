import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TranslationSchema = z.object({
  content_text: z.string(),
  options: z.array(z.string()).length(4),
});

const QuestionSchema = z.object({
  order_index: z.number().int(),
  subject: z.string().default('General'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  content_text: z.string(),
  options: z.array(z.string()).length(4),
  correct_answer_index: z.number().int().min(0).max(3),
  translations: z.record(z.string(), TranslationSchema).optional().default({}),
});

const ExamSchema = z.object({
  title: z.string(),
  description: z.string(),
  duration_minutes: z.number().int().positive(),
  questions: z.array(QuestionSchema).min(1),
});

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run ingest -- <path-to-exam-json>");
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const validationResult = ExamSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error("Validation failed:", JSON.stringify(validationResult.error.issues, null, 2));
    process.exit(1);
  }

  const examData = validationResult.data;
  const { data: existingExam, error: existingExamError } = await supabase
    .from('exams')
    .select('id')
    .eq('title', examData.title)
    .maybeSingle();

  if (existingExamError) {
    console.error("Failed to check existing exam:", existingExamError);
    process.exit(1);
  }

  if (existingExam) {
    console.log(`Exam already exists (${existingExam.id}); skipping ingestion.`);
    return;
  }

  let examId: string | null = null;
  try {
    const { data: examInsert, error: examError } = await supabase
      .from('exams')
      .insert({
        title: examData.title,
        description: examData.description,
        duration_minutes: examData.duration_minutes
      })
      .select('id')
      .single();

    if (examError || !examInsert) throw examError || new Error('Failed to insert exam');
    examId = examInsert.id;

    for (const q of examData.questions) {
      const contentTranslations = Object.fromEntries(
        Object.entries(q.translations).map(([locale, translation]) => [locale, translation.content_text])
      );
      const optionsTranslations = Object.fromEntries(
        Object.entries(q.translations).map(([locale, translation]) => [locale, translation.options])
      );

      const { data: qInsert, error: qError } = await supabase
        .from('questions')
        .insert({
          exam_id: examId,
          order_index: q.order_index,
          subject: q.subject,
          difficulty: q.difficulty,
          content_text: q.content_text,
          options: q.options,
          content_translations: contentTranslations,
          options_translations: optionsTranslations
        })
        .select('id')
        .single();

      if (qError || !qInsert) throw qError || new Error(`Failed to insert question ${q.order_index}`);

      const { error: qaError } = await supabase
        .from('question_answers')
        .insert({
          question_id: qInsert.id,
          correct_answer_index: q.correct_answer_index
        });

      if (qaError) throw qaError;
    }

    console.log("✅ Ingestion complete!");
  } catch (error) {
    console.error("Ingestion failed:", error);
    if (examId) {
      const { error: rollbackError } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);
      if (rollbackError) console.error('Rollback failed:', rollbackError);
      else console.log(`Rolled back exam ${examId}.`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
