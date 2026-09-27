-- Bind practice sessions to the exact question set shown to the candidate.
-- The client may still keep its own IndexedDB copy for resilience, but server-side
-- grading and answer writes must use this roster as the source of truth.
ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS question_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS practice_subject TEXT;
