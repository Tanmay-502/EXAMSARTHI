-- Migration 00010: Persist the selected practice question set on the session

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS question_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_session_question_ids_array
  CHECK (jsonb_typeof(question_ids) = 'array');

-- Any practice session already in progress predates server-bound question sets.
-- Abandon it so it cannot be graded without a trustworthy question set.
UPDATE exam_sessions
SET
  status = 'abandoned',
  completed_at = COALESCE(completed_at, NOW())
WHERE is_practice = true AND status = 'in_progress';
