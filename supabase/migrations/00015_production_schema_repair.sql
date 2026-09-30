-- Migration 00015: idempotent production schema repair
-- Repairs the schema used by the current production application without
-- rewriting or weakening existing exam/security data.

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'exam';

UPDATE public.exams
SET kind = 'exam'
WHERE kind IS NULL;

ALTER TABLE public.exams
  ALTER COLUMN kind SET NOT NULL;

ALTER TABLE public.exams
  DROP CONSTRAINT IF EXISTS exams_kind_check;

ALTER TABLE public.exams
  ADD CONSTRAINT exams_kind_check
  CHECK (kind IN ('exam', 'practice_bank'));

CREATE INDEX IF NOT EXISTS exams_kind_idx
  ON public.exams(kind);

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS content_translations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS options_translations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_alt_text TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ExamSaarthi original',
  ADD COLUMN IF NOT EXISTS exam_year INTEGER,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS translation_reviewed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_difficulty_check;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_difficulty_check
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS is_practice BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS practice_subject TEXT,
  ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempted_questions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_questions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incorrect_questions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unanswered_questions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentage NUMERIC(5, 2) DEFAULT 0.00;

ALTER TABLE public.exam_sessions
  ALTER COLUMN is_practice SET NOT NULL;

ALTER TABLE public.question_answers
  ADD COLUMN IF NOT EXISTS explanation TEXT;

CREATE INDEX IF NOT EXISTS exam_sessions_practice_active_idx
  ON public.exam_sessions(candidate_id)
  WHERE status = 'in_progress' AND is_practice = true;

CREATE INDEX IF NOT EXISTS exam_sessions_exam_active_idx
  ON public.exam_sessions(candidate_id, exam_id)
  WHERE status = 'in_progress' AND is_practice = false;

CREATE OR REPLACE FUNCTION public.practice_subjects()
RETURNS TABLE(subject text)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT q.subject
  FROM public.questions AS q
  JOIN public.exams AS e ON e.id = q.exam_id
  WHERE e.kind = 'practice_bank'
    AND q.subject IS NOT NULL
    AND btrim(q.subject) <> ''
  ORDER BY q.subject;
$$;

REVOKE ALL ON FUNCTION public.practice_subjects() FROM public;
GRANT EXECUTE ON FUNCTION public.practice_subjects() TO authenticated;
