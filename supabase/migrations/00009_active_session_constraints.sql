-- Migration 00009: Prevent duplicate active sessions for a candidate

ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_session_mode_consistency
  CHECK (
    (is_practice = true AND exam_id IS NULL) OR
    (is_practice = false AND exam_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_one_active_exam_per_candidate
  ON exam_sessions(candidate_id, exam_id)
  WHERE status = 'in_progress' AND is_practice = false;

CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_one_active_practice_per_candidate
  ON exam_sessions(candidate_id)
  WHERE status = 'in_progress' AND is_practice = true;
