-- Migration 00009: Prevent duplicate active sessions for a candidate
-- Cleanup is performed before unique indexes so the migration can be applied
-- even if earlier application bugs created duplicate in-progress sessions.

WITH ranked_exam_sessions AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY candidate_id, exam_id
    ORDER BY started_at DESC, id DESC
  ) AS rn
  FROM exam_sessions
  WHERE status = 'in_progress' AND is_practice = false
)
UPDATE exam_sessions
SET status = 'abandoned',
    completed_at = COALESCE(completed_at, NOW())
WHERE id IN (SELECT id FROM ranked_exam_sessions WHERE rn > 1);

WITH ranked_practice_sessions AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY candidate_id
    ORDER BY started_at DESC, id DESC
  ) AS rn
  FROM exam_sessions
  WHERE status = 'in_progress' AND is_practice = true
)
UPDATE exam_sessions
SET status = 'abandoned',
    completed_at = COALESCE(completed_at, NOW())
WHERE id IN (SELECT id FROM ranked_practice_sessions WHERE rn > 1);

ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_session_mode_consistency
  CHECK (
    (is_practice = true AND exam_id IS NULL) OR
    (is_practice = false AND exam_id IS NOT NULL)
  ) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_one_active_exam_per_candidate
  ON exam_sessions(candidate_id, exam_id)
  WHERE status = 'in_progress' AND is_practice = false;

CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_one_active_practice_per_candidate
  ON exam_sessions(candidate_id)
  WHERE status = 'in_progress' AND is_practice = true;
