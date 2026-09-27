-- Migration 00010: Persist the selected practice question set on the session

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS question_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_session_question_ids_array
  CHECK (jsonb_typeof(question_ids) = 'array');
