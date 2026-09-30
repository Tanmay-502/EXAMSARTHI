-- Migration 00013: content metadata and practice-bank classification

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'exam';

ALTER TABLE public.exams
  DROP CONSTRAINT IF EXISTS exams_kind_check;

ALTER TABLE public.exams
  ADD CONSTRAINT exams_kind_check
  CHECK (kind IN ('exam', 'practice_bank'));

CREATE INDEX IF NOT EXISTS exams_kind_idx
  ON public.exams(kind);

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ExamSaarthi original';

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS exam_year INTEGER;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS translation_reviewed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.question_answers
  ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Practice subject discovery must never surface timed-exam-only subjects.
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
