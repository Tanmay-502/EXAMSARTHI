import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Schema for Official Exam
const TranslationSchema = z.object({
  content_text: z.string(),
  options: z.array(z.string()).length(4),
});

const QuestionSchema = z.object({
  order_index: z.number().int(),
  subject: z.string().default('General'),
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
    console.error("Usage: npx ts-node scripts/ingest_exam.ts <path-to-exam-json>");
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Reading exam data from ${absolutePath}...`);
  const rawData = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));

  console.log("Validating exam format...");
  const validationResult = ExamSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error("Validation failed:", JSON.stringify(validationResult.error.issues, null, 2));
    process.exit(1);
  }

  const examData = validationResult.data;
  console.log(`Validation successful for exam: ${examData.title}`);

  // 1. Insert Exam
  console.log("Inserting exam...");
  const { data: examInsert, error: examError } = await supabase
    .from('exams')
    .insert({
      title: examData.title,
      description: examData.description,
      duration_minutes: examData.duration_minutes
    })
    .select('id')
    .single();

  if (examError) {
    console.error("Failed to insert exam:", examError);
    process.exit(1);
  }

  const examId = examInsert.id;
  console.log(`Exam inserted with ID: ${examId}`);

  // 2. Insert Questions & Answers
  console.log(`Inserting ${examData.questions.length} questions...`);
  for (const q of examData.questions) {
    // Insert into questions
    const { data: qInsert, error: qError } = await supabase
      .from('questions')
      .insert({
        exam_id: examId,
        order_index: q.order_index,
        subject: q.subject,
        content_text: q.content_text,
        options: JSON.stringify(q.options),
        content_translations: {}, // simplified for now
        options_translations: {}
      })
      .select('id')
      .single();

    if (qError) {
      console.error(`Failed to insert question ${q.order_index}:`, qError);
      process.exit(1);
    }

    const questionId = qInsert.id;

    // Insert into question_answers
    const { error: qaError } = await supabase
      .from('question_answers')
      .insert({
        question_id: questionId,
        correct_answer_index: q.correct_answer_index
      });

    if (qaError) {
      console.error(`Failed to insert answer for question ${q.order_index}:`, qaError);
      process.exit(1);
    }
  }

  console.log("✅ Ingestion complete!");
}

main().catch(console.error);
