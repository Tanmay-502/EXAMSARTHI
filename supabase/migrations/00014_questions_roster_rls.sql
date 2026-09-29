-- Migration 00014: restrict question reads to server-defined active session rosters

DROP POLICY IF EXISTS "Anyone can read questions" ON public.questions;
DROP POLICY IF EXISTS "Candidates can read own active roster questions" ON public.questions;

CREATE POLICY "Candidates can read own active roster questions"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.exam_sessions AS sessions
      WHERE sessions.candidate_id = auth.uid()
        AND sessions.status = 'in_progress'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            COALESCE(sessions.question_ids, '[]'::jsonb)
          ) AS roster(question_id)
          WHERE roster.question_id = public.questions.id::text
        )
    )
  );
